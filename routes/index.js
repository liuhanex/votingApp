// Connect to MongoDB using mongoose
var mongoose = require('mongoose');
var db;

if (process.env.VCAP_SERVICES) {

	var env = JSON.parse(process.env.VCAP_SERVICES);
	db = mongoose.createConnection(env['mongodb-2.2'][0].credentials.url);

} else {

	db = mongoose.createConnection('localhost', 'pollsapp');
}

// Get poll schema and model
var PollSchema = require('../models/Poll.js').PollSchema;
var Poll = db.model('polls', PollSchema);

// Require file system module for data exporting
var fs = require('fs');

/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

// Main app view
exports.index = function(req, res, next) {
	res.render('index', { title: 'Opinion Matters' });
};

// JSON API for list of polls
exports.list = function(req, res, next) {
	// Query MongoDB for polls, just get back the question text
	Poll.find({}, {'category': 1, 'question': 1}, function(error, polls) {

		res.json(polls);
	});
};

// JSON API for getting a single poll
exports.poll = function(req, res, next) {
	// Poll ID comes in the URL
	var pollId = req.params.id;

	// Find the poll by its ID, use lean as we won't be changing it
	Poll.findById(pollId, '', {lean: true}, function(error, poll) {

		if (poll) {

			var userVoted = false,
				userChoice,
				totalVotes = 0,
				hasOption = false,
				originalView = false,
				optionalView = false;

			// Loop through poll choices to determine if user has voted
			// on this poll, and if so, what they selected
			for (c in poll.choices) {
				var choice = poll.choices[c];

				for (v in choice.votes) {
					var vote = choice.votes[v];
					totalVotes++;

					if (vote.ip === (req.ip || req.header('x-forwarded-for'))) {
						userVoted = true;
						userChoice = {_id: choice._id, text: choice.text};
						originalView = true;
					}
				}
			}

			// Attach info about user's past voting on this poll
			poll.userVoted = userVoted;
			poll.userChoice = userChoice;
			poll.totalVotes = totalVotes;
			poll.originalView = originalView;
			poll.optionalView = optionalView;

			if (poll.options.length) {
				poll.hasOption = true;				
			}

			res.json(poll);

		} else {

			res.json({error: true});
		}
	});
};

// JSON API for getting a single poll with specified options
exports.pollAdv = function(req, res, next) {
	// Get params from URL
	var pollId = req.params.id,
		optionId = req.params.optionId;

	// Find the poll by its ID, use lean as we won't be changing it
	Poll.findById(pollId, '', {lean: true}, function(error, poll) {

		if (poll) {

			var userVoted = true,
				userChoice,
				totalVotes = 0,
				hasOption = true,
				originalView = false,
				optionalView = false;

			for (o in poll.options) {
				var option = poll.options[o];

				if (option._id == optionId) {
					optionalView = true;

					for (c in option.choices) {
						var choice = option.choices[c];

						for (v in choice.votes) {
							var vote = choice.votes[v];
							totalVotes++;

							if (vote.ip === (req.ip || req.header('x-forwarded-for'))) {
								userChoice = {_id: choice._id, text: choice.text};
							}
						}
					}
				}
			}

			// Attach info about user's past voting on this poll
			poll.userVoted = userVoted;
			poll.userChoice = userChoice;
			poll.totalVotes = totalVotes;
			poll.hasOption = hasOption;
			poll.originalView = originalView;
			poll.optionalView = optionalView;

			res.json(poll);

		} else {

			res.json({error: true});
		}
	});
};

// JSON API for creating a new poll
exports.create = function(req, res, next) {

	var reqBody = req.body,
		// Filter out choices with empty text
		choices = reqBody.choices.filter(function(v) { return v.text != ''; }),
		// Build up poll object to save
		pollObj = {
			question: reqBody.question, 
			choices: choices,
			options: reqBody.options,
			category: reqBody.category
		};

	// Create poll model from built up poll object
	var poll = new Poll(pollObj);
	// Save poll to DB
	poll.save(function(error, doc) {

		if (error || !doc) 
			throw 'ERROR';
		else 
			res.json(doc);
	});
};

// JSON API for exporting poll data
exports.download = function(req, res, next) {
	// Poll ID comes in the URL
	var pollId = req.params.id;

	// Find the poll by its ID, use lean as we won't be changing it
	Poll.findById(pollId, '', {lean: true}, function(error, poll) {

		if (poll) {

			var totalVotes = 0;

			// Get server time
			var timestamp;

			if (!Date.now) {
				Date.now = function() { 
					return new Date().getTime(); 
				};
			
			} else {
				timestamp = Math.floor(Date.now() / 1000).toString();
			}

			// Create a new file to write poll data
			var     file = './Sites/votingApp/public/files/' + timestamp + '.xls',
			 writeStream = fs.createWriteStream(file);

			// Set file contents
			var header = ['QUESTION:', poll.question].join('\t');
			writeStream.write(header + '\n');
			writeStream.write(['CHOICES', 'VOTES'].join('\t') + '\n');

			// Loop through poll choices to determine if user has voted
			// on this poll, and if so, what they selected
			for (c in poll.choices) {
				var choice = poll.choices[c];
				writeStream.write([choice.text, choice.votes.length].join('\t') + '\n');

				totalVotes += choice.votes.length;
			}

			writeStream.write(['TOTAL VOTES: ',totalVotes].join('\t'));
			writeStream.end();

			// Send the file
			var readStream;

			fs.access('./Sites/votingApp/public/files', fs.R_OK, function(err) {
				console.log(err ? '[ERROR]: no access at given path.' : '[SUCCESS]: file read OK.');
				
				if (!err) {
					
					readStream = fs.createReadStream(__dirname + '/../public/files/' + timestamp + '.xls');

					readStream.on('open', function() {
						console.log('[NOTICE]: piping');
						return readStream.pipe(res);

					})
					.on('close', function() {
						console.log('[NOTICE]: read stream has been closed.');
					})
					.on('error', function(error) {
						console.log('[ERROR]: failed to create read stream.', error);
						res.json({error: true});
					});
				
				} else {
					res.json({error: true});

				}			
			});
			
			// res.download(file, function(err) {
			// 	if (!err)
			// 		console.log('File Sent: ' + timestamp + '.xls');
			// 	else {				
			// 		res.json({error: true});
			// 	}
			// });

		} else {

			res.json({error: true});
		}
	});
};

// Socket API for updating votes in real time
exports.vote = function(socket) {

	socket.on('send:vote', function(data) {
		//var ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address;
		var ip = socket.request.connection.remoteAddress;

		Poll.findById(data.poll_id, function(error, poll) {
			var choice = poll.choices.id(data.choice);
			
			choice.votes.push({ip: ip});

			for (o in poll.options) {
				var option = poll.options[o];

				for (c in option.choices) {
					var optChoice = option.choices[c];

					for (selection in data.selections) {
						var selectId = data.selections[selection];

						if (selectId == optChoice._id) {
							optChoice.votes.push({ip: ip});
						}
					}
				}
			}

			poll.save(function(error, doc) {

				var theDoc = {
					question: doc.question,
					_id: doc._id,
					choices: doc.choices,
					userVoted: false,
					originalView: false,
					optionalView: false,
					totalVotes: 0,
					hasOption: false,
					options: doc.options
				};

				// Loop through poll choices to determine if user has voted
				// on this poll, and if so, what they selected
				for (var i = 0; i < doc.choices.length; i++) {
					var choice = doc.choices[i];

					for (var j = 0; j < choice.votes.length; j++) {
						var vote = choice.votes[j];
						theDoc.totalVotes++;
						theDoc.ip = ip;

						if (vote.ip === ip) {
							theDoc.userVoted = true;
							theDoc.userChoice = {_id: choice._id, text: choice.text};
							theDoc.originalView = true;
						}
					}
				}

				if (doc.options.length) {
					theDoc.hasOption = true;
				}

				socket.emit('myvote', theDoc);
				socket.broadcast.emit('vote', theDoc);
			});
		});
	});
};

//module.exports = router;

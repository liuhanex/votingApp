var mongoose = require('mongoose');

// Sub document schema for votes
var voteSchema = new mongoose.Schema({ip: 'String'});

// Sub document schema for poll choices
var choiceSchema = new mongoose.Schema({
	text: String,
	votes: [voteSchema]
});

// 2016/06/04 ADD START *****
// Sub document schema for options
var optionSchema = new mongoose.Schema({
	text: String,
	choices: [choiceSchema]
});
// 2016/06/04 ADD END   *****

// Document schema for polls
exports.PollSchema = new mongoose.Schema({
	question: {
		type: String, 
		required: true
	},
	choices: [choiceSchema],

// 2016/06/04 ADD START *****
    options: [optionSchema],
    category: String
// 2016/06/04 ADD END   *****
});
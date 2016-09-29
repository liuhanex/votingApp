var mongoose = require('mongoose');

// Sub document schema for votes
var voteSchema = new mongoose.Schema({ip: 'String'});

// Sub document schema for poll choices
var choiceSchema = new mongoose.Schema({
	text: String,
	votes: [voteSchema]
});

// Sub document schema for options
var optionSchema = new mongoose.Schema({
	text: String,
	choices: [choiceSchema]
});

// Document schema for polls
exports.PollSchema = new mongoose.Schema({
	question: {
		type: String, 
		required: true
	},
	choices: [choiceSchema],
  options: [optionSchema],
  category: String
});
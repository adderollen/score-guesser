Games = new Mongo.Collection('games');
Questions = new Mongo.Collection('questions');

Games.schema = new SimpleSchema({
	phase: {type: String},
	stage: {type: Number},
	numberOfQuestions: {type: Number},
	questions: {type: Array, defaultValue: [] },
	'questions.$': {type: Object },
	players: {type: Array, defaultValue: [] },
	'players.$': {type: Object },
	'players.$.playerId': { type: String },
	'players.$.name': {type: String },
	'players.$.isReady': {type: Boolean, defaultValue: false}, 
	'players.$.answers': {type: [String], defaultValue: [] },
	'players.$.isHost': {type: Boolean, optional: true }
})

Questions.schema = new SimpleSchema({
  question: {type: String},
  answer: {type: String}
});

Meteor.publish('game', function (gameId) {
	check(gameId, String);

  return Games.find({_id: gameId}, {
    fields: { questions: 0 }
  });
});

Meteor.publish('question', function() {
	return Questions.find({}, {limit: 1});
});
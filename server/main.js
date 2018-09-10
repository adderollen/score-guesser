import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Match } from 'meteor/check';
import { HTTP } from 'meteor/http';

import '/imports/startup/server/index.js';
import '/server/collections.js';

Meteor.methods({ 

	'test'({ }) {
		new SimpleSchema({ 
    }).validate({ });




	},

	'hasQuestionsLoaded'({}){
		new SimpleSchema({

		}).validate({});

		const question = Questions.findOne();

		if (question) {
			return true;
		} 
		
		return false;
	},

	'games.newGame'({ playerName, playerId }) {
    new SimpleSchema({ 
    	playerName: { type: String },
    	playerId: { type: String }
    }).validate({ playerName, playerId });

 		
  	const questions = Questions.aggregate(
		   [ { $sample: { size: 3 } } ]
		);

    const newGame = Games.insert({
    	phase: "lobby",
    	stage: 0,
    	questions: questions,
    	numberOfQuestions: questions.length,
    	players: [{
    		playerId: playerId,
    		name: playerName,
    		isReady: false,
    		answers: [],
    		isHost: true
    	}]
    });

  	return newGame;
    
    
  },

  'games.changePhase'({ gameId, phase, stage }) {
  	new SimpleSchema({
  		gameId: { type: String, regEx: SimpleSchema.RegEx.Id },
  		phase: { type: String },
  		stage: { type: Number }
  	}).validate({ gameId, phase, stage })

  	var game = Games.findOne(gameId);

  	Games.update({_id: game._id}, {$set: {phase: phase, stage: stage}});

  	return true;

  },

  'games.joinGame'({ playerName, playerId, gameId }) {
    new SimpleSchema({ 
    	playerName: { type: String },
    	playerId: { type: String },
    	gameId: { type: String, regEx: SimpleSchema.RegEx.Id }
    }).validate({ playerName, playerId, gameId });

    var game = Games.findOne(gameId);
		var players = game.players;

		players.push({
			playerId: playerId,
			name: playerName,
			isReady: false,
			answers: []
		})

		Games.update({_id: game._id}, {$set: {players: players}})

		return players;


  },

  'games.playerStatusUpdate'({ playerId, gameId, isReady }) {
  	new SimpleSchema({
  		playerId: { type: String },
  		gameId: { type: String, regEx: SimpleSchema.RegEx.Id },
  		isReady: { type: Boolean }
  	}).validate({ playerId, gameId, isReady });

  	const game = Games.findOne(gameId);

  	if (!game.players) {
  		throw new Meteor.Error("no-players", "There are no players in this game!");
  	}

  	var players = game.players;

  	for(var i = 0; i < players.length; i++) {
  		if(players[i].playerId === playerId) {
  			players[i].isReady = isReady;
  		}
  	}

  	Games.update({_id: game._id}, {$set: {players: players}})

  	return isReady;
  },

  'games.kickPlayer'({ kickedPlayerId, gameId }) {
  	new SimpleSchema({
  		kickedPlayerId: { type: String },
  		gameId: { type: String, regEx: SimpleSchema.RegEx.Id },
  	}).validate({ kickedPlayerId, gameId });

  	const game = Games.findOne(gameId);

  	if (!game.players) {
  		throw new Meteor.Error("no-players", "There are no players in this game!");
  	}

  	var players = game.players;
  	var newPlayers = [];

  	for(var i = 0; i < players.length; i++) {
  		if(players[i].playerId !== kickedPlayerId) {
  			newPlayers.push(players[i]);
  		}
  	}

  	Games.update({_id: game._id}, {$set: {players: newPlayers}})

  	return true;

  },

  'games.getCurrentQuestion'({ gameId }) {
  	new SimpleSchema({
  		gameId: { type: String, regEx: SimpleSchema.RegEx.Id }
  	}).validate({ gameId });

  	const game = Games.findOne(gameId);

  	var questions = game.questions;

  	var correctAnswer = questions[(game.stage - 1)].answer;
  	var opositeAnswer = correctAnswer.substring(2,3) + ":" + correctAnswer.substring(0,1);
  	var draw = correctAnswer.substring(2,3) > correctAnswer.substring(0,1) ? correctAnswer.substring(0,1) + ":" + correctAnswer.substring(0,1) : correctAnswer.substring(2,3) + ":" + correctAnswer.substring(2,3);

  	var answers = [correctAnswer, opositeAnswer, draw];

  	var currentQuestion = {
  		question: questions[(game.stage - 1)].question,
  		answerOptions: shuffle(answers)
  	}

  	return currentQuestion;
  },

  'games.registerAnswer'({ gameId, playerId, answer }) {
  	new SimpleSchema({
  		gameId: { type: String, regEx: SimpleSchema.RegEx.Id },
  		playerId: { type: String },
  		answer: { type: String }
  	}).validate({ gameId, playerId, answer });

  	const game = Games.findOne(gameId);

  	var players = game.players;

  	for(var i = 0; i < players.length; i++) {
  		if (players[i].playerId === playerId) {
  			players[i].answers.push(answer);
  		}
  	}

  	Games.update({_id: gameId}, {$set: {players: players}});

  	return true;

  },

  'games.getQuestions'({ gameId }) {
  	new SimpleSchema({
  		gameId: { type: String, regEx: SimpleSchema.RegEx.Id }
  	}).validate({ gameId });

  	const game = Games.findOne(gameId);

  	return game.questions;
	},

	'games.restartGame'({ gameId }) {
  	new SimpleSchema({
  		gameId: { type: String, regEx: SimpleSchema.RegEx.Id }
  	}).validate({ gameId });

  	const game = Games.findOne(gameId);

  	const questions = Questions.aggregate(
		   [ { $sample: { size: 3 } } ]
		);

  	var players = game.players;

  	for(var i = 0; i < players.length; i++) {
  		players[i].isReady = false;
  		players[i].answers = [];
  	}

  	Games.update({_id: game._id}, {$set: {questions: questions, players: players, phase: "lobby", stage: 0}})

  	return true;

  }

});

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Random } from 'meteor/random';

import './body.html';

Games = new Mongo.Collection('games');
Questions = new Mongo.Collection('questions');

const timePerQuestion = 10;

Template.App_body.onCreated(function() {
	const playerId = Random.id();
	console.log("New playerId created: " + playerId);
	Session.set('playerId', playerId);

	Tracker.autorun(() => {
		Meteor.subscribe('question');

	});

})

Template.App_body.helpers({
	'questionsLoaded':function() {
		const question = Questions.findOne();
		if (question) {
			return true;
		}
		return false;
	}
})


Template.welcome.events({

	'click .test': function(event, template) {
		Meteor.call('test', { }, (err, res) => {
			if (err) {
				console.log("Error", err)
			} else {
				console.log("Test res", res);
			}
		});
	},

	'submit #new-game-form': function(event, template) {
		event.preventDefault();
		var playerName = document.getElementsByName("player-name")[0].value;
		var playerId = Session.get('playerId');

		Meteor.call('games.newGame', { playerName, playerId }, (err, res) => {
			if (err) {
				console.log("Error", err)
			} else {
				console.log("Go to lobby with new ID: " + res);
				FlowRouter.go('Game', {_id: res});
			}
		});

		
	},

	'submit #enter-game-form': function(event, template) {
		event.preventDefault();
		console.log("Check if there is a game with that game id")
		console.log("if exist, take user to that game screen")
		console.log("if not, ask user to change game id")
	}
})

Template.game_screen.onCreated(function() {

	Tracker.autorun(() => {
		if (FlowRouter.getParam('_id')) {
	  	Meteor.subscribe('game', FlowRouter.getParam('_id'));
		}
	});

})
 
Template.lobby.helpers({
	'currentGameLink': function() {
		if (FlowRouter.getParam('_id')) {
			return window.location.href;
		}	
	},

	'playersInGame': function() {
		const game = Games.findOne();
		if (game) {
			const players = game.players;
			return players;
		} 
	},

	'isPlayerYou': function(playerId) {
		return playerId == Session.get('playerId');
	},

	'isHost': function() {
		const playerId = Session.get('playerId');
		const game = Games.findOne();
		if (game) {
			var players = game.players;
			for (var i = 0; i < players.length; i++) {
				if(players[i].playerId === playerId) {
					return players[i].isHost;
				}
			}
			return false;
		}
	},

	'isReady': function(playerId) {
		const game = Games.findOne();
		if (game) {
			var players = game.players;
			for (var i = 0; i < players.length; i++) {
				if(players[i].playerId === playerId) {
					return players[i].isReady;
				}
			}
			return false;
		}
	},

	'colorForReady':function(playerId) {
		const game = Games.findOne();
		if (game) {
			var players = game.players;
			for (var i = 0; i < players.length; i++) {
				if(players[i].playerId === playerId) {
					return players[i].isReady ? "ready": "not-ready";
				}
			}
			return "not-ready";
		}
	},

	'newPlayer': function() {
		const currentPlayerId = Session.get('playerId');
		const game = Games.findOne();
		if (game) {
			var players = game.players;
			for (var i = 0; i < players.length; i++) {
				if(players[i].playerId === currentPlayerId) {
					return false;
				}
			}
			return true;
		}
	},

	'waitingForPlayers': function() {
		const game = Games.findOne();
		if (game) {
			var players = game.players;
			var waitingForPlayers = false;
			for (var i = 0; i < players.length; i++) {
				if (!players[i].isReady) {
					waitingForPlayers = true;
				}
			}
			return waitingForPlayers;
		}
	}

})

Template.lobby.events({

	'submit #join-game-form': function(event, template) {
		event.preventDefault();

		var playerName = document.getElementsByName("player-name")[0].value;
		var playerId = Session.get('playerId');
		var gameId = FlowRouter.getParam('_id');

		Meteor.call('games.joinGame', { playerName, playerId, gameId }, (err, res) => {
			if (err) {
				console.log("Error", err)
			} else {
				console.log("New player");
			}
		});

	},

	'click [name=ready-checkbox]': function(event, template) {
		const currentPlayerId = Session.get('playerId');
		const game = Games.findOne();

		if (game) {
			var isPlayer = false;
			var players = game.players;
			for (var i = 0; i < players.length; i++) {
				if(players[i].playerId === currentPlayerId) {
					isPlayer = true;
				}
			}
			
			if (isPlayer) {
				Meteor.call('games.playerStatusUpdate', {playerId: currentPlayerId, gameId: game._id, isReady: event.target.checked}, (err, res) => {
					if(!err) {
						return res;
					} else {
						console.log(err);
					}
				})
			} else {
				console.log("Not a player")
			}
		}
	},

	'click [name=kick-player]': function(event, template) {
		const kickedPlayerId = event.target.dataset.playerid;
		const game = Games.findOne();

		Meteor.call('games.kickPlayer', {gameId: game._id, kickedPlayerId: kickedPlayerId}, (err, res) => {
			if(!err) {
				console.log("Kicked");
			} else {
				console.log(err);
			}
		})
	},

	'click #start-game-button': function(event, template) {
		const game = Games.findOne();

		Meteor.call('games.changePhase', {gameId: game._id, phase: "questions", stage: 1}, (err, res) => {
			if(!err){

			} else {
				console.log(err);
			}
		})
	}

})

Template.questions.onCreated(function() {
	this.currentQuestion = new ReactiveVar(null);

})

Template.questions.helpers({
	'getCurrentStage':function() {
		const game = Games.findOne();
		var instance = Template.instance();
		Meteor.call('games.getCurrentQuestion', {gameId: game._id}, (err, res) => {
			if(!err) {
				instance.currentQuestion.set(res);
			} else {
				console.log(err);
			}
		})

		return game.stage;
	},

	'getCurrentQuestion':function() {
		return Template.instance().currentQuestion.get();
	},

	'clearTimer': function() {
		var clearTimer = Session.get('clearTimer');
		if (clearTimer) {
			var currentTimerId = Session.get('currentTimerId');
			Meteor.clearInterval(currentTimerId);
			Session.set('clearTimer', false);
		}
	},

	'nextQuestion': function() {
		const game = Games.findOne();
		var allAnswersRecorded = true;

		for(var i = 0; i < game.players.length; i++) {
			if (game.players[i].answers.length != game.stage) {
				allAnswersRecorded = false;
				break;
			}
		}

		if (allAnswersRecorded) {
			var newPhase, newStage;
			if (game.stage === game.numberOfQuestions) {
				newPhase = "results";
				newStage = 1;
			} else {
				newPhase = "questions";
				newStage = game.stage+1;
			}

			Meteor.call('games.changePhase', {gameId: game._id, phase: newPhase, stage: newStage}, (err, res) => {
				if(!err){
					if (newPhase === "questions") {
						Session.set('timeLeft', timePerQuestion);
						var questionTimer = Meteor.setInterval(questionTimerFunction, 1000);
						Session.set('currentTimerId', questionTimer);
					} else {
						console.log("Let's go to the results");
					}
					
				} else {
					console.log(err);
				}
			})
		}


	}

})

Template.currentQuestion.onRendered(function() {
	var timeLeft = timePerQuestion;
	Session.set('timeLeft', timeLeft);
	Session.set('clearTimer', false);

	var questionTimer = Meteor.setInterval(questionTimerFunction, 1000);
	Session.set('currentTimerId', questionTimer);

})

Template.currentQuestion.helpers({
	'notPartOfGame': function() {
		const currentPlayerId = Session.get('playerId');
		const game = Games.findOne();
		if (game) {
			var players = game.players;
			for (var i = 0; i < players.length; i++) {
				if(players[i].playerId === currentPlayerId) {
					return false;
				}
			}
			return true;
		}
	},

	'timeLeft': function() {
		return Session.get('timeLeft');
	}
})

Template.results.onCreated(function() {
	this.questions = new ReactiveVar(null);
})

Template.results.helpers({
	'players': function() {
		const game = Games.findOne();
		return game.players;
	},

	'getQuestions': function() {
		const game = Games.findOne();
		var instance = Template.instance();

		Meteor.call('games.getQuestions', { gameId: game._id }, (err, res) => {
			if(!err) {
				instance.questions.set(res);
			} else {
				console.log(err);
			}
		})

	},

	'questions': function() {
		return Template.instance().questions.get();
	},

	'answerForQuestion': function(question, player) {
		const questions = Template.instance().questions.get();

		for(var i = 0; i<questions.length; i++) {
			if (questions[i].question === question) {
				return player.answers[i];
			}
		}

	},

	'totalCorrectOnQuestion': function(question) {
		const game = Games.findOne();
		const questions = Template.instance().questions.get();

		var correctAnswers = 0;

		for(var i = 0; i<questions.length; i++) {
			if (questions[i].question === question) {
				for(var j = 0; j<game.players.length; j++) {
					if (game.players[j].answers[i] === questions[i].answer) {
						correctAnswers++;
					}
				}
				return correctAnswers;
			}
		}
	},

	'totalCorrectForPlayer': function(player) {
		const questions = Template.instance().questions.get();

		var correctAnswers = 0;

		if (questions) {

			for(var i = 0; i < questions.length; i++) {
				if (player.answers[i] === questions[i].answer) {
					correctAnswers++;
				}
			}

			return correctAnswers;
		}
	},

	'totalCorrectForGame': function() {
		const questions = Template.instance().questions.get();
		const game = Games.findOne();

		var correctAnswers = 0;

		if(game && questions) {

			for(var i = 0; i<questions.length; i++) {
				for(var j = 0; j<game.players.length; j++) {
					if (game.players[j].answers[i] === questions[i].answer) {
						correctAnswers++;
					}
				}
			}

			return correctAnswers;

		}

	}

})

Template.results.events({
	'click input[name=back-to-lobby]': function(event, template) {
		const game = Games.findOne();

		Meteor.call('games.restartGame', {gameId: game._id}, (err, res) => {
			if(!err) {
				console.log("Going back to lobby");
			} else {
				console.log(err);
			}
		})

	}
})

var questionTimerFunction = function() {
		timeLeft = Session.get('timeLeft');
		timeLeft--;
		Session.set('timeLeft', timeLeft);

		if (timeLeft == 0) {
			Session.set('clearTimer', true);

			const game = Games.findOne();
			const currentPlayerId = Session.get('playerId');

			var checkedOption = document.querySelector('input[name="answer"]:checked');

			var answer;
			if (checkedOption) {
				answer = checkedOption.value;
			} else {
				answer = "-";
			}

			var players = game.players;
			for (var i = 0; i < players.length; i++) {
				if(players[i].playerId === currentPlayerId) {
					Meteor.call('games.registerAnswer', {gameId: game._id, playerId: currentPlayerId, answer: answer}, (err, res) => {
						if(!err) {
							var radioButtons = document.getElementsByName("answer");
							for(var i = 0; i< radioButtons.length; i++) {
								radioButtons[i].checked = false;
							}
							console.log("Answer registered");
						} else {
							console.log(err);
						}
					})
				}
			}
		}
	}
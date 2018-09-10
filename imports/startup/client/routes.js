import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

// Import to load these templates
/*
import '../../ui/layouts/app-body.js';
import '../../ui/pages/root-redirector.js';
import '../../ui/pages/lists-show-page.js';
import '../../ui/pages/app-not-found.js';

// Import to override accounts templates
import '../../ui/accounts/accounts-templates.js';
*/

// Below here are the route definitions

FlowRouter.route('/', {
  name: 'Welcome',
  action() {
    BlazeLayout.render('App_body', {main: 'welcome'});
  }
});

FlowRouter.route('/game/:_id', {
  name: 'Game',
  subscriptions: function(params, queryParams) {
        this.register('thisGame', Meteor.subscribe('game', params._id));
    },
  action: function(params, queryParams) {
  	Tracker.autorun(() => {
		  const game = Games.findOne(params._id);
	  	if (game) {
	    	BlazeLayout.render('App_body', {main: 'game_screen', content: game.phase});
	  	}
		});
  }
});
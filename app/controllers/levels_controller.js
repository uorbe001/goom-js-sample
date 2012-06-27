var locomotive = require('locomotive'), Controller = locomotive.Controller, GameServers = require("../../config/gamservers");

var LevelsController = new Controller();

LevelsController.play = function() {
  this.title = 'Level ' + this.params('level');
  this.level = this.params('level');
  this.connection = GameServers[this.level];

  if (this.request.user) {
	this.user = this.request.user;
	console.log(this.request.sessionID);
	return this.render();
  }

  this.redirect("/login");
};

module.exports = LevelsController;
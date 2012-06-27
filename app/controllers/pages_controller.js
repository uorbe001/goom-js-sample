var locomotive = require('locomotive'), Controller = locomotive.Controller;

var PagesController = new Controller();

PagesController.main = function() {
  this.title = 'Locomotive';
  this.user = this.request.user;
  console.log(this.request.sessionID);
  this.render();
};

module.exports = PagesController;

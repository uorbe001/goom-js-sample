var passport = require("passport");

module.exports = function routes() {
  this.root('pages#main');
  this.match('/levels/play/:level', 'levels#play');
  //Twitter oauth routes.
  this.match('/auth/twitter', passport.authenticate('twitter'));
  this.match('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/', failureRedirect: '/login' }));
}

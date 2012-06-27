var express = require('express'), passport = require('passport');

module.exports = function() {
  this.set('views', __dirname + '/../../app/views');
  this.set('view engine', 'jade');
  this.use(express.logger());
  this.use(express.cookieParser());
  this.use(express.bodyParser());
  this.use(express.session({ secret: 't*p s3cr3t' }));
  this.use(passport.initialize());
  this.use(passport.session());
  this.use(this.router);
  this.use(express.static(__dirname + '/../../public'));
  this.datastore(require('locomotive-mongoose'));
}

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var AuthenticationSchema = require('./authentication').AuthenticationSchema;

var UserSchema = new Schema({
	username: String,
	email: String,
	authentications: [AuthenticationSchema]
});

exports.User = mongoose.model('User', UserSchema);
exports.UserSchema = UserSchema;
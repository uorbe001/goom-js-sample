var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AuthenticationSchema = new Schema({
	uid: Number,
	provider: String
});

exports.Authentication = mongoose.model('Authentication', AuthenticationSchema);
exports.AuthenticationSchema = AuthenticationSchema;
var mongoose = require("mongoose");
mongoose.connect('mongo://goom:g00m@127.0.0.1:27017/goom-dev');

var mongooseTypes = require("mongoose-types");
mongooseTypes.loadTypes(mongoose);
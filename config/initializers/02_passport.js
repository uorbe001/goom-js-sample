var passport = require('passport'), TwitterStrategy = require('passport-twitter').Strategy;
var Authentication = require('../../app/models/authentication').Authentication, User = require('../../app/models/user').User;

passport.use(new TwitterStrategy({
    consumerKey: "VEO0QbGXgRsV2J2gYXyYg",
    consumerSecret: "OBNOnCU8frPi8svJcyAlEiwkYwCbQlQDhAjGswE0k",
    callbackURL: "http://localhost:3000/auth/twitter/callback"
  }, function(token, tokenSecret, profile, done) {
      Authentication.findOne({ provider: profile.provider, uid: profile.id }, function(err, authentication) {
        if(err) return done(err);
        var user;

        if (authentication) {
          console.log(authentication.parent); //TODO
          user = authentication.user;
          return done(err, user);
        }

        authentication = new Authentication();
        authentication.provider = profile.provider;
        authentication.uid = profile.id;

        user = new User();
        user.username = "balh";
        user.email = "test@test.com";//TODO
        user.authentications.push(authentication);
        user.save();
        
        return done(err, user);
      });
  }
));

passport.serializeUser(function (user, done) {
  return done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    return done(err, user);
  });
});
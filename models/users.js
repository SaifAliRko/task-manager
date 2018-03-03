const mongoose = require('mongoose'),
      bcrypt = require('bcryptjs');

var mailObj = require('../mailUtil');
var config = require('../config/config.js');

var Schema = mongoose.Schema;

// User Schema.
var UserSchema = new Schema({
  "firstName": {
    type: String,
    trim: true
  },
  "lastName": {
    type: String,
    trim: true
  },
  "email": {
    type: String,
    index: true,
    trim: true
  },
  "password": {
    type: String,
    trim: true
  },
  "authToken": {
    type: String,
    trim: true,
    required: true
  },
  "isAccountVerified": {
    type: Boolean,
    default: false
  },
  "mailCount": {
    "lastMailSend": {
      type: Date,
      default: Date.now
    },
    "count": {
      type: Number,
      default: 0
    }
  }
});

var User =  module.exports = mongoose.model('user', UserSchema);

// utility method that creates a User in the db.
module.exports.createUser = function(newUser, callback) {
  // bycrypt is used to create a hash out of the password entered.
  bcrypt.genSalt(10, function(err, salt) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
      return;
    }

    bcrypt.hash(newUser.password, salt, function(err, hash) {
        newUser.password = hash;
        newUser.save(callback);
    });
  });
};

// utility method that fetches the User with a particular Email.
module.exports.getUserByUserName = function(user_email, callback) {
  User.findOne({email: user_email}, callback);
};

// utility method that verifies user input password with that of db.
module.exports.verifyPassword = function(user_password, pass, callback) {
  bcrypt.compare(user_password, pass, function(err, isVerifiedUser) {
     return callback(err, isVerifiedUser);
  });
};

// utility method that fetches a User with a particular Id.
module.exports.getUserById = function(Id, callback) {
  User.findById(Id, callback);
};

// utility to update the Auth Token of a User.
module.exports.updateAuthToken = function(Id, authToken, callback) {
  User.findByIdAndUpdate(Id, {authToken: authToken}, callback);
};

// utiltiy method that updates the 'isAccountVerified' field of the User which effictively tells that the 'E-Mail' is now verified.
module.exports.setAccountVerified = function(Id, callback) {
  User.findByIdAndUpdate(Id, { isAccountVerified: true }, callback);
};

// utility method that updates the password of a particular User when a change password request is raised.
module.exports.updatePassword = function(Id, newPassword, callback) {
  // bycrypt is used to create a hash out of the password entered.
  bcrypt.genSalt(10, function(err, salt) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
      return;
    }
    bcrypt.hash(newPassword, salt, function(err, passwordHash) {
      //console.log('passwordHash', passwordHash);
      User.findByIdAndUpdate(Id, { password: passwordHash }, callback);
    });
  });
};

// utility that sends mail to a User with mail properties provided as functional arguments.
module.exports.sendMailToUser = function(subject, text, userMailId, callback) {
  mailObj.sendMail({
    from: config.mailSender,
    to: userMailId,
    subject: subject,
    text: text
  }, function(err, info) {
    callback(err, info);
  });
};

// utility that sends 'Template Based Mails' to a User with mail properties provided as functional arguments.
module.exports.sendMailUsingTemplateToUser = function(subject, user, template, contextObj, callback) {
  mailObj.sendMail({
    from: config.mailSender,
    to: user.email,
    subject: subject,
    template: template,
    context: contextObj
  }, function(err, info) {
    updateMailCount(user._id, user.mailCount, function (err_) {
      callback(err, info);
    });
  });
};

var updateMailCount = function (Id, mailCountObj, callback) {
  let prev = mailCountObj.lastMailSend;
  let curr = new Date();

  if(prev.getFullYear() === curr.getFullYear() &&
    prev.getMonth() === curr.getMonth() &&
    prev.getDate() === curr.getDate()) {
      mailCountObj.count++;
  } else {
    mailCountObj.lastMailSend = new Date();
    mailCountObj.count = 1;
  }

  User.findByIdAndUpdate(Id, {mailCount: mailCountObj}, callback);
};
/** TO DO List:
**/

/** CHANGE LOGS:
 * Add router.get('*')
**/

var router = require('express').Router();
var path = require('path');
var passport = require('passport');
var localStrategy = require('passport-local').Strategy;

var User = require('../models/users');
var mailObj = require('../mailUtil');

// the starting route. If the user is logged in, his/her dashboard is shown, Else Login page is rendered.
router.get('/', function(req, res, next) {
  // if the user is logged in, take him to '/users' route, else open login page.
  if(req.user && req.user.isVerifiedUser) {
    res.redirect('/users');
  } else {
    res.sendFile(path.join(__dirname, '../public/login.html'));
  }
});

// A dummy route that will take a newly registerd user to the 'login page' and also show "Succes message for registration".
router.get('/newRegistrant', function(req, res, next) {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// A dummy route that will take the user to the 'login page' once his/her password is changed, and also show a "Success message for password change".
router.get('/passwordChanged', function(req, res, next) {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// A dummy route that will take the user to the 'login page' when User authentication is failed, and also show a "Failure message for the same".
router.get('/authFails', function(req, res, next) {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// registering new user into db.
router.post('/register', function(req, res, next) {
  // validation over user data filled by the User.
  req.checkBody('newuser_firstName', 'First Name is required').notEmpty();
  req.checkBody('newuser_lastName', 'Last Name is required').notEmpty();
  req.checkBody('newuser_email', 'Email is not valid').isEmail();
  req.checkBody('newuser_password', 'Password is required').notEmpty();
  req.checkBody('newuser_password', 'Password must be of minimum 4 letters').isLength({min: 4, max: undefined});
  req.checkBody('newuser_confirm_password', 'Password is required').notEmpty();
  req.checkBody('newuser_confirm_password', 'Passwords do not match. Please re-check').equals(req.body.newuser_password);

  var validationErrors = req.validationErrors();

  // if there are validation errors, send them to be rendered on the UI to the ajax request.
  if(validationErrors) {
    res.send({
      validationErrors: validationErrors
    });
  // if there are no errors, create the USER.
  } else {
    // generate auth token
    let authToken = mailObj.generateToken();

    let newUser = new User({
      "firstName": req.body.newuser_firstName,
      "lastName": req.body.newuser_lastName,
      "email": req.body.newuser_email,
      "password": req.body.newuser_password,
      "authToken": authToken,
      "isAccountVerified": false
    });

    User.createUser(newUser, function(err, user) {
      if(err) {
        if(err.name == 'MongoError' && err.code == '11000') {
          res.send({
            validationErrors: [{
              param: 'newuser_email',
              msg: 'User with this E-Mail Address already exists!'
            }]
          });
          return;

        } else {
          req.flash('error_msg', 'Something Went Wrong!!!');
          console.error(err);
        }
      }
      
      // Send 'registrantion successful' mail when registration is done.
      User.sendMailUsingTemplateToUser('Task-Manager Registration Successful', newUser, 'registrationComplete', {userFirstName: newUser.firstName}, function(err, info) {
        console.log('inside registration successful template mail', info);
        res.send('');  //if the registrant is new. Don't do anything, code will handle everything.
      });
    });
  }
});

// serialize user data from db to server.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// de-serialize user data from server to db.
passport.deserializeUser(function(id, done) {
  User.getUserById(id, function (err, user) {
    done(err, user);
  });
});

// Use self created Strategy as Local Strategy for passport authentication.
passport.use(new localStrategy(
  function(username, password, done) {
    User.getUserByUserName(username, function(err, user) {
      if(err) {
        return done(err);
      }
      if(!user) {
        return done(null, false, {message: 'Unknown Email...'});
      }
      
      let pass = user.password;
      //console.log('inside login 2 ---', password, pass);
      User.verifyPassword(password, pass, function(err, isVerifiedUser){
        if(err) {
          return done(err);
        }

        if(isVerifiedUser) {
          return done(null, user);
        }

        return done(null, false, {message: 'Wrong Password... Try Again!'});
      });
    });
  })
);

// handling login.
router.post('/login', passport.authenticate('local', {
    failureFlash: true,
    failureRedirect: '/authFails'   
  }),
  function(req, res) {
    //console.log(req.user);
    req.session.userID = req.user._id;
    req.session.userName = req.user.firstName;

    //if the user is verified, take him to his account.
    if(req.user.isAccountVerified) {
      res.redirect('/users');
      //if the user has not yet verified his/her account, mail Auth Token and take him/her to this page.
    } else {
      // check whether the mail counts for this user for the day exceeded or not.
      let prev = req.user.mailCount.lastMailSend;
      let curr = new Date();

      if(prev.getFullYear() === curr.getFullYear() &&
        prev.getMonth() === curr.getMonth() &&
        prev.getDate() === curr.getDate() && req.user.mailCount.count >= 5) {
        
        // if in the User Auth section, the user has exhausted the mail send limits, don't send the user any more mails, and show him the error.
        res.render('authMail', {layout: 'other.handlebars', exceededMailSendLimit: true, err: null, resendBtnDisable: true});

        return;
      }
      
      // If there are still mails the system can send the User, proceed with that.
      // get auth token
      let authToken = req.user.authToken;

      let mailText = 'Hi ' + req.user.firstName + ', Thanks for registering with us. Please use the authentication token to verify your account.';

      let mailContextObj = {
        heading: 'Authenticate Yourself',
        mailText: mailText,
        authToken: authToken
      }
      
      User.sendMailUsingTemplateToUser('Please Authenticate your account!', req.user, 'authTokenRelated', mailContextObj, function(err, info) {
        console.log('inside account auth', info);
        res.render('authMail', {layout: 'other.handlebars', err: null, resendBtnDisable: null});  //if an older registrant has not yet verified his/her account, take him/her to this page.
      });
    }
  }
);

// handling logout.
router.get('/logout', function(req, res, next) {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});

// when the user is in login route and refreshes the page.
router.get('/login', function (req, res, next) {
  res.redirect('/');
});

// handling change password requests.
router.post('/changePassword', function(req, res, next) {
  // validations over password values.
  if(req.body.fromForgotPassword == 'false') {
    req.checkBody('oldPassword', 'Old Password is required').notEmpty();
  }
  req.checkBody('newPassword', 'Password is required').notEmpty();
  req.checkBody('newPassword2', 'Confirm Password is required').notEmpty();
  req.checkBody('newPassword', 'Password must be of minimum 4 letters').isLength({min: 4, max: undefined});
  req.checkBody('newPassword2', 'Passwords do not match. Please re-check').equals(req.body.newPassword);

  var validationErrors = req.validationErrors();

  if(validationErrors) {
    res.send({
      validationErrors: validationErrors,
      customValidation: '',
      renderOldPassword: true
    });
    return;
  }

  //console.log('inside changePassword', req.body);

  // if the Change Password request comes after the User is redirected from Forgot Password section, we just update the new passwords and not validate the old passwords.
  if(req.body.fromForgotPassword == 'true') {
    User.updatePassword(req.session.userID, req.body.newPassword, function(err, user) {
      if(err) {
        req.flash('error_msg', 'Something Went Wrong!!!');
        console.error(err);
      } else {
        //console.log('inside change password from FP ---- ', user);
        res.redirect('/passwordChanged');
      }
    });
  }
  else {
    User.verifyPassword(req.body.oldPassword, req.user.password, function(err, isVerifiedPassword) {
      if(err) {
        req.flash('error_msg', 'Something Went Wrong!!!');
        console.error(err);
        return;
      }
      
      let customValidation = {};
      if(!isVerifiedPassword) {
        customValidation = {
          "param": "oldPassword",
          "msg": "Please Enter the correct Password!"
        };
  
        res.send({
          validationErrors: validationErrors,
          customValidation: customValidation,
          renderOldPassword: true
        });
        return;
      }
  
      User.updatePassword(req.user._id, req.body.newPassword, function(err, user) {
        if(err) {
          req.flash('error_msg', 'Something Went Wrong!!!');
          console.error(err);
          return;
        }
        
        //console.log('inside changePassword2 ---- ', user);
        res.redirect('/passwordChanged');
      });
    });
  }

});

// this route renders the 'forgot password page'.
router.get('/forgotPasswordPage', function(req, res, next) {
  res.render('forgotPassword', {layout: 'other.handlebars'});
});

// this route validates the 'E-Mail' provided by user at the time of 'Forgot password' request and if the mail checks out, sends an E-Mail to the User that has 'Auth Token'.
router.post('/forgotPasswordPage/sendAuth', function(req, res, next) {
  // validate over User E-Mail.
  console.log('here in forgotPassword/sendAuth', req.body);
  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('email', 'Email is not valid').isEmail();

  var validationErrors = req.validationErrors();
  if(validationErrors) {
    res.send({validationErrors: validationErrors});
  } else {
    User.getUserByUserName(req.body.email, function(err, user) {
      if(err) {
        req.flash('error_msg', 'Something Went Wrong!!!');
        console.error(err);
        return;
      }
      
      if(!user) {
        res.send({customValidation: {param: 'user_email', msg: 'The User doesn\'t exist.'}});
      } else {
        // check whether the mail counts for this user for the day exceeded or not.
        let prev = user.mailCount.lastMailSend;
        let curr = new Date();

        if(prev.getFullYear() === curr.getFullYear() &&
          prev.getMonth() === curr.getMonth() &&
          prev.getDate() === curr.getDate() && user.mailCount.count >= 5) {
          res.send({customValidation: {param: 'mailLimitExceeded', msg: 'Exceeded mail send limit, try again in 24 hours.'}});
          return;
        }

        let authToken = mailObj.generateToken();

        User.updateAuthToken(user._id, authToken, function(err) {
          if(err) {
            req.flash('error_msg', 'Something Went Wrong!!!');
            console.error(err);
            return;
          }

          let mailText = 'Hi, ' + user.firstName + '. Please enter the auth token to change your password.'

          let mailContextObj = {
            heading: 'Authenticate Yourself',
            mailText: mailText,
            authToken: authToken
          }

          User.sendMailUsingTemplateToUser('Forgot Login! Authenticate your account.', user, 'authTokenRelated', mailContextObj, function(err, info) {
            console.log('inside forgot password auth mail send', info);
            res.send({});
          });
        })
      }
    });
  }
});

// In the forgot password section, Once the User's E-Mail is verified, this router accepts an input Auth Token and validates it with the user record. If everything checks out, User is redirected to Change Password section.
router.post('/forgotPasswordPage/validateAuth', function(req, res, next) {
  console.log('here at forgot password validate auth');
  User.getUserByUserName(req.body.email, function(err, user) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
      return;
    }
    //console.log('auth FP user', user);
    if(req.body.authToken != user.authToken) {
      req.session.userID = user._id;
      res.send({customValidation: {param: 'FPAuthToken', msg: 'Wrong Auth Token. Please try again.'}});
    } else {
      res.send('');
    }
  });
});

// In forgot password section, once the User and Auth Token checks out, redirect the User to Change Password page.
router.get('/changeYourPassword', function(req, res, next) {
  res.render('changePassword', {layout: 'other.handlebars' , renderOldPassword: false});
});

// verify the auth token supplied by a new user.
router.post('/validateAuthToken', function(req, res, next) {
  if(req.user.authToken == req.body.authTokenInput) {
    User.setAccountVerified(req.user._id, function(err) {
      if(err) {
        res.locals.error_msg = err.msg;
        console.error(err);
      } else {
        

        let contextObj = {
          userFirstName: req.user.firstName,
          userLastName: req.user.lastName,
          userEmail: req.user.email
        }

        // Send 'New User Registrantion' mail when registration is done to the OWNER.
        User.sendNewRegistrationInfoToOwner('Task-Manager New User Registered!', 'notifyOwnerAboutNewReg', contextObj, function(err, info) {
          if(err) {
            console.error(err);
          } else {
            console.log('mail sent to owner!!!', info);
          }
        });
        res.redirect('/users');
      }
    });
  } else {
    let resendBtnDisable =  (req.body.resendTokenBtnDisable == 'false') ? null: true;
    res.render('authMail', {layout: 'other.handlebars', err: 'Wrong Auth Token. Please enter a valid token!', resendBtnDisable: resendBtnDisable});
  }
});

//resend the mail with auth token to the user.
router.get('/resendMail', function(req, res, next) {
  //get auth token
  let authToken = req.user.authToken;

  let mailText = 'Hi ' + req.user.firstName + ', Thanks for registering with us. Please use the authentication token to verify your account.';

  let mailContextObj = {
    heading: 'Authenticate Yourself',
    mailText: mailText,
    authToken: authToken
  }

  User.sendMailUsingTemplateToUser('Please Authenticate your account!', req.user, 'authTokenRelated', mailContextObj, function(err, info) {
    console.log('inside account auth - resend token', info);
    res.render('authMail', {layout: 'other.handlebars', err: null, resendBtnDisable: true});  //if an older registrant has not yet verified his/her account, take him/her to this page.
  });

});

// before every request, check whether user is logged in or not.
router.get('*', function (req, res, next) { 
  if(!req.user) {
    res.redirect('/');
  }
  else {
    next();
  }
});

module.exports = router;
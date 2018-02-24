const nodemailer = require('nodemailer'),
      xoauth = require('xoauth2'),
      smtpTransport = require('nodemailer-smtp-transport'),
      tokenGenerator = require('rand-token'),
      hbs = require('nodemailer-express-handlebars');

var accessToken;

const config = require('./config/config.js');

// options for 'nodemailer-express-handlebars' used to send template based mails.
var options = {
  viewEngine: {
      extname: '.handlebars'
  },
  viewPath: __dirname + '/public/views/emails/',
  extName: '.handlebars'
};

var generator = xoauth.createXOAuth2Generator({
  user: config.user,
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  refreshToken: config.refreshToken
});

var transporter = nodemailer.createTransport(smtpTransport({
  service: config.smtpTransportObj.service,
  host: config.smtpTransportObj.host,
  port: config.smtpTransportObj.port,
  secure: config.smtpTransportObj.secure,
  secureConnection: config.smtpTransportObj.secureConnection,
  auth: {
    xoauth2: generator
  }
}));

// send template based mails.
transporter.use('compile', hbs(options));

transporter.on('token', function(accessToken) {
   accessToken: accessToken 
});

// utility method that generates a random authentication token to authenticate the user account.
module.exports.generateToken = function() {
  let randToken = tokenGenerator.generator();
  return randToken.generate(4);
};

module.exports.transporter = transporter;

// utility function that sends a mail to a User.
module.exports.sendMail = function(mailOptions, callback) {
  mailOptions.auth = {
    accessToken: accessToken,
    refreshToken: config.refreshToken
  }
  transporter.sendMail(mailOptions, callback);
};
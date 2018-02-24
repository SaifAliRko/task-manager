var express = require('express'),
      bodyParser = require('body-parser'),
      path = require('path'),
      serveFavicon = require('serve-favicon'),
      mongoose = require('mongoose'),
      passport = require('passport'),
      localStrategy = require('passport-local').Strategy,
      exphbs = require('express-handlebars'),
      flash = require('connect-flash'),
      session = require('express-session'),
      cookieParser = require('cookie-parser'),
      expressValidator = require('express-validator')
      morgan = require('morgan');

const config = require('./config/config.js');

const PORT = process.env.PORT || config.PORT;

// setting up database(mLab) connection.
var uri = config.mlabUri;

mongoose.connect(uri, {useMongoClient: true}, function(err) {
  if(err) {
    return console.error(err);
  }
  console.log('connected to Database!!!');
});

var app = express();

// setup morgan logger.
app.use(morgan('dev'));

// setup static folder
app.use(express.static(path.join(__dirname, 'public')));

// View Engine.
app.set('views', path.join(__dirname, 'public/views'));
app.engine('handlebars', exphbs({defaultLayout: 'main.handlebars', layoutsDir: __dirname + '/public/views/layouts'}));
app.set('view engine', 'handlebars');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json());

app.use(cookieParser());

// express-session
app.use(session(
  config.sessionObj
));

// use connect-flash
app.use(flash());

// init passport
app.use(passport.initialize());
app.use(passport.session());

// Global variables to show flash messages
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// configure express-validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
    var namespace = param.split('.')
    , root    = namespace.shift()
    , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// always define routes below express configurations.
var routes = require('./routes/routes');
var userRoutes = require('./routes/userRoutes');

app.use('/', routes);
app.use('/users', userRoutes);

app.listen(PORT, function() {
  console.log('magic is happening at ' + PORT + '!!!');
});
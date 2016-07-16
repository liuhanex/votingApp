var express = require('express');
var router = express.Router();
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');


var routes = require('./routes/index');
var users  = require('./routes/users');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var port = 3000;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//app.use('/users', users);

app.get('/', routes.index);
app.get('/polls/polls', routes.list);
app.get('/polls/:id', routes.poll);
app.get('/polls/:id/download', routes.download);
app.get('/polls/:id/:optionId', routes.pollAdv);
app.post('/polls', routes.create);
//app.post('/vote', routes.vote);

io.sockets.on('connection', routes.vote);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


server.listen(port, function() {
    console.log('Server running at 127.0.0.1:' + port);
});

//module.exports = app;

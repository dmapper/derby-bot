var racer = require('racer');
var request = require('request');
var extend = require('extend');
var socket = require('./socket');

var defaultConnectOptions = {
  cookie: '',
  url: 'ws://localhost:3000/channel',
  reconnect: true,
  timeout: 10000,
  timeoutIncrement: 10000
};

var defaultLoginOptions = {
  url: 'http://localhost:3000/auth/login',
  form: {
    email: '',
    password: ''
  }
};

var defaultRegisterOptions = {
  url: 'http://localhost:3000/auth/register',
  confirmUrl: 'http://localhost:3000/auth/confirmregistration?id=',
  form: {
    email: '',
    password: '',
    confirm: ''
  }
};

exports.connect = function(options, callback){
  options = extend({}, defaultConnectOptions, options || {});
  callback = callback || function(){};

  socket();

  model = new racer.Model();
  model.createConnection(options);

  callback(null, model);
};

exports.login = function(options, callback){
  options = extend({}, defaultLoginOptions, options || {});
  callback = callback || function(){};

  request.post(options, function(err, httpResponse, body){
    if (err) return callback(err);

    try {
      body = JSON.parse(body);
    } catch (e) {
      return callback("Can't parse body-response");
    }

    var userId = body.userId;
    if (!userId) return callback('There is no userId!');

    var headers = httpResponse.headers;
    var cookie =  headers && headers['set-cookie'] && headers['set-cookie'][0];
    cookie = cookie.split('; ')[0];

    callback(err, cookie, userId);
  });
};

exports.register = function(options, callback){
  options = extend({}, defaultRegisterOptions, options || {});
  callback = callback || function(){};

  request.post(options, function(err, httpResponse, body){

    if (err) return callback(err);

    try {
      body = JSON.parse(body);
    } catch (e) {
      return callback("Can't parse body-response");
    }

    var userId = body.userId;
    if (!userId) return callback('There is no userId!');

    request.post(options.confirmUrl + userId, function(err, httpResponse, body){

      var headers = httpResponse.headers;
      var cookie =  headers && headers['set-cookie'] && headers['set-cookie'][0];
      cookie = cookie.split('; ')[0];

      callback(err, cookie, userId);
    });

  });
};

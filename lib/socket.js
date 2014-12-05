var racer = require('racer');
var share = require('share/lib/client');

var WebSocket = require('ws');
var Model = racer.Model;

module.exports = function(){

  // Just copy the client-side function from racer
  // Because there is no way to force using it
  // racer override the function its server version

  Model.prototype.createConnection = function(options) {
    // Model::_createSocket should be defined by the socket plugin
    this.root.socket = this._createSocket(options);

    // The Share connection will bind to the socket by defining the onopen,
    // onmessage, etc. methods
    var shareConnection = this.root.shareConnection = new share.Connection(this.root.socket);
    var segments = ['$connection', 'state'];
    var states = ['connecting', 'connected', 'disconnected', 'stopped'];
    var model = this;
    states.forEach(function(state) {
      shareConnection.on(state, function() {
        model._setDiff(segments, state);
      });
    });
    this._set(segments, 'connected');

    // Wrap the socket methods on top of Share's methods
    this._createChannel();
  };

  Model.prototype._createSocket = function(options) {
    return new Socket(options);
  };

}

function Socket(options) {
  this._options = options;
  this._messageQueue = [];
  this._connectedOnce = false;
  this._attemptNum = 0;
  this._url = options.url;

  this._createWebSocket();
}

Socket.prototype._createWebSocket = function() {

  this._type = 'websocket';
  this._socket = new WebSocket(this._url, {

    headers: {
      Cookie: this._options.cookie
    }
  });

  this.open = this._createWebSocket.bind(this);
  this._syncState();

  this._socket.onmessage = this._ws_onmessage.bind(this);
  this._socket.onopen = this._ws_onopen.bind(this);
  this._socket.onclose = this._ws_onclose.bind(this);

  this._socket.on('error', function(){
    console.log('error!', arguments);
  })

};

Socket.prototype._ws_onmessage = function(message) {
  this._syncState();
  message.data = JSON.parse(message.data);
//  console.log('message>', message.data)
  this.onmessage && this.onmessage(message);
};

Socket.prototype._ws_onopen = function() {
  this._attemptNum = 0;
  this._connectedOnce = true;

  this._syncState();
  this._flushQueue();

  this.onopen && this.onopen();
};

Socket.prototype._ws_onclose = function(event) {
  this._syncState();
  console.log('WebSocket: connection is broken', event);

  this.onclose && this.onclose(event);

  if (this._options.reconnect) {
    setTimeout(this._createWebSocket.bind(this), this._getTimeout());
  }
  this._attemptNum++;
};


Socket.prototype._getTimeout = function(){
  var base = this._options.timeout;
  var increment = this._options.timeoutIncrement * this._attemptNum;
  return  base + increment;
};

Socket.prototype._flushQueue = function(){
  while (this._messageQueue.length !== 0) {
    var data = this._messageQueue.shift();
    this._send(data);
  }
};

Socket.prototype._send = function(data){
  if (this._type === 'websocket' && (typeof data !== 'string')) data = JSON.stringify(data);

  this._socket.send(data);
};

Socket.prototype.send = function(data){
  if (this._socket.readyState === WebSocket.OPEN && this._messageQueue.length === 0) {
    this._send(data);
  } else {
    this._messageQueue.push(data);
  }
};

Socket.prototype.close = function(){
  this._socket.close();
};

Socket.prototype._syncState = function(){
  this.readyState = this._socket.readyState;
};

// ShareJS constants
Socket.prototype.canSendWhileConnecting = true;
Socket.prototype.canSendJSON = true;

// WebSocket constants
Socket.prototype.CONNECTING = 0;
Socket.prototype.OPEN = 1;
Socket.prototype.CLOSING = 2;
Socket.prototype.CLOSED = 3;
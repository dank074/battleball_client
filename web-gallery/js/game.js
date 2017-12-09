var Game = {};

function updateStatus(status) {
  var stat_div = document.getElementById("status");
  stat_div.innerHTML = status;
}

function onLogin() {
  var username = document.getElementById("input_username").value;

  var looks = document.getElementsByName('look');
  var look;
  for (var i = 0; i < looks.length; i++) {
    if (looks[i].checked) {
        look = looks[i].value;
    }
  }
  Game.queueLogin(username, look);
}

function onChatSubmit() {
  var chat_text = document.getElementById("input_chat").value;
  document.getElementById("input_chat").value = "";
  Game.requestChat(chat_text);
}

function showBox() {
  var main_wrapper = document.getElementById("main_wrapper");
  main_wrapper.style.display = 'block';

  var chat_container = document.getElementById("chat_container");
  chat_container.style.display = 'none';
}

function closeBox() {
  var main_wrapper = document.getElementById("main_wrapper");
  main_wrapper.style.display = 'none';

  var chat_container = document.getElementById("chat_container");
  chat_container.style.display = 'block';
}

Game.run = function(canvas) {
  this.canvas = canvas;
  this.ctx = this.canvas.getContext('2d');

  this.auxCanvas = document.createElement('canvas');
  this.auxCanvas.style.display = 'none';
  this.auxCtx = this.auxCanvas.getContext('2d');

  this._previousElapsed = 0;
  this.queuedLogin = false;
  this.onResize();
  this.tryConnect();
  window.requestAnimationFrame(this.tick);
}.bind(Game);

Game.tryConnect = function() {
  this.connection = new Connection(this);
  updateStatus("Connecting to server...");
}.bind(Game);

Game.draw = function() {
  this.ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

  this.auxCtx.fillStyle = 'rgba(0, 0, 0, 1)';
  this.auxCtx.fillRect(0, 0, this.auxCanvas.width, this.auxCanvas.height);

  if (this.currentRoom != null && this.currentRoom.ready) {
    this.currentRoom.draw();
  }
}.bind(Game);

Game.tick = function(elapsed) {
  window.requestAnimationFrame(this.tick);
  var delta = (elapsed - this._previousElapsed);
  //delta = Math.min(delta, 0.25); // maximum delta of 250 ms
  this._previousElapsed = elapsed;

  if (this.currentRoom != null && this.currentRoom.ready) {
    this.currentRoom.tick(delta);
  }
  this.draw();
}.bind(Game);

Game.queueLogin = function(username, look) {
  this.username = username;
  this.look = look;

  if (this.communication != null) {
    this.doLogin(username, look);
  } else {
    this.queuedLogin = true;
    this.tryConnect();
  }
};

Game.requestChat = function(chat) {
  if (this.currentRoom != null && this.currentRoom.ready) {
    this.communication.requestChat(chat);
  }
};

Game.doLogin = function(username, look) {
  if (this.communication != null) {
    this.communication.doLogin(username, look);
  }
};

Game.onLoggedIn = function() {
  console.log("Logged in!");
  closeBox();
  this.communication.requestMap();
};

Game.setMap = function(cols, rows, doorX, doorY, heightmap) {
  this.currentRoom = new Room(cols, rows, doorX, doorY, heightmap, this);
  this.currentRoom.prepare().then(function () {
    console.log("Room loaded");
  }).catch(function (err) {
    console.log("Fail: " + err);
  });
}.bind(Game);

Game.handleConnectionError = function() {
  console.log("Connection fail");
  updateStatus("Can't connect to server :'(");
  showBox();
};

Game.handleOpenConnection = function() {
  console.log("Connection is open");
  updateStatus("Connected to server!");
  this.communication = new Communication(this);
  if (this.queuedLogin) {
    this.doLogin(this.username, this.look);
  }
  this.queuedLogin = false;
};

Game.handleMessage = function(data) {
  this.communication.handleMessage(data);
};

Game.handleClosedConnection = function() {
  this.currentRoom = null;
  this.communication = null;
  console.log("Connection is closed");
  updateStatus("Lost connection!");
  showBox();
};

Game.onMouseMove = function(x, y, isDrag) {
  if (this.currentRoom != null && this.currentRoom.ready) {
    this.currentRoom.onMouseMove(x, y, isDrag);
  }
}.bind(Game);

Game.onMouseClick = function(x, y) {
  if (this.currentRoom != null && this.currentRoom.ready) {
    this.currentRoom.onMouseClick(x, y);
  }
}.bind(Game);

Game.onResize = function() {
  this.canvas.width = window.innerWidth;
  this.canvas.height = window.innerHeight;

  this.auxCanvas.width = window.innerWidth;
  this.auxCanvas.height = window.innerHeight;
  if (this.currentRoom != null) {
    this.currentRoom.onResize();
  }
}.bind(Game);

window.onload = function () {
  var canvas = document.querySelector('canvas');
  Game.run(canvas);

  var isDrag = false;
    canvas.addEventListener('mousemove', function(evt) {
      var rect = canvas.getBoundingClientRect();
      var x = evt.clientX - rect.left;
      var y = evt.clientY - rect.top;
      Game.onMouseMove(x, y, isDrag);
    }, false);
    canvas.addEventListener('click', function(evt) {
      var rect = canvas.getBoundingClientRect();
      var x = evt.clientX - rect.left;
      var y = evt.clientY - rect.top;
      Game.onMouseClick(x, y);
    }, false);

    canvas.addEventListener('mousedown', function(evt) {
      isDrag = true;
    }, false);

    canvas.addEventListener('mouseup', function(evt) {
      isDrag = false;
    }, false);

    window.addEventListener('resize', function(evt) {
      Game.onResize();
    }, false);
};

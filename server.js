var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var d20 = require('d20');

var LONGPOLLING_TOTAL_WAIT = 280000; //less than 5 minutes
var LONGPOLLLING_DELAY_STATUSES = 200; //in ms
var LONGPOLLLING_DELAY_MESSAGES = 50; //in ms

var games = {};

function getGame(request, response) {
  // var name = request.headers.host;
  var name = request.query.gameid;
  if (games[name]) {
    return games[name];
  }
  games[name] = {
    id: getRandomId(),
    banned_ipaddresses: [],
    messages: [],
    players: []
  };
}

var app = express();
app.use(bodyParser.json())
app.use(cookieParser())
app.use(express.static('public'));

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/public/index.html');
});


app.get("/api/name", function (request, response) {
  var currentPlayer = getCurrentPlayer(request, response);
  var currentPlayerName = currentPlayer.name[currentPlayer.name.length - 1].value;
  response.send({'name': currentPlayerName})
});

app.post("/api/name", function (request, response) {
  var newname = request.body.name;
  if (newname.length < 1) return response.send({errors: ['Your name cannot be blank']});
  
  var doesexist = false;
  
  getGame(request, response).players.forEach(function(player) {
    var playername = player.name[player.name.length - 1].value
    
    if (newname == playername) doesexist = true;
  });
  
  if (doesexist) {
    return response.send({errors: ['This name is already in use']});
  }
  
  var currentplayer = getCurrentPlayer(request, response);
  var oldname = currentplayer.name[currentplayer.name.length - 1].value;
  currentplayer.name.push({'time': getNow(), 'value': newname});
  
  
  getGame(request, response).messages.push({
    'name': '',
    'message': oldname + " is now known as " + newname,
    'time': getNow(),
    'sender': 0
  });
  
  response.send({errors: []});
});


app.get("/api/statuses", function (request, response) {
  var laststatusescount = parseInt(request.query.laststatusescount);
  var game = getGame(request, response);
  stallOrSendStatuses(game, request, response, laststatusescount, LONGPOLLING_TOTAL_WAIT);
});

app.post("/api/statuses", function (request, response) {
  
  var currentPlayer = getCurrentPlayer(request, response);
  currentPlayer.status.push({
    time: getNow(),
    value: request.body.text
  });
  
  response.sendStatus(200);
});

function getNumberOfStatuses(game) {
  return game.players.reduce(function(prev, player) {
    return prev + player.status.length;
  }, 0);
}


function stallOrSendStatuses(game, request, response, laststatusescount, timeleft) {
  var currentstatusescount = getNumberOfStatuses(game);
  if (laststatusescount >= currentstatusescount && timeleft > 0) {
    setTimeout(function() {
      stallOrSendStatuses(game, request, response, laststatusescount, timeleft - LONGPOLLLING_DELAY_STATUSES);
    }, LONGPOLLLING_DELAY_STATUSES);
  }
  else {
    sendStatuses(game, request, response);
  }
}

function sendStatuses(game, request, response) {
  var statuses = [];
  getGame(request, response).players.forEach(function(player) {
    statuses.push({'text': player.status[player.status.length - 1].value, 'name': player.name[player.name.length - 1].value});
  });
  response.send({statuses: statuses, laststatusescount: getNumberOfStatuses(game)});
}


app.get("/api/messages", function (request, response) {
  var lastmessage = parseInt(request.query.lastmessage);
  
  var game = getGame(request, response);
  stallOrSendRecentMessage(game, response, lastmessage, LONGPOLLING_TOTAL_WAIT);
});

function stallOrSendRecentMessage(game, response, lastmessagenumber, timeleft) {
  if (lastmessagenumber >= game.messages.length && timeleft > 0) {
    setTimeout(function() {
      stallOrSendRecentMessage(game, response, lastmessagenumber, timeleft - LONGPOLLLING_DELAY_MESSAGES);
    }, LONGPOLLLING_DELAY_MESSAGES)
  }
  else {
    sendRecentMessages(game, response, lastmessagenumber);
  }
}

function sendRecentMessages(game, response, lastmessagenumber) {
  response.send(
    game.messages.slice(lastmessagenumber, lastmessagenumber + 10).map(function(message) {
      var name = "";
      if (message.name.length > 0) {
        name = "**" + message.name + "** - "
      }
      return name + message.time.substring(11, 16) + "\n\n" + message.message + "\n\n---\n";
    })
  );
}

app.post("/api/messages", function (request, response) {  
  var currentPlayer = getCurrentPlayer(request, response);
  var currentPlayerName = currentPlayer.name[currentPlayer.name.length - 1].value;
  getGame(request, response).messages.push({
    'name': currentPlayerName,
    'message': request.body.message,
    'time': getNow(),
    'sender': currentPlayer.id
  });
  
  if (request.body.message.toLowerCase().substring(0, 6) == "/roll ") {
    var rollmsg = request.body.message.substring(6);
    var roll = d20.roll(rollmsg, true);
    if (roll.length > 0) {
      var sum = roll.reduce(function(a, b) {return a+b}, 0);
      getGame(request, response).messages.push({
        'name': '/roll',
        'message': rollmsg + ": " + JSON.stringify(roll) + " - **" + sum + "**",
        'time': getNow(),
        'sender': 0
      });
    }
  }
  
  response.sendStatus(200);
});
  
function getCurrentPlayer(request, response) {
  var game = getGame(request, response);
  var sessionid = request.cookies['sessionid' + game.id];
  if (sessionid) {
    
    var returnplayer = null;
    game.players.forEach(function(player) {
      if (player.sessionid == sessionid) returnplayer = player;
    });
    if (returnplayer) {
      return returnplayer;
    }
  }
  
  sessionid = getRandomId();
    response.cookie('sessionid' + game.id, sessionid);
    var newplayer = 
    {
      name: [{time: getNow(), value: 'New Player #' + Math.floor(Math.random() * 10000)}],
      id: game.players.length + 1,
      sessionid: sessionid,
      ipaddress: request.headers['x-forwarded-for'] || request.connection.remoteAddress,
      status: [{time: getNow(), value: ''}]
    };
    game.players.push(newplayer);
    return newplayer;
  
}

function getRandomId() {
  return Math.floor(Math.random() * 1000000000000);
}
  
function getNow() {
  return (new Date()).toISOString();
}

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

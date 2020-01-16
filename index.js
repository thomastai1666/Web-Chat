var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var nametosocket = {};
var sockettoname = {};
var today = new Date();
var groupchatid = 1;

//Static resources get routed to public folder
app.use(express.static(path.join(__dirname, 'public')));

http.listen(3000, function(){
  console.log('listening on *:3000');
});

io.on('connection', function(socket){

  //Message to global chat from client
  socket.on('chat message', function(msg){
    // console.log("EVENT: Chat message sent");
    var name = sockettoname[socket.id];
    io.emit('chat message', {clientname: name, message: name + ": " +msg});
  });

  //Private message from client
  socket.on('private message', function(data){
    // console.log("EVENT: Private message received");
    var mytarget = data.target;
    var mymessage = data.message;
    var tosocket = nametosocket[mytarget];
    var sender = sockettoname[socket.id];
    console.log(tosocket);
     io.to(tosocket).emit("private message", {target: sender, message: mymessage});
  });

  //Login request from client
  socket.on('login', function(name){
    //username taken
    if (name in nametosocket) {
      socket.emit('loginfail', name);
      // console.log("EVENT: Client duplicate login" );
    }
    //check on server side for invalid username
    else if (!(/^[a-zA-Z]+$/.test(name))){
      socket.emit('logininvalid', name);
      // console.log("EVENT: Client with invalid name ");
    }
    else if (name.length > 15){
      socket.emit('logininvalid', name);
      // console.log("EVENT: Client with name over character limit");
    }
    //username available
    else{
      console.log("EVENT: Client login ok")
      socket.emit('loginok', name);
      socket.emit('userlist', Object.keys(nametosocket));
      io.emit('user add', name);

      io.emit('chat message', {clientname: name, message: name + " joined the chat"});
      nametosocket[name] = socket.id;
      sockettoname[socket.id] = name;
      console.log(nametosocket);
    }

    // Create groupchat
    socket.on('create chatroom', function(data){
      // groupchats[groupchatid] = [sockettoname[socket.id]];
      // console.log(groupchats);
      console.log(data);
      if(data != null && data.users != null){
      var users = data.users;
      users.push(sockettoname[socket.id]);
      for(var x = 0; x < users.length; x++){
          var socketid = nametosocket[users[x]];
          io.to(socketid).emit("confirmgroup", {id: groupchatid, names: users});
      }
      groupchatid += 1;
      }
    });

    socket.on('update groups', function(){
      console.log(io.sockets.adapter.rooms);
      var activeids = []
      for(var x = 0; x < groupchatid+1; x++){
        if(io.sockets.adapter.rooms[x] != null){
          activeids.push(x);
        }
      }
      console.log(activeids);
      socket.emit('update return', {ids: activeids})
    });

    socket.on('joinroom', function(room) {
    console.log('joining room', room);
    socket.join(room);
    });

    socket.on('send message', function(data) {
    console.log(data);
    socket.broadcast.to(data.room).emit('groupchatmsg', {
        target: data.room,
        sender: sockettoname[socket.id],
        message: data.message});
    });

  });

  //On user disconnect, cleanup dictionary
  socket.on('disconnect', function(){
    var name = sockettoname[socket.id];
    delete(sockettoname[socket.id]);
    delete(nametosocket[name]);
    if(name != undefined){
      io.emit('user disconnect', name);
      io.emit('chat message', {name: name, message: name + " left the chat."});
    }
    // updateUserList();
  });

});

function updateUserList(){
  io.emit('userlist', Object.keys(nametosocket));
}

function getTimeStamp(){
  return today.getHours() + ":" + today.getMinutes();
}

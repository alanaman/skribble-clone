var express = require('express');
var socket = require('socket.io')
//App setup
var app = express();
var server = app.listen(3999, function(){
    console.log('listening to port');
});

//static files
app.use(express.static('public'));

// Socket setup


const io = require('socket.io')(server, {
    cors: {
      origin: '*',
    }
  });

// const io = socket(server);

//data declaration
players=[];
rooms = [];


io.on('connection', function(socket){
    console.log('connection to '+ socket.id);
    socket.on('new_player',function(data){
        if(players.includes(data.username)){
            io.to(socket.id).emit('validation',{success: false});
        }
        else{
            players.push(data.username);
            console.log("added "+data.username);
            io.to(socket.id).emit('validation',{success: true, rooms: rooms});
        }
    });
    socket.on('new_room',function(data){
        if(rooms.includes(data.roomname)){
            io.to(socket.id).emit('room_valid',{success: false});
        }
        else{
            rooms.push(data.roomname);
            socket.join(data.roomname);
            console.log("added room "+data.roomname);
            io.to(socket.id).emit('room_valid',{success: true, myroom: data.roomname});
            io.emit('room_added',{room : data.roomname});
        }
    });
    socket.on("join_room",function(data) {
        console.log(data.room,rooms[data.room],rooms);
        if(rooms[data.room]==null){
            io.to(socket.id).emit('join_room_valid',{success: false});
            // console.log("Not this one");
        }
        else {
            socket.join(data.roomname);
            io.to(socket.id).emit('join_room_valid',{success: true, myroom: data.roomname});
            io.to(data.roomname).emit('chat-msg',{user: socket.id,msg : "Joined the room"});
        }
    })
});

// io.sockets.on('connection',function (socket) {
//     socket.on('create',function (room) {
//         // console.log("room joined "+room);
//         socket.join(room);
//     })
// })
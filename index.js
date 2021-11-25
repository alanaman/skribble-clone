var express = require('express');
var socket = require('socket.io');
var fs = require('fs');
//App setup
var app = express();
var server = app.listen(3999, function(){
    // console.log('listening to port');
});

function rand_word(word_list, n){
    for(let i=0; i<n; i++){
        var r = Math.floor(Math.random() * (word_list.length-i)) + i;
        var temp = word_list[i];
        word_list[i] = word_list[r];
        word_list[r] = temp;
    }
    return word_list.slice(0,n); 
}


var words;

fs.readFile('public/wordlist.txt','utf8', function(err,data){
    if(err) throw err;
    words = data.split('\n');
    console.log(rand_word(words,3));
})
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
players={};
p_rooms={};
rooms = [];
count = {};

var active = {};
var init_time = {};
var now = new Date();


io.on('connection', function(socket){
    // console.log('connection to '+ socket.id);
    socket.on('new_player',function(data){
        if(Object.values(players).includes(data.username)){
            io.to(socket.id).emit('validation',{success: false});
        }
        else{
            players[socket.id]=data.username;
            // console.log("added "+data.username);
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
            count[data.roomname] = 1;
            p_rooms[socket.id]=data.roomname;
            // console.log("added room "+data.roomname);
            io.to(socket.id).emit('room_valid',{success: true, myroom: data.roomname});
            io.emit('room_added',{room : data.roomname});
            io.to(data.roomname).emit('chat-msg',{user: players[socket.id],msg : "You joined the room"});
        }
    });
    socket.on("join_room",function(data) {
        if(!rooms.includes(data.room)){
            io.to(socket.id).emit('room_valid',{success: false});
            // console.log("Not this one");
        }
        else {
            socket.join(data.room);
            count[data.room] += 1;
            p_rooms[socket.id]=data.room;
            io.to(socket.id).emit('room_valid',{success: true, user: socket.id,msg : "Joined the room"});
            io.to(data.room).emit('chat-msg',{user: players[socket.id],msg : "Joined the room"});
        }
    })

    socket.on("chat-msg",function(data) {
        io.to(p_rooms[socket.id]).emit("chat-msg",{user: players[socket.id],msg : data.msg})
    })

    socket.on("draw",function(data){
        io.to(p_rooms[socket.id]).emit("draw",data)
    })

    socket.on("clear",function(){
        io.to(p_rooms[socket.id]).emit("clear")
    })

    socket.on('disconnect',()=>{
        if(socket.to(p_rooms[socket.id])!=null){
        socket.to(p_rooms[socket.id]).emit('chat-msg',{user: players[socket.id],msg : "Disconnected"});
        }
        count[p_rooms[socket.id]] -= 1;
        if(count[p_rooms[socket.id]]==0) delete rooms[rooms.indexOf(p_rooms[socket.id])];
        refine_rooms();
        delete players[socket.id];
    })
});

function refine_rooms() {
    for(i in rooms){
        if(rooms[i]==null){
            rooms[i]=rooms[i+1];
            rooms[i+1]=null;
        }
    }
}
// io.sockets.on('connection',function (socket) {
//     socket.on('create',function (room) {
//         // console.log("room joined "+room);
//         socket.join(room);
//     })
// })
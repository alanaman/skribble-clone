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
players={};             //socket.id -> username map
p_rooms={};             //socket.id -> room joined map
public_rooms = [];      //list of all public rooms
private_rooms = [];      //list of all private rooms
count = {};             //room -> count of players in that room map
room_keys = {};         //key of room if private , null otherwise

var active = {};
var init_time = {};
var now = new Date();


io.on('connection', function(socket){
    // console.log('connection to '+ socket.id);
    socket.on('new_player',function(data){
        if(Object.values(players).includes(data.username)){
            io.to(socket.id).emit('validation',{success: false});
            // console.log("cvbinuo");
        }
        else{
            players[socket.id]=data.username;
            // console.log("added "+data.username);
            io.to(socket.id).emit('validation',{success: true, rooms: public_rooms});
        }
    });
    socket.on('new_room',function(data){
        if(public_rooms.includes(data.roomname) || private_rooms.includes(data.roomname)){
            io.to(socket.id).emit('room_valid',{success: false});
        }
        else{
            if(data.room_key===null)
            {
                public_rooms.push(data.roomname);
            }else{
                private_rooms.push(data.roomname);
            }
            socket.join(data.roomname);
            count[data.roomname] = 1;
            room_keys[data.roomname] = data.room_key;
            p_rooms[socket.id]=data.roomname;
            // console.log("added room "+data.roomname);
            io.to(socket.id).emit('room_valid',{success: true, myroom: data.roomname});
            io.emit('room_added',{room : data.roomname});
            io.to(data.roomname).emit('chat-msg',{user: players[socket.id],msg : "You joined the room"});
        }
    });
    socket.on("join_room",function(data) {
        if(!public_rooms.includes(data.room) && !private_rooms.includes(data.room)){
            io.to(socket.id).emit('room_valid',{success: false,msg: "no such room"});
            // console.log("Not this one");
        }
        else if(public_rooms.includes(data.room)){
            socket.join(data.room);
            count[data.room] += 1;
            p_rooms[socket.id]=data.room;
            io.to(socket.id).emit('room_valid',{success: true, user: socket.id,msg : "Joined the room"});
            io.to(data.room).emit('chat-msg',{user: players[socket.id],msg : "Joined the room"});
        }
        else if(room_keys[data.room]!==data.key){
            io.to(socket.id).emit('room_valid',{success: false,msg: "incorrect key"});
        }else{
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
        if(public_rooms.includes(p_rooms[socket.id])){
            if(count[p_rooms[socket.id]]==0) delete public_rooms[public_rooms.indexOf(p_rooms[socket.id])];
        }else if(private_rooms.includes(p_rooms[socket.id])){
            if(count[p_rooms[socket.id]]==0) delete private_rooms[private_rooms.indexOf(p_rooms[socket.id])];
        }
        refine_rooms();
        delete players[socket.id];
    })
});

function refine_rooms() {
    for(i in public_rooms){
        if(public_rooms[i]==null){
            public_rooms[i]=public_rooms[i+1];
            public_rooms[i+1]=null;
        }
    }
    for(i in private_rooms){
        if(private_rooms[i]==null){
            private_rooms[i]=private_rooms[i+1];
            private_rooms[i+1]=null;
        }
    }
}
// io.sockets.on('connection',function (socket) {
//     socket.on('create',function (room) {
//         // console.log("room joined "+room);
//         socket.join(room);
//     })
// })
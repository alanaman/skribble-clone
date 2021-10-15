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
var io = socket(server);

//data declaration
players=[];



io.on('connection', function(socket){
    console.log('connection to'+ socket.id);
    socket.on('new_player',function(data){
        if(players.includes(data.username)){
            io.to(socket.id).emit('validation',{success: false});
        }
        else{
            players.push(data.username);
            console.log("added "+data.username);
            io.to(socket.id).emit('validation',{success: true});
        }
    });
});


var express = require('express');
var socket = require('socket.io');
var fs = require('fs');
const nodemon = require('nodemon');
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

fs.readFile('wordlist.txt','utf8', function(err,data){
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
  
//data declaration
players={};             //socket.id -> username map
p_rooms={};             //socket.id -> room joined map
public_rooms = [];      //list of all public rooms
private_rooms = [];      //list of all private rooms
count = {};             //room -> count of players in that room map
room_keys = {};         //key of room if private , null otherwise
players_in_a_room = {}; //room to player mapping
creator_room = {};      //room to creator mapping
started = {};           //game started in a room or not
game_state = {};        //state of a started game
scores = {};            //socket.id -> scores mapping
guess_count = {};

var active = {};
var init_time = {};
var now = new Date();



io.on('connection', function(socket){
    socket.on('new_player',function(data){
        if(Object.values(players).includes(data.username)){
            io.to(socket.id).emit('validation',{success: false});
        }
        else{
            players[socket.id]=data.username;
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
            players_in_a_room[data.roomname]=[];
            players_in_a_room[data.roomname].push(players[socket.id]);
            socket.join(data.roomname);
            count[data.roomname] = 1;
            room_keys[data.roomname] = data.room_key;
            creator_room[data.roomname]=players[socket.id];
            p_rooms[socket.id]=data.roomname;
            scores[players[socket.id]] = [0,0,0];
            started[p_rooms[socket.id]]=false;
            guess_count[data.roomname] = 0;
            io.to(socket.id).emit('room_valid',{success: true, myroom: data.roomname});
            io.emit('room_added',{room : data.roomname});
            io.to(data.roomname).emit('chat-msg',{user: players[socket.id],msg : "You joined the room"});
            io.to(data.roomname).emit('players_list_update',{players : players_in_a_room[data.roomname],count : count[data.roomname]});
        }
    });
    socket.on("join_room",function(data) {
        if(!public_rooms.includes(data.room) && !private_rooms.includes(data.room)){
            io.to(socket.id).emit('room_valid',{success: false,msg: "no such room"});
        }
        else if(public_rooms.includes(data.room)){
            socket.join(data.room);
            count[data.room] += 1;
            p_rooms[socket.id]=data.room;
            scores[players[socket.id]] = [0,0,0];
            players_in_a_room[data.room].push(players[socket.id]);
            if(started[data.room]){
                io.to(socket.id).emit('room_valid',{success: true, user: socket.id,msg : "Joined the room",started: started[data.room],action: game_state[p_rooms[socket.id]].action});
            }
            else{
                io.to(socket.id).emit('room_valid',{success: true, user: socket.id,msg : "Joined the room",started: false,action: null});
            }
            io.to(data.room).emit('chat-msg',{user: players[socket.id],msg : "Joined the room"});
            io.to(data.room).emit('players_list_update',{players : players_in_a_room[data.room],count : count[data.room]});
        }
        else if(room_keys[data.room]!==data.key){
            io.to(socket.id).emit('room_valid',{success: false,msg: "incorrect key"});
        }
        else{
            socket.join(data.room);
            count[data.room] += 1;
            p_rooms[socket.id]=data.room;
            players_in_a_room[data.room].push(players[socket.id]);
            if(started[data.room]){
                io.to(socket.id).emit('room_valid',{success: true, user: socket.id,msg : "Joined the room",started: started[data.room],action: game_state[p_rooms[socket.id]].action});
            }
            else{
                io.to(socket.id).emit('room_valid',{success: true, user: socket.id,msg : "Joined the room",started: false,action: null});
            }
            io.to(data.room).emit('chat-msg',{user: players[socket.id],msg : "Joined the room"});
            io.to(data.room).emit('players_list_update',{players : players_in_a_room[data.room],count : count[data.room]});
        }
    });

    socket.on("chat-msg",function(data) {
        if(players_in_a_room[p_rooms[socket.id]][game_state[p_rooms[socket.id]].artist_index]!==players[socket.id]){
            if(game_state[p_rooms[socket.id]].words==(data.msg)){
                io.to(p_rooms[socket.id]).emit("chat-msg",{user: players[socket.id],msg : players[socket.id] + " guessed correctly"});
                if(scores[players[socket.id]][game_state[p_rooms[socket.id]].round - 1]==0){
                    scores[players[socket.id]][game_state[p_rooms[socket.id]].round-1]+=10;
                    guess_count[p_rooms[socket.id]]+=1;
                }
            }
            else io.to(p_rooms[socket.id]).emit("chat-msg",{user: players[socket.id],msg : data.msg});
            // console.log(game_state[p_rooms[socket.id]].words);
        }
    });

    socket.on("draw",function(data){
        if(players_in_a_room[p_rooms[socket.id]][game_state[p_rooms[socket.id]].artist_index]==players[socket.id]) io.to(p_rooms[socket.id]).emit("draw",data);
    });

    socket.on("clear",function(){
        if(players_in_a_room[game_state[p_rooms[socket.id]].artist_index]==players[socket.id]) io.to(p_rooms[socket.id]).emit("clear")
    });
    
    socket.on('start_game',function(){
        if(players[socket.id]==creator_room[p_rooms[socket.id]]){
            io.to(p_rooms[socket.id]).emit("start");
            console.log("reached");
            started[p_rooms[socket.id]]=true;
            let curr_PIR = players_in_a_room[p_rooms[socket.id]];   //PIR:People In Room
            game_state[p_rooms[socket.id]] = {round: 1,action: "choosing",curr_PIR: curr_PIR,words: rand_word(words,3),artist_index: 0};
            io.to(p_rooms[socket.id]).emit("game_state",{round: 1,action: "choosing",curr_PIR: curr_PIR,words: game_state[p_rooms[socket.id]].words,artist_index: 0});
            setTimeout(function(data){
                if(typeof game_state[p_rooms[socket.id]].words !== typeof "kk"){
                    game_state[p_rooms[socket.id]].words = game_state[p_rooms[socket.id]].words[Math.floor(3*Math.random)];
                    io.to(socket.id).emit("erase_choices",{round: data.round,action: "drawing",curr_PIR: data.curr_PIR,words: data.words,artist_index: data.artist_index});
                    io.to(p_rooms[socket.id]).emit("game_state",{round: game_state[p_rooms[socket.id]].round,action: "drawing",curr_PIR: curr_PIR,words: game_state[p_rooms[socket.id]].words,artist_index: 0});
                    io.to(p_rooms[socket.id]).emit("clock_start",{cur_time: new Date().getTime()});
                 
                }
            },10000,game_state[p_rooms[socket.id]]);
        }
    });

    socket.on('chosen',function(data){
        console.log(data);
        game_state[p_rooms[socket.id]] = data;
        io.to(p_rooms[socket.id]).emit("game_state",{round: data.round,action: "drawing",curr_PIR: data.curr_PIR,words: data.words,artist_index: data.artist_index});
        io.to(p_rooms[socket.id]).emit("clock_start",{cur_time: new Date().getTime()});
        setTimeout(function(){
            scores[players_in_a_room[p_rooms[socket.id]][data.artist_index]][data.round-1] = guess_count[p_rooms[socket.id]]*10/count[p_rooms[socket.id]];
            guess_count[p_rooms[socket.id]] = 0;
           if(data.curr_PIR.length>(data.artist_index+1)){
            game_state[p_rooms[socket.id]]={round: data.round,action: "choosing",curr_PIR: data.curr_PIR,words: rand_word(words,3),artist_index: data.artist_index+1};
            io.to(p_rooms[socket.id]).emit("game_state",{round: data.round,action: "choosing",curr_PIR: data.curr_PIR,words: game_state[p_rooms[socket.id]].words,artist_index: data.artist_index+1});
            setTimeout(function(data){
                if(typeof game_state[p_rooms[socket.id]].words !== typeof "kk"){
                    game_state[p_rooms[socket.id]].words = game_state[p_rooms[socket.id]].words[Math.floor(3*Math.random)];
                    io.to(socket.id).emit("erase_choices",{round: data.round,action: "drawing",curr_PIR: data.curr_PIR,words: data.words,artist_index: data.artist_index});
                    io.to(p_rooms[socket.id]).emit("game_state",{round: game_state[p_rooms[socket.id]].round,action: "drawing",curr_PIR: data.curr_PIR,words: game_state[p_rooms[socket.id]].words,artist_index: data.artist_index});
                    io.to(p_rooms[socket.id]).emit("clock_start",{cur_time: new Date().getTime()});
                 
                }
            },10000,game_state[p_rooms[socket.id]]);
        }
           else if(data.round<3){
            game_state[p_rooms[socket.id]]={round: data.round+1,action: "choosing",curr_PIR: players_in_a_room[p_rooms[socket.id]],words: rand_word(words,3),artist_index: 0};
            io.to(p_rooms[socket.id]).emit("game_state",{round: data.round+1,action: "choosing",curr_PIR: players_in_a_room[p_rooms[socket.id]],words: game_state[p_rooms[socket.id]].words,artist_index: 0});
            setTimeout(function(data){
                if(typeof game_state[p_rooms[socket.id]].words !== typeof "kk"){
                    game_state[p_rooms[socket.id]].words = game_state[p_rooms[socket.id]].words[Math.floor(3*Math.random)];
                    io.to(socket.id).emit("erase_choices",{round: data.round,action: "drawing",curr_PIR: data.curr_PIR,words: data.words,artist_index: data.artist_index});
                    io.to(p_rooms[socket.id]).emit("game_state",{round: game_state[p_rooms[socket.id]].round,action: "drawing",curr_PIR: data.curr_PIR,words: game_state[p_rooms[socket.id]].words,artist_index: data.artist_index});
                    io.to(p_rooms[socket.id]).emit("clock_start",{cur_time: new Date().getTime()});
                 
                }
            },10000,game_state[p_rooms[socket.id]]);
        }
           else{
            delete game_state[p_rooms[socket.id]];
            io.to(p_rooms[socket.id]).emit("game_ended",{scores: scores});
           }
        },30000);
    });

    socket.on('clock_started',function(data){
        watch(data.cur_time,30);
    })


    socket.on('disconnect',()=>{
        if(p_rooms[socket.id]!=null){
            const ind =  players_in_a_room[p_rooms[socket.id]].indexOf(players[socket.id]);
            count[p_rooms[socket.id]] -= 1;
            if(ind>-1){
                players_in_a_room[p_rooms[socket.id]].splice(ind,1);
                io.to(p_rooms[socket.id]).emit('players_list_update',{players : players_in_a_room[p_rooms[socket.id]],count : count[p_rooms[socket.id]]});
            }
            socket.to(p_rooms[socket.id]).emit('chat-msg',{user: players[socket.id],msg : "Disconnected"});
        }
        
        if(public_rooms.includes(p_rooms[socket.id])){
            if(count[p_rooms[socket.id]]==0) delete public_rooms[public_rooms.indexOf(p_rooms[socket.id])];
        }else if(private_rooms.includes(p_rooms[socket.id])){
            if(count[p_rooms[socket.id]]==0) delete private_rooms[private_rooms.indexOf(p_rooms[socket.id])];
        }
        refine_rooms();
        if(players[socket.id]==creator_room[p_rooms[socket.id]]&&(count[p_rooms[socket.id]]>0)){
            delete players[socket.id];
            creator_room[p_rooms[socket.id]]=players_in_a_room[p_rooms[socket.id]][0];
        }
        else{
            delete players[socket.id]; 
        }  
    });
    function watch(countDownDate,timer){
      
        // Get today's date and time
        var now = new Date().getTime();
        
        // Find the distance between now and the count down date
        var distance = now - countDownDate;
        
        // Time calculations for days, hours, minutes and seconds
        
        var seconds = 30 - Math.floor((distance % (1000 * 60)) / 1000);
        if(seconds>0) setTimeout(watch,1000,countDownDate,timer-1);
        // console.log(typeof seconds);
        // Display the result in the element with id="demo"
        // document.getElementById("timer").innerText =  seconds + "s ";
        io.to(p_rooms[socket.id]).emit('clock_tick',{sec: seconds});
        // console.log(seconds);
      
        // If the count down is finished, write some text
        // if (distance < 0) {
        //   clearInterval(T);
        //   document.getElementById("timer").innerHTML = "EXPIRED";
        // }
      }
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

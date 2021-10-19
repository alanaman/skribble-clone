var socket = io.connect('http://localhost:3999')
var username = document.getElementById('username'),
    reg_btn = document.getElementById('register'),
    room_error = document.getElementById("room_error"),
    create_btn = document.getElementById("create_room_"),
    roomname = document.getElementById("roomname");
    join_btn = document.getElementById("room_join"),
    join_name = document.getElementById("rooms");

// emit eventss

reg_btn.addEventListener('click', function(){
  let str=username.value;
  str=str.trim();
  if(str==""){
    name_error.innerText="Name must be non empty";
  }
  else{
    socket.emit('new_player',{username: username.value});
  }
});

create_btn.addEventListener('click', function(){
  let str=roomname.value;
  str=str.trim();
  if(str==""){
    room_error.innerText="Room name must be non empty";
  }
  else{
    // room_name = roomname.value;
    socket.emit('new_room',{roomname: roomname.value});
  }
});

join_btn.addEventListener('click',function() {
  let str=join_name.value;
  console.log(str);
  str=str.trim();
  if(str==""){
    room_error.innerText="Room name must be non empty";
  }
  else{
    socket.emit('join_room',{room: join_name.value});
  }
})


socket.on('validation',function(data){
  if(data.success){
    let reg_wind = document.getElementById("register_window");
    let profile_wind = document.getElementById("user_prof");
    let create_room_wind = document.getElementById("create_room");
    let join_room_wind = document.getElementById("join_room");
    let name_disp = document.getElementById("name_display");
    let room_list = document.getElementById("rooms");
    let room_div = document.getElementById("room_list")
    name_disp.innerText=username.value;
    reg_wind.style.display = "none";
    profile_wind.style.display = "block";
    create_room_wind.style.display = "block";
    join_room_wind.style.display = "block";
    room_div.style.display = "block";
    for(room in data.rooms){
      opt = document.createElement("option");
      // btn.id = "join_room";
      opt.innerText = data.rooms[room];
      room_list.appendChild(opt);
    }
  }
  else{
    name_error.innerText="Name already taken";
  }
});

socket.on('room_valid',function(data){
  if(data.success){
    room_name = data.myroom;
    let reg_wind = document.getElementById("register_window");
    let profile_wind = document.getElementById("user_prof");
    let create_room_wind = document.getElementById("create_room");
    let join_room_wind = document.getElementById("join_room");
    let name_disp = document.getElementById("name_display");
    let room_div = document.getElementById("room_list")
    name_disp.innerText=username.value;
    reg_wind.style.display = "none";
    profile_wind.style.display = "block";
    create_room_wind.style.display = "none";
    join_room_wind.style.display = "block";
    room_div.style.display = "none";
    console.log("room created ")
  }
  else{
    room_error.innerText="Name already taken";
  }
});

socket.on('room_added',function(data) {
  let room_list = document.getElementById("rooms");
  opt = document.createElement("option");
  // btn.id = "join_room";
  opt.innerText = data.room;
  room_list.appendChild(opt);
})

socket.on('chat-msg',function(data){
  console.log("Msg received");
  let msg_div = document.getElementById("chat");
  let msg_elem = document.createElement("p");
  msg_elem.innerText = `${data.user}: ${data.msg}`;
  msg_div.appendChild(msg_elem);
  console.log("msg processed");
})


// socket.emit('create','room1')
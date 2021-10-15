var socket = io.connect('http://localhost:3999')

var username = document.getElementById('username'),
    reg_btn = document.getElementById('register'),
    room_error = document.getElementById("room_error");

// emit eventss

reg_btn.addEventListener('click', function(){
  let str=username.value;
  str=str.trim();
  if(str==""){
    room_error.innerText="Name must be non empty";
  }
  else{
    socket.emit('new_player',{username: username.value});
  }
});

socket.on('validation',function(data){
  if(data.success){
    let reg_wind = document.getElementById("register_window");
    let profile_wind = document.getElementById("user_prof");
    let create_room_wind = document.getElementById("create_room");
    let join_room_wind = document.getElementById("join_room");
    let name_disp = document.getElementById("name_display");
    name_disp.innerText=username.value;
    reg_wind.style.display = "none";
    profile_wind.style.display = "block";
    create_room_wind.style.display = "block";
    join_room_wind.style.display = "block";
  }
  else{
    room_error.innerText="Name already taken";
  }
});
var socket = io.connect('http://localhost:3999')
var username = document.getElementById('username'),
    reg_btn = document.getElementById('register'),
    room_error = document.getElementById("room_error"),
    create_btn = document.getElementById("create_room_"),
    roomname = document.getElementById("roomname"),
    join_btn = document.getElementById("room_join"),
    join_name = document.getElementById("rooms"),
    chat_div = document.getElementById("chat"),
    chat_box = document.getElementById("chat-box"),
    drawing_div = document.getElementById("drawing-board");
    palette_div =document.getElementById("palette")
const myPics = document.getElementById('myPics');
const context = myPics.getContext('2d');
   

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
  // console.log(str);
  str=str.trim();
  if(str==""){
    room_error.innerText="Room name must be non empty";
  }
  else{
    socket.emit('join_room',{room: join_name.value});
  }
})



chat_box.children[1].addEventListener('click',function() {
  let str=chat_box.children[0].value;
  // console.log(str);
  str=str.trim();
  if(str==""){
    room_error.innerText="Msg must be non empty";
  }
  else{
    socket.emit('chat-msg',{msg: chat_box.children[0].value});
    chat_box.children[0].value="";
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
    let chat_div = document.getElementById("chat");
    let chat_box = document.getElementById("chat-box");
    let drawing_div = document.getElementById("drawing-board");
    // let room_head = document.getElementById("room_name");
    chat_div.style.display = "block";
    chat_box.style.display = "block";
    name_disp.innerText=username.value;
    reg_wind.style.display = "none";
    profile_wind.style.display = "block";
    create_room_wind.style.display = "none";
    join_room_wind.style.display = "block";
    room_div.style.display = "none";
    drawing_div.style.display = "block";
    palette_div.style.display = "block";
    // room_head.innerText = `Room: ${room_name}`;
    // console.log("room created ")
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
  // console.log("Msg received");
  let msg_div = document.getElementById("chat");
  let msg_elem = document.createElement("p");
  msg_elem.innerText = `${data.user}: ${data.msg}`;
  msg_div.appendChild(msg_elem);
  var xH = msg_div.scrollHeight; 
  msg_div.scrollTo(0, xH);
  // console.log("msg processed");
})


// canvas functions:
let isDrawing = false;
let x = 0;
let y = 0;
// event.offsetX, event.offsetY gives the (x,y) offset from the edge of the canvas.

// Add the event listeners for mousedown, mousemove, and mouseup
myPics.addEventListener('mousedown', e => {
  x = e.offsetX;
  y = e.offsetY;
  isDrawing = true;
});

myPics.addEventListener('mousemove', e => {
  if (isDrawing === true) {
    //drawLine(context, x, y, e.offsetX, e.offsetY);
    socket.emit('draw',{x1: x,y1: y,x2: e.offsetX,y2: e.offsetY,draw_color: curr_color,draw_width: curr_width});
    x = e.offsetX;
    y = e.offsetY;
  }
});

window.addEventListener('mouseup', e => {
  if (isDrawing === true) {
    socket.emit('draw',{x1: x,y1: y,x2: e.offsetX,y2: e.offsetY,draw_color: curr_color,draw_width: curr_width});
    x = 0;
    y = 0;
    isDrawing = false;
  }
});

function drawLine(context, x1, y1, x2, y2,C,W) {
  context.beginPath();
  context.strokeStyle = C;
  context.fillStyle= C;
  context.lineWidth = 1;
  let d = Math.floor(Math.sqrt(Math.pow(x1-x2,2)+Math.pow(y1-y2,2)));
  for(let i=0;i<=d;i++){
    context.arc((x1*i+x2*(d-i))/d,(y1*i+y2*(d-i))/d,W,0,2*Math.PI);
  }
  context.fill();
  context.stroke();
  context.closePath();
}

function canvas_clear(){
context.beginPath();
context.rect(0, 0, 700, 500);
context.fillStyle = "white";
context.fill();
}

socket.on('draw',function(data){
   drawLine(context,data.x1,data.y1,data.x2,data.y2,data.draw_color,data.draw_width);
})

socket.on('clear',function(){
  canvas_clear();
})

//choosing colour
let curr_color = 'black';
var red=document.getElementById('red');
    blue=document.getElementById('blue');
    brown=document.getElementById('brown');
    green=document.getElementById('green');
    yellow=document.getElementById('yellow');
    orange=document.getElementById('orange');
    violet=document.getElementById('violet');
    grey=document.getElementById('grey');
    black=document.getElementById('black');
    white=document.getElementById('white');
    slider = document.getElementById('myRange');
    clear_btn=document.getElementById('clear_btn');
let curr_width = 5;
clear_btn.addEventListener('click',function(){
  socket.emit('clear');
});
slider.oninput = function() {
 curr_width = this.value;
}
red.addEventListener('click',function(){
  curr_color='red';
});
blue.addEventListener('click',function(){
  curr_color='blue';
});
green.addEventListener('click',function(){
  curr_color='green';
});
yellow.addEventListener('click',function(){
  curr_color='yellow';
});
orange.addEventListener('click',function(){
  curr_color='orange';
});
brown.addEventListener('click',function(){
  curr_color='brown';
});
grey.addEventListener('click',function(){
  curr_color='grey';
});
violet.addEventListener('click',function(){
  curr_color='violet';
});
black.addEventListener('click',function(){
  curr_color='black';
});
white.addEventListener('click',function(){
  curr_color='white';
});


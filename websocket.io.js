
const fs = require('fs');
const app = require('https').createServer({
  key: fs.readFileSync('./ssl/server-key.pem'),
  cert: fs.readFileSync('./ssl/server-cert.pem'),
  ca: fs.readFileSync('./ssl/ca-cert.pem'),
  passphrase: '123456'
})
const io = require('socket.io')(app);

//在线用户
var onlineUsers = {};
//当前在线人数
var onlineCount = 0;
var roomid = "";
io.on('connection', (socket) => {
  	console.log('user connected', socket.id);
    // io.emit('login', {
    //   type: 'login'
    // });

    socket.on('login', function(data){
      socket.join(data.name, function(){
        console.log(`joined ${data.name}`)
        roomid = data.name;
      });

      let myRoom = io.sockets.adapter.rooms[data.name];
      console.log(myRoom)
      let userCount = Object.keys(myRoom.sockets).length;
      if(userCount < 3 ){
        //将新加入用户的唯一标识当作socket的名称，后面退出的时候会用到
        socket.name = data.name;
    		//检查在线列表，如果不在里面就加入
        // if(!onlineUsers.hasOwnProperty(data.name)) {
          onlineUsers[data.name] = data.name;
          //在线人数+1
          onlineCount++;

          // 向所有客户端广播用户加入
          socket.emit('login', {
            type: 'login',
            name: data.name,
            success: true
          });
        // }
        // else{
        //   io.broadcast.emit('login', {
        //     type: 'login',
        //     success: false
        //   });
        // }
        console.log(`【${data.name}】加入房间`);
      }else{
        io.to(socket.id).emit('error', {
          type: 'error',
          message: '房间人数已满'
        })
      }
    });

    socket.on('userlist', function(){
      //向所有客户端广播
      io.emit('userlist', {
        type: 'userlist',
        list: onlineUsers
      });
    });

    socket.on('offer', function(data){
      // if(onlineUsers.hasOwnProperty(data.name)){
        console.log(`发送 offer 给 【${data.name}】`);
        socket.to(roomid).emit('offer', {
          type: 'offer',
          offer: data.offer,
          name: data.name
        })
      // }else{
      //   console.log(`不存在此用户`);
      //   io.emit('error', {
      //     type: 'error',
      //     message: '不存在此用户'
      //   })
      // }
    });

    socket.on('answer', function(data) {
      // if(onlineUsers.hasOwnProperty(data.name)){
        console.log(`发送 answer 给 【${data.name}】`);
        socket.to(roomid).emit('answer', {
          type: 'answer',
          answer: data.answer
        })
      // }
    });
    socket.on('candidate', function(data) {
      console.log(`发送 candidate 给 【${data.name}】`);
      // if(onlineUsers.hasOwnProperty(data.name)){
        io.emit('candidate', {
          type: 'candidate',
          candidate: data.candidate
        })
      // }
    });

    socket.on('leave', function(data) {
      console.log(`【${data.name}】断开连接，退出房间`);
      // if(onlineUsers.hasOwnProperty(data.name)){

        socket.leave(data.name, function(){
          console.log(`${data.name} leave room`)
        });
        //退出用户的信息
        // var obj = {userid:socket.name, username:onlineUsers[socket.name]};
        //删除
        delete onlineUsers[socket.name];
        //在线人数-1
        onlineCount--;

        socket.emit('leave', {
          type: 'leave',
          name: data.name,
          list: onlineUsers
        })
        io.emit('userlist', {
          list: onlineUsers
        })
      // }
    });

    socket.on('hangup', function(data) {
      console.log(`【${data.name}】 被挂断，结束通话`);
      // if(onlineUsers.hasOwnProperty(socket.name)){
        io.emit('hangup', {
          type: 'hangup',
          name: data.name
        })
      // }

    });

    socket.on('disconnect', function(data) {
      console.log(`socket被挂断`);
      socket.leave(roomid, function(){
        console.log(`${roomid} leave room`)
        io.to(roomid).emit('hangup', {
          type: 'hangup',
          name: roomid
        })
      });

    });
})

app.listen(8888, 'ws.lixuedan.cn', function () {
  console.log('websocket server started: https://ws.lixuedan.cn:8888.....')
})

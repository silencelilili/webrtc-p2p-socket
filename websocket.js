const fs = require('fs');
const https = require('https');
const websocket = require('ws');
// https
const server = new https.createServer({
  key: fs.readFileSync('./ssl/server-key.pem'),
  cert: fs.readFileSync('./ssl/server-cert.pem'),
  ca: fs.readFileSync('./ssl/ca-cert.pem'),
  passphrase: '123456'
});

const wss = new websocket.Server({server});
const users = {};
const usersList = [];


wss.on('connection', function (connection) {
  console.log("连接成功");
  // 消息广播定义
  wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
      // client !== connection ===> 消息广播给除自己外的其他用户.
      if (client.readyState === websocket.OPEN) {
        sendTo(client, data)
      }
    });
  };
  connection.on('message', function (message) {
    var data;
    try {
      data = JSON.parse(message);
    }catch (e) {
      console.log('error parsing JSON');
      data = {};
    }

    switch (data.type) {
      case 'login':
        console.log(`【${data.name}】加入房间 ${data.room}`);
        if(users[data.name]){
          sendTo(connection, {
            type: 'login',
            success: false
          })
        }else{
          users[data.name] = connection;
          connection.name = data.name;
          usersList.push({name: data.name, isonline: 1});
          sendTo(connection, {
            type: 'login',
            name: data.name,
            success: true
          })
        }
        break;
      case 'userlist':
        // 广播消息(不给自己发送广播消息)
        wss.broadcast({
          type: 'userlist',
          list: usersList
        })
        break;
      case 'offer':
        console.log(`发送 offer 给 【${data.name}】`);
        var conn = users[data.name];
        if(conn != null){
          connection.otherName = data.name;
          sendTo(conn, {
            type: 'offer',
            offer: data.offer,
            name: connection.name
          })
        }else{
          sendTo(connection, {
            type: 'error',
            message: '不存在此用户'
          })
        }
        break;
      case 'answer':
        console.log(`发送 answer 给 【${data.name}】`);
        var conn = users[data.name];
        if(conn != null){
          connection.otherName = data.name;
          sendTo(conn, {
            type: 'answer',
            answer: data.answer
          })
        }
        break;
      case 'candidate':
        console.log(`发送 candidate 给 【${data.name}】`);
        var conn = users[data.name];
        if(conn != null){
          sendTo(conn, {
            type: 'candidate',
            candidate: data.candidate
          })
        }
        break;
      case 'chats':
        console.log(`收到来自【${data.sendname}】的聊天消息`);
        // 广播消息(不给自己发送广播消息)
        var conn = users[data.sendname];
        if(conn != null){
          connection.name = data.sendname;
          wss.broadcast({
            type: 'chats',
            sendname: data.sendname,
            data: data.data,
            state: 'broadcast'
          })
        }
        break;
      case 'leave':
        console.log(`【${data.name}】 被挂断，结束通话`);
        var conn = users[data.name];
        if(conn != null) {
          conn.otherName = null;
          if(conn != null){
            sendTo(conn, {
              type: 'leave',
              name: data.name
            })
          }
        }
        break;
      case 'disconnect':
        console.log(`【${data.name}】 断开连接，退出房间`);
        var conn = users[data.name];
        conn.otherName = null;
        usersList.forEach(item => {
          if(item.name == data.name){
            item.isonline = 0;
          }
        })

        if(conn != null){
          sendTo(conn, {
            type: 'disconnect',
            name: data.name,
            list: usersList
          })
        }

        break;
      default:
        console.log("error");
        sendTo(connection, {
          type: 'error',
          message: 'unrecognized command: ' + data.type
        })
        break;
    }
  });

  connection.on('close', function(){
    if(connection.name){
      delete users[connection.name];
      if(connection.otherName) {
        console.log(`【${connection.otherName}】断开连接，退出房间`);
        var conn = users[connection.otherName];
        conn.otherName = null;
        if(conn != null){
          sendTo(conn, {
            type: 'leave'
          })
        }
      }
    }
  })
})
wss.on('listening', function () {
  console.log('websocket server started port:8888.....')
})

function sendTo(conn, message){
  conn.send(JSON.stringify(message));
}
server.listen(8888, '0.0.0.0', function () {
  console.log('websocket server started: https://172.18.4.45:8888.....')
})

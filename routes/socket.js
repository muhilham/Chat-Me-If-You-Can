var lodash = require('lodash');

var nodemailer = require('nodemailer');

function sendEmail(from, to, message) {

  const sentTo = to.trim();
  console.log(sentTo);
  const name = 'Chat-Me-If-You-Can';
  const smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
      user: "satriabajahitam512@gmail.com",
      pass: "sandibaru512"
    }
  });

  var mailOptions = {
    from: from,
    to: sentTo,
    subject: 'To be input',
    text: message
  }
  smtpTransport.sendMail(mailOptions, function(error, response){
     if(error){
         console.log(error);
     }else{
        console.log(response);
     }
  });
}

// Keep track of which names are used so that there are no duplicates
var userNames = (function () {
  var names = [];

  function claim(user) {

    var isRegistered = lodash.some(names, {registered: user.name});

    if (!user || isRegistered) {
      return false;
    }

    names.push({
      registered : user.name,
      id: user.id,
      email: ''
    });
    return true;

  };

  function claimEmail(user) {

    names.push({
      registered : user.name,
      id: user.id,
      email: user.email
    });
    return true;
  }

  // find the lowest unused "guest" name and claim it
  var getGuestName = function (clientId) {
    var name,
      nextUserId = 1;

    do {
      name = {
        name: 'Guest ' + nextUserId,
        id: clientId,
        email: ''
      };
      nextUserId += 1;
    } while (!claim(name));

    return name;
  };

  // serialize claimed names as an array
  var get = function () {
    var res = [];
    for (var i = 0; i < names.length; i++) {
      if (typeof names[i] != 'undefined'){
        res.push({
          name: names[i].registered,
          id: names[i].id,
          email: names[i].email
        });
      }
    }

    return res;
  };

  var free = function (userId) {
    var isRegistered = lodash.some(names, {id: userId});

    if (isRegistered) {
      var namesIndex = lodash.findIndex(names, {id: userId});

      return lodash.remove(names, function (name) {
        return userId === name.id;
      });
    }

  };

  return {
    claim: claim,
    claimEmail: claimEmail,
    free: free,
    get: get,
    getGuestName: getGuestName
  };
}());

function userConnected(socket) {


  // send the new user their name and a list of users
  var name = userNames.getGuestName(socket.client.id);;
  // notify other clients that a new user has joined

  // broadcast a user's message to other users
  socket.on('send:message', function (data) {
    socket.broadcast.to(data.target).emit('send:message', {
      user: name.name,
      text: data.text
    });
  });

  socket.on('request-chat', function (data) {

    var namesIndex = lodash.findIndex(userNames.get(), {id: data.source});

    var source = {
      id: data.source
    };


    socket.broadcast.to(data.target.id).emit('request-chat', source);
  });

  // validate a user's name change, and broadcast it on success
  socket.on('change:name', function (data, fn) {
    if (userNames.claim(data.name)) {
      var oldName = name;
      userNames.free(socket.client.id);

      name = data.name;

      socket.broadcast.emit('change:name', {
        oldName: oldName,
        newName: name
      });

      fn(true);
    } else {
      fn(false);
    }
  });

  socket.on('change:email', function (data, fn) {

    name.email = data.email;
    userNames.free(socket.client.id);

    let newUser = {
      id:name.id,
      name: name.name,
      email: name.email
    };
    if (userNames.claimEmail(newUser)) {
      let users = userNames.get();
      socket.emit('init', {
        name: name,
        users: users,
        clientId: socket.client.id,
        email: data.email
      });
      socket.broadcast.emit('user:join', {
        name: name
      });
      fn(true);
    }
  });

  socket.on('approve-chat', function (data) {

    let connectedUsers = userNames.get();

    const requesterData = lodash.find(connectedUsers, function (user) {
      return user.id === data.targetId
    });

    const approvalData = lodash.find(connectedUsers, function (user) {
      return user.id === socket.client.id
    });

    const nKey = Math.random();
    sendEmail(approvalData.name, approvalData.email, 'Input this to chat with ' + requesterData.email + ' :  ' + nKey);
    sendEmail(requesterData.name, requesterData.email, 'Input this to chat with ' + approvalData.email + ' :  ' + nKey);

    socket.broadcast.to(data.targetId).emit('chat-approved', {
      source: socket.client.id
    });
    socket.broadcast.to(socket.client.id).emit('chat-approved', {
      source: socket.client.id
    });
    
  });

  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', function () {
    socket.broadcast.emit('user:left', {
      name: name
    });
    userNames.free(socket.client.id);
  });
}

// export function for listening to the socket
module.exports = userConnected;

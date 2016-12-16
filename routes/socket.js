var lodash = require('lodash');

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
      id: user.id
    });
    return true;

  };

  // find the lowest unused "guest" name and claim it
  var getGuestName = function (clientId) {
    var name,
      nextUserId = 1;

    do {
      name = {
        name: 'Guest ' + nextUserId,
        id: clientId
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
          id: names[i].id
        });
      }
    }

    return res;
  };

  var free = function (userId) {
    var isRegistered = lodash.some(names, {id: userId});

    if (isRegistered) {
      var namesIndex = lodash.findIndex(names, {id: userId});
      return delete names[namesIndex];
    }

  };

  return {
    claim: claim,
    free: free,
    get: get,
    getGuestName: getGuestName
  };
}());

// export function for listening to the socket
module.exports = function (socket) {

  var name = userNames.getGuestName(socket.client.id);

  // send the new user their name and a list of users
  socket.emit('init', {
    name: name,
    users: userNames.get(),
    clientId: socket.client.id
  });

  // notify other clients that a new user has joined
  socket.broadcast.emit('user:join', {
    name: name
  });

  // broadcast a user's message to other users
  socket.on('send:message', function (data) {

    // socket.broadcast.emit('send:message', {
    //   user: name,
    //   text: data.text,
    //   targetUser: data.targetUser
    // });

    // console.log(data);
    socket.broadcast.to(data.target).emit('send:message', {
      user: name,
      text: data.text
    });
  });

  socket.on('request-chat', function (data) {

    var namesIndex = lodash.findIndex(userNames.get(), {id: data.source});

    var source = {
      id: data.source,
      name: userNames.get()[namesIndex].name,
      nKey: data.target.nKey,
      nxKey: data.target.nxKey
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

  socket.on('approve-chat', function (data) {
    socket.broadcast.to(data.targetId).emit('chat-approved', {
      publicKeyApproval: data.publicKeyApproval,
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
};

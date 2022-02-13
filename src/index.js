const path = require("path"); // to acces path
const http = require("http"); // to get http
const express = require("express"); // express
const socketio = require("socket.io"); // to get socketio module
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");

const {
  addUser,
  removeuser,
  getUser,
  getUserInRoom,
} = require("./utils/users");

const app = express(); // intialize express
const server = http.createServer(app); // make http server
const io = socketio(server); // socketio is function in which we pass server

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

let count = 0;

io.on("connection", (socket) => {
  console.log("New Websocket connection");
  // socket.emit("message", "Welcome!"); //  server sent to particualr

  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    socket.emit("message", generateMessage("Welome!"));

    socket.broadcast
      .to(user.room)
      .emit("message", generateMessage(`${user.username} has joined!`)); // servet sent to all client except self

    callback();
    // socket.emit, io.emit, socket.broadcast.emit
    // io.to.emit, socket.braodcast.to.emit  // for room
  });

  socket.on("sendmessage", (value, callback) => {
    const filter = new Filter();

    const user = getUser(socket.id);

    if (filter.isProfane(value)) {
      return callback("Profanity is not allowed!");
    }
    io.to(user.room).emit("message", generateMessage(value, user.username)); // sent to all
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUserInRoom(user.room),
    });
    callback(); // event acknowledgement
  });

  socket.on("locationMessage", (coords, callback) => {
    const user = getUser(socket.id);
    const str = `https://google.com/maps?q=${coords.latitude} ${coords.longitude}`;
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(user.username, str)
    );
    callback();
  });

  //   socket.emit("countUpdate", count); // server is sending mssg to the client
  //   socket.on("increment", () => {
  //     count++;
  //     // socket.emit("countUpdate", count); // emit is used for particular user
  //     io.emit("countUpdate", count); // io emit is used to send evry user
  //   });

  socket.on("disconnect", () => {
    // to disconnect
    const user = removeuser(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage(`${user.username} has left the chat`)
      );

      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUserInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is listening on ${port}`);
});

// server(emit)  -> client (receive) -- acknowledgement --> server
// client(emit)  -> server (receive) -- acknowledgement --> client


const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

app.get("/create-room", (req, res) => {
  res.json({ room: crypto.randomUUID() });
});

io.on("connection", (socket) => {
  socket.on("join-room", (room) => {
    if (
      typeof room !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(room)
    ) return;

    const members = io.sockets.adapter.rooms.get(room);

    if (members && members.size >= 2) {
      socket.emit("room-full");
      return;
    }

    socket.join(room);
    socket.to(room).emit("peer-joined");
  });
});

server.listen(3000, () => {
  console.log("Server started: http://localhost:3000");
});

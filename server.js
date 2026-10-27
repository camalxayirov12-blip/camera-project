const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const rooms = new Map();

app.use(express.static(path.join(__dirname, "public")));

app.get("/create-room", (req, res) => {
  const room = crypto.randomUUID();
  rooms.set(room, new Set());
  res.json({ room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (room, callback) => {
    if (typeof room !== "string" || room.length > 100) {
      return callback?.({
        success: false,
        message: "Неверный номер комнаты."
      });
    }

    const members = rooms.get(room);

    if (!members) {
      return callback?.({
        success: false,
        message: "Комната не найдена. Создай новую ссылку."
      });
    }

    if (members.size >= 2 && !members.has(socket.id)) {
      return callback?.({
        success: false,
        message: "Комната уже заполнена."
      });
    }

    members.add(socket.id);
    socket.join(room);
    socket.data.room = room;

    callback?.({
      success: true,
      polite: members.size === 2
    });
  });

  socket.on("signal", (message) => {
    const room = socket.data.room;

    if (!room || !message || message.room !== room || !message.data) {
      return;
    }

    socket.to(room).emit("signal", {
      data: message.data
    });
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (!room) return;

    const members = rooms.get(room);

    if (members) {
      members.delete(socket.id);

      if (members.size === 0) {
        rooms.delete(room);
      }
    }

    socket.to(room).emit("signal", {
      data: { stopped: true }
    });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
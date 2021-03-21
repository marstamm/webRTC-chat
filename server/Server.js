const createServer = require("http").createServer;
const express = require("express");
const socketIO = require("socket.io");
const path = require("path");
const cors = require("cors");

module.exports = class Server {
  constructor() {
    this.DEFAULT_PORT = 5000;
    this.initialize();
    this.handleSocketConnection();
    this.activeSockets = [];
  }
  initialize() {
    this.app = express();
    this.app.use(cors());
    this.httpServer = createServer(this.app);
    this.io = socketIO(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.app.enable("trust proxy");
    this.app.use(function (request, response, next) {
      if (process.env.NODE_ENV === "production" && !request.secure) {
        return response.redirect(
          "https://" + request.headers.host + request.url
        );
      }
      next();
    });

    this.app.use(express.static(path.join(__dirname, "../public")));
  }

  handleSocketConnection() {
    this.io.on("connection", (socket) => {
      const existingSocket = this.activeSockets.find(
        (existingSocket) => existingSocket === socket.id
      );

      if (!existingSocket) {
        this.activeSockets.push(socket.id);

        socket.broadcast.emit("joined", {
          user: socket.id,
        });

        socket.on("call-user", (data) => {
          socket.to(data.to).emit("call-offer", {
            offer: data.offer,
            from: socket.id,
          });
        });

        socket.on("make-answer", (data) => {
          socket.to(data.to).emit("answer-made", {
            from: socket.id,
            answer: data.answer,
          });
        });

        socket.on("disconnect", () => {
          this.activeSockets = this.activeSockets.filter(
            (existingSocket) => existingSocket !== socket.id
          );
          socket.broadcast.emit("disconnected", {
            id: socket.id,
          });
        });
      }
    });
  }
  listen(callback) {
    this.httpServer.listen(this.DEFAULT_PORT, () =>
      callback(this.DEFAULT_PORT)
    );
  }
};

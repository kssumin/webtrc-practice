import http from "http";
import { Server } from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log("Listening on http://localhost:3000");

// 같은 포트를 공유해서 http, websocket이 사용한다.
const httpServer = http.createServer(app);
const wsServer = new Server(httpServer);

wsServer.on("connection", (socket) => {
    socket.on("join_room", (roomName) => {
        socket.join(roomName);
        // 기존에 room에 있던 user들에게 socket.id에 해당하는 user가 들어왔다고 welcome event발생
        socket.to(roomName).emit("welcome", socket.id);
    });

    socket.on("offer", (offer, joinSocketId) => {
        socket.to(joinSocketId).emit("offer", offer, socket.id);
    });

    socket.on("answer", (answer, remoteSocketId) => {
        socket.to(remoteSocketId).emit("answer", answer, socket.id);
    });

    socket.on("ice", (ice, remoteSocketId) => {
        socket.to(remoteSocketId).emit("ice", ice, socket.id);
    });

    socket.on("disconnect", () => {
        wsServer.sockets.emit("peer_disconnected", socket.id);
    });
});

httpServer.listen(3000, handleListen);

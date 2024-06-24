import http from "http"
import SocketIO from "socket.io"
import express from "express"

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log("Listening on http://localhost:3000");

// 같은 port를 공유해서 http, websocket이 사용한다.
const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", (socket) => {
    socket.on("enter_room", (msg, done) => {
        console.log(msg);
        setTimeout(() => {
            done("Hello from the backend");
        }, 10000); // server에서는 done이라는 function을 10초후에 실행시켜 client에게 전달한다(callback?)
    })
})

httpServer.listen(3000, handleListen);
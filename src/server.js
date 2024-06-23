import http from "http"
import WebSocket from "ws";
import express from "express"

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log("Listening on http://localhost:3000");

// 같은 port를 공유해서 http, websocket이 사용한다.
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 연결된 socket들을 관리한다
const sockets = [];


// 여기서 socket은 임시로 연결된 브라우저
// 해당 WebServerSocket에 이벤트를 등록해야 한다.
wss.on("connection", (socket) => {
    sockets.push(socket);
    socket["nickname"] = "Anon";

    /* WebServerSocket에 event를 등록하지 않았다. 우리는 특정 socket(브라우저와 연결된)에 이벤트를 등록해야 한다. */
    console.log("Connected to browser");
    socket.on("close", () => console.log("Disconected from the brwoser")); // 특정 socket이 닫힘
    socket.on("message", (msg) => { // 특정 socket으로부터 message를 전달받는다.
        const utf8message = msg.toString("utf8");
        const message = JSON.parse(utf8message);

        switch (message.type) {
            case "new_message":
                sockets.forEach((aSocket) => {
                    aSocket.send(`${socket.nickname} : ${message.payload}`);
                });
                break;
            case "nickname":
                socket["nickname"] = message.payload;
                console.log("save nickname : ", message.payload);
        }
    })
    socket.send("Hello"); // 특정 socket에게 message를 전달한다.
});

server.listen(3000, handleListen);
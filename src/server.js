import http from "http"
import { Server } from "socket.io"
import express from "express"
import { instrument } from "@socket.io/admin-ui";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log("Listening on http://localhost:3000");

// 같은 port를 공유해서 http, websocket이 사용한다.
const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
    },
});

instrument(wsServer, {
    auth: false
});

function publicRooms() {
    const {
        sockets: {
            adapter: { sids, rooms },
        },
    } = wsServer;

    const publicRooms = [];
    rooms.forEach((_, key) => {
        if (sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    });

    return publicRooms;

    // const {
    //     sockets: {
    //         adapter: { sids, rooms },
    //     },
    // } = wsServer;  
}

// 해당 방에 입장한 사람의 수
function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket) => {
    socket["nickname"] = "Annon";
    socket.onAny((event) => {
        console.log(`Socket Event : ${event}`);
    });
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName); // roonName이라는 room에 참가
        done();


        // 해당 roon에 들어와있는 다른 socket에게 메시지를 전송한다.
        wsServer.in(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        wsServer.sockets.emit("room_change", publicRooms());
    });
    // 채팅방을 나가기 전 상태에서 실행하는 이벤트로
    // 다른 사용자들에게 채팅방을 나간다는 이벤트를 broadcast한다.
    // 계속 연결을 시도한다
    socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1));
    });
    // 연결이 끊겼을 때
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
    })
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    });
    socket.on("nickname", (nickname) => {
        console.log("nickanme 변경", nickname);
        socket["nickname"] = nickname
    });
})

httpServer.listen(3000, handleListen);
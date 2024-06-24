// client, back socket을 연결해준다.
const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");

const room = document.getElementById("room");
room.hidden = true;
let roomName;

function backendDone(msg) {
    console.log(`The backend says : `, msg);
}

function addMessage(msg) {
    const ul = room.querySelector("ul");
    const li = document.createElement("li");

    li.innerText = msg;
    ul.appendChild(li);
}
 
// 각 socket event를 받았을 때 처리
socket.on("welcome", (user, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;

    addMessage(`${user} Someone joined!`);
})

socket.on("bye", (left, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;

    addMessage(`${left} Someone left`);
})

socket.on("new_message", addMessage);

socket.on("room_change", (rooms) => {
    roomList.innerHTML = "";
    if (rooms.length == 0) {
        return;
    }
    const roomList = welcome.querySelector("ul");

    rooms.forEach(room => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.append(li);
    });
});

function showRoom() {
    welcome.hidden = true;
    room.hidden = false;
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName}`;

    const msgForm = room.querySelector("#msg");
    const nameForm = room.querySelector("#name");
    msgForm.addEventListener("submit", handleMessageSubmit);
    nameForm.addEventListener("submit", handleNicknameSubmit);
}

function handleRoomSubmit(event) {
    event.preventDefault();
    const input = form.querySelector("input");

    // 해당 이벤트명으로 메시지를 보낸다
    // emit(이벤트명(아무것이나 가능), 전송하고자 하는 object == payload, backend에서 호출하는 function)
    socket.emit(
        "enter_room",
        input.value,
        showRoom // 백엔드에서 끝났다는 사실을 알리기 위해 해당 function 사용
    );
    roomName = input.value;
    input.value = "";

    // socket.emit
    // 1. event의 이름(text)
    // 2. message 전송(object 가능) 
    // 3. 받은 socket이 호출할 function
}

function handleMessageSubmit(event) {
    event.preventDefault();

    const input = room.querySelector("#msg input");
    const value = input.value;

    socket.emit("new_message", input.value, roomName, () => {
        addMessage(`You : ${value}`);
    });

    input.value = "";
}

function handleNicknameSubmit(event) {
    event.preventDefault();

    const input = room.querySelector("#name input");
    socket.emit("nickname", input.value);
}

form.addEventListener("submit", handleRoomSubmit);
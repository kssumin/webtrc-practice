// client, back socket을 연결해준다.
const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");

function backendDone(msg) {
    console.log(`The backend says : `, msg);
}

function handleRoomSubmit(event) {
    event.preventDefault();
    const input = form.querySelector("input");

    // 해당 이벤트명으로 메시지를 보낸다
    // emit(이벤트명(아무것이나 가능), 전송하고자 하는 object == payload, backend에서 호출하는 function)
    socket.emit(
        "enter_room",
        { payload: input.value },
        backendDone // 백엔드에서 끝났다는 사실을 알리기 위해 해당 function 사용
    );
    input.value = "";

    // socket.emit
    // 1. event의 이름(text)
    // 2. message 전송(object 가능)
    // 3. 받은 socket이 호출할 function
}

form.addEventListener("submit", handleRoomSubmit);
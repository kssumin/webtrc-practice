const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let peerConnections = {};

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;

            if (currentCamera.label === camera.label) {
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        });
    } catch (e) {
        console.log(e);
    }
}

async function getMedia(deviceId) {
    const initialConstrains = {
        audio: true,
        video: { facingMode: "user" },
    };

    const cameraConstraints = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    }
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstraints : initialConstrains
        );
        myFace.srcObject = myStream;

        if (!deviceId) {
            await getCameras();
        }
    } catch (e) {
        console.log(e);
    }
}

function handleMuteClick() {
    myStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));

    if (!muted) {
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute";
        muted = false;
    }
}

function handleCameraClick() {
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));

    if (cameraOff) {
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = false;
    } else {
        cameraBtn.innerText = "Turn Camera On";
        cameraOff = true;
    }
}

async function handleCameraChange() {
    await getMedia(camerasSelect.value);
    Object.values(peerConnections).forEach(connection => {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = connection.getSenders().find(sender => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    });
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

// welcome
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();

    const input = welcomeForm.querySelector("input");
    await initCall();
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// 원래 room에 있던 user들이 welcome event를 받는다
socket.on("welcome", async (joinSocketId) => {
    const peerConnection = createPeerConnection(joinSocketId);
    // 원래 room에 있던 user들이 본인의 sdp를 생성한다
    const offer = await peerConnection.createOffer();
    peerConnection.setLocalDescription(offer);

    // 기존에 room에 있던 user들이 본인의 sdp를 새로 들어온 user의 socketId에게 전달한다
    socket.emit("offer", offer, joinSocketId);
});

socket.on("offer", async (offer, socketId) => {
    const peerConnection = createPeerConnection(socketId);

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answer", answer, socketId);
});

socket.on("answer", (answer, socketId) => {
    const peerConnection = peerConnections[socketId];
    peerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice, socketId) => {
    const peerConnection = peerConnections[socketId];
    peerConnection.addIceCandidate(new RTCIceCandidate(ice));
});

socket.on("peer_disconnected", (socketId) => {
    const peerConnection = peerConnections[socketId];
    if (peerConnection) {
        peerConnection.close();
        delete peerConnections[socketId];
        document.getElementById(`peerFace${socketId}`).remove();
    }
});

function createPeerConnection(socketId) {
    const peerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ]
            },
        ]
    });

    peerConnection.addEventListener("icecandidate", (event) => handleIce(event, socketId));
    peerConnection.addEventListener("track", (event) => handleTrackEvent(event, socketId));

    myStream.getTracks().forEach(track => peerConnection.addTrack(track, myStream));

    peerConnections[socketId] = peerConnection;

    return peerConnection;
}

function handleIce(event, socketId) {
    if (event.candidate) {
        socket.emit("ice", event.candidate, roomName, socketId);
    }
}

function handleTrackEvent(event, socketId) {
    const myStreamDiv = document.getElementById("myStream");
    let peerFace = document.getElementById(`peerFace${socketId}`);

    if (!peerFace) {
        peerFace = document.createElement("video");
        peerFace.id = `peerFace${socketId}`;
        peerFace.autoplay = true;
        peerFace.playsInline = true;
        peerFace.width = 400;
        peerFace.height = 400;
        myStreamDiv.appendChild(peerFace);
    }

    peerFace.srcObject = event.streams[0];
}
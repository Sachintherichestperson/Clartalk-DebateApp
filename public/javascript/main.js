const button = document.querySelector(".start-stream-btn");
const socket = io(); // Connect to the signaling server
const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };    
let localStream = null;
let peerConnections = {};
let isStreamer = false; // Default is viewer
let roomId = "your-room-id"; // Replace with dynamic room ID

// Get user media (streamer's video and audio)
async function initLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const localVideo = document.getElementById("localVideo");
        localVideo.srcObject = localStream;
        localVideo.play();
        console.log("Local stream initialized.");
    } catch (error) {
        console.error("Error accessing media devices:", error);
    }
}

// Create a new RTCPeerConnection for a peer
function createPeerConnection(peerId) {
    if (peerConnections[peerId]) {
        console.log(`Peer connection for ${peerId} already exists.`);
        return peerConnections[peerId];
    }

    console.log(`Creating peer connection for ${peerId}`);
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnections[peerId] = peerConnection;

    // Attach local stream for streamer
    if (isStreamer && localStream) {
        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });
    }

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("signal", { data: { candidate: event.candidate }, sender: socket.id, target: peerId });
        }
    };

    peerConnection.ontrack = (event) => {
        console.log("Received remote track for", peerId);
        const remoteVideo = document.getElementById("remoteVideo");
        if (!remoteVideo.srcObject) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    return peerConnection;
}

// Handle incoming signals (SDP and ICE candidates)
async function handleSignal({ data, sender }) {
    let peerConnection = peerConnections[sender];
    if (!peerConnection) {
        console.log(`Peer connection for ${sender} does not exist, creating it now.`);
        peerConnection = createPeerConnection(sender);
    }

    if (data.sdp) {
        console.log("Received SDP:", data.sdp.type);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === "offer") {
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit("signal", { data: { sdp: peerConnection.localDescription }, sender: socket.id, target: sender });
        }
    } else if (data.candidate) {
        console.log("Received ICE candidate.");
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
}

// Initialize for Streamers
async function initializeStream() {
    await initLocalStream();
    isStreamer = true;
    socket.emit("start-stream", { roomId }); // Notify the server that the stream has started
}

// Initialize for Viewers
function initializeViewer() {
    isStreamer = false;
    socket.emit("join-room", { roomId }); // Viewers join the room
}

// Handle user joining
socket.on("user-joined", (peerId) => {
    console.log("User joined:", peerId);

    if (isStreamer && !peerConnections[peerId]) {
        createPeerConnection(peerId);
        createOffer(peerId);
    }
});

// Handle stream started
socket.on("stream-started", (peerId) => {
    console.log("Stream started by peer:", peerId);
    if (!peerConnections[peerId]) {
        createPeerConnection(peerId);
        createOffer(peerId); // Viewer receives the offer
    }
});

// Handle user leaving
socket.on("user-left", (peerId) => {
    console.log("User left:", peerId);
    if (peerConnections[peerId]) {
        peerConnections[peerId].close();
        delete peerConnections[peerId];
    }
});

// Create an offer for a peer
async function createOffer(peerId) {
    console.log(`Creating offer for ${peerId}`);
    const peerConnection = peerConnections[peerId];
    if (!peerConnection) {
        console.error(`Peer connection for ${peerId} not found!`);
        return;
    }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("signal", { data: { sdp: peerConnection.localDescription }, sender: socket.id, target: peerId });
}

// Handle signal
socket.on("signal", handleSignal);

// Event Listeners
button?.addEventListener("click", () => {
    initializeStream();
});

// Initialize viewer if source is "link"
if (window.location.search.includes("source=link")) {
    initializeViewer();
}
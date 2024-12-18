    const socket = io();
    const configuration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    };
    let localStream = null;
    let peerConnections = {};

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

    function createPeerConnection(peerId, localStream = null) {
        if (peerConnections[peerId]) {
            console.log(`Peer connection for ${peerId} already exists.`);
            return peerConnections[peerId];
        }

        console.log(`Creating peer connection for ${peerId}`);
        const peerConnection = new RTCPeerConnection(configuration);
        peerConnections[peerId] = peerConnection;

        if (localStream) {
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

    async function handleSignal({ data, sender }) {
        let peerConnection = peerConnections[sender];
        if (!peerConnection) {
            console.log(`Peer connection for ${sender} does not exist, creating it now.`);
            peerConnection = createPeerConnection(sender, localStream);
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

    socket.on("user-joined", (peerId) => {
        console.log("User joined:", peerId);

        if (!peerConnections[peerId]) {
            createPeerConnection(peerId, localStream);
        }

        createOffer(peerId);
    });

    socket.on("signal", handleSignal);

    socket.on("user-left", (peerId) => {
        console.log("User left:", peerId);
        if (peerConnections[peerId]) {
            peerConnections[peerId].close();
            delete peerConnections[peerId];
        }
    });

    async function initialize() {
        await initLocalStream();
        socket.emit("join-room", { roomId: "your-room-id" }); // Replace with dynamic room ID
    }

    initialize();

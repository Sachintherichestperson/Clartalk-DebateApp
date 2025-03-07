
    let localStream;
    let peerConnections = {};
    let roomId;
    let userType;
    
    const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
    
    async function joinRoom(type) {
        roomId = document.getElementById("roomId").value.trim();
        if (!roomId) return alert("Enter a Room ID!");
    
        userType = type; // "debater" or "viewer"
        socket.emit("join-room", roomId, userType);
    
        if (userType === "debater") {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            document.getElementById("localVideo").srcObject = localStream;

            const remoteVideos = document.querySelectorAll("#remoteVideos video");
                remoteVideos.forEach((video, index) => {
                    if (index > 0) { // Hide all videos except the first one
                video.style.display = "none";
                }
            });
        }
    }
    
    socket.on("new-user", async (userId, type) => {
        console.log(`New ${type} joined: ${userId}`);
    
        createPeerConnection(userId);
    
        if (userType === "debater") {
            // First debater should also send an offer to new debater
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to ensure stable signaling
            sendOffer(userId);
        }
    });    
    
    function createPeerConnection(userId) {
        if (peerConnections[userId]) return; // Prevent duplicate connections
    
        const peerConnection = new RTCPeerConnection(configuration);
    
        peerConnection.ontrack = (event) => {
            addRemoteStream(event.streams[0], userId);
        };
    
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", event.candidate, userId);
            }
        };
    
        peerConnections[userId] = peerConnection;
    
        if (userType === "debater" && localStream) {
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        }
    }
    
    async function sendOffer(userId) {
        if (!peerConnections[userId]) return;
    
        const peerConnection = peerConnections[userId];
    
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket.emit("offer", offer, userId);
    }
    
    socket.on("offer", async (offer, senderId) => {
        if (!peerConnections[senderId]) {
            createPeerConnection(senderId);
        }
    
        const peerConnection = peerConnections[senderId];
    
        if (peerConnection.signalingState !== "stable") {
            console.warn("Waiting for stable signaling state...");
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for stable state
        }
    
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit("answer", answer, senderId);
    });
    
    socket.on("answer", async (answer, senderId) => {
        if (peerConnections[senderId]) {
            await peerConnections[senderId].setRemoteDescription(new RTCSessionDescription(answer));
        }
    });
    
    socket.on("ice-candidate", async (candidate, senderId) => {
        if (peerConnections[senderId]) {
            await peerConnections[senderId].addIceCandidate(new RTCIceCandidate(candidate));
        }
    });
    
    socket.on("user-disconnected", (userId) => {
        if (peerConnections[userId]) {
            peerConnections[userId].close();
            delete peerConnections[userId];
            removeRemoteStream(userId);
        }
    });
    
    function addRemoteStream(stream, userId) {
        if (!document.getElementById(`video-${userId}`)) {
            const videoElement = document.createElement("video");
            videoElement.id = `video-${userId}`;
            videoElement.className = "remote-Videos";
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.srcObject = stream;
            document.getElementById("remoteVideos").appendChild(videoElement);
        }
    }
    
    function removeRemoteStream(userId) {
        const videoElement = document.getElementById(`video-${userId}`);
        if (videoElement) videoElement.remove();
    }
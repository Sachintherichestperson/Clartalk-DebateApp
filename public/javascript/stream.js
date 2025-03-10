    let localStream;
    let peerConnections = {};
    let roomId;
    let userType;
    let combinedStream = new MediaStream();
    let mediaRecorder;
    let recordedChunks = [];
    let canvasStream;
    const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

    function startRecording() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 1280; // Adjust as needed
    canvas.height = 720;

    const localVideo = document.getElementById("localVideo");
    const remoteVideos = document.querySelectorAll("#remoteVideos video");

    function drawFrame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw local video on the left
        if (localVideo) {
            ctx.drawImage(localVideo, 0, 0, canvas.width / 2, canvas.height);
        }

        // Draw first remote video on the right
        let xOffset = canvas.width / 2;
        remoteVideos.forEach((video, index) => {
            if (index === 0) { // Only record the first remote stream for now
                ctx.drawImage(video, xOffset, 0, canvas.width / 2, canvas.height);
            }
        });

        requestAnimationFrame(drawFrame);
    }

    drawFrame();

    // Capture the canvas as a stream
    canvasStream = canvas.captureStream(30); // 30 FPS
    mediaRecorder = new MediaRecorder(canvasStream, { mimeType: "video/webm" });

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = saveRecording;

    mediaRecorder.start();
    console.log("Recording started...");
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            console.log("Recording stopped.");
        } else {
            console.warn("MediaRecorder was already inactive.");
        }
    
        // Ensure that `saveRecording()` is called even if mediaRecorder is inactive
        setTimeout(() => saveRecording(), 1000);
    }
    
    function saveRecording() {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
    
        // Create FormData to send file
        const formData = new FormData();
        formData.append("vedio", blob, "debate_recording.webm");
    
        fetch(`/creator/Upload-call/${liveId}`, {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => console.log("Upload Success:", data))
        .catch(error => console.error("Error uploading:", error));
    }
    

    socket.on("user-connected", () => {
    setTimeout(startRecording, 3000); 
    });

    function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw remote video (full-screen)
    remoteVideos.forEach((video, index) => {
        if (index === 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
    });

    // Draw local video (small window on bottom-right)
    if (localVideo) {
        let smallWidth = 200;
        let smallHeight = 150;
        ctx.drawImage(localVideo, canvas.width - smallWidth - 10, canvas.height - smallHeight - 10, smallWidth, smallHeight);
    }

    requestAnimationFrame(drawFrame);
    }

// Function to generate a 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to handle End Call and send OTP securely
function requestEndCallOTP() {
    const otp = generateOTP();
    console.log("OTP generated:", otp);

    // Emitting OTP to the other streamer in the room
    socket.emit("send_otp", { otp, roomId: liveId });

    // Asking the current streamer to enter OTP
    const enteredOTP = prompt("Enter the OTP received by the other streamer:");

    // Sending OTP verification request
    if (enteredOTP) {
        socket.emit("verify_otp", { enteredOTP, roomId: liveId });
    }
}

// Handling OTP reception for the other streamer
socket.on("receive_otp", (data) => {
    alert("Your opponent wants to end the call. Share this OTP: " + data.otp);
});

// Handling successful OTP verification
socket.on("otp_success", () => {
    stopRecording();

    // Emit to all users in the room so both streamers get redirected
    socket.emit("end_call_redirect", { roomId: liveId });
    socket.emit("redirect_to_home", { roomId: liveId }); // Add this line
});


// Handling redirection for both streamers
socket.on("redirect_to_home", async () => {
    try {
        const response = await fetch(`/creator/end-call/${liveId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ LiveStatus: 'Ended' })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Redirecting after saving recording...");
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 3000); // Give time to complete the file download
        } else {
            console.error("Failed to update status:", data.error);
        }
    } catch (error) {
        console.error("Error while updating live status:", error);
    }
});



    
    async function joinRoom(type) {
        roomId = document.getElementById("roomId").value.trim();
        if (!roomId) return alert("Enter a Room ID!");
    
        userType = type;
        socket.emit("join-room", roomId, userType);

    
        if (userType === "debater") {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            document.getElementById("localVideo").srcObject = localStream;
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
            
            // Append to remote videos container
            document.getElementById("remoteVideos").appendChild(videoElement);
    
            // Set styles after adding the video
            updateVideoStyles();
        }
    }
    
    function updateVideoStyles() {
        const remoteVideos = document.querySelectorAll("#remoteVideos video");
        const videoCount = remoteVideos.length;
    
        remoteVideos.forEach((video) => {
            if (videoCount === 1) {
                video.style.width = "100%"; // Single video takes full width
            } else if (videoCount === 2) {
                video.style.width = "50%"; // Two videos take 50% each
                video.style.display = "block"; // Ensure both videos are visible
            } else {
                video.style.width = "33.33%"; // If more than two, adjust accordingly
                video.style.display = "block";
            }
        });
    }
    
    
    
    function removeRemoteStream(userId) {
        const videoElement = document.getElementById(`video-${userId}`);
        if (videoElement) videoElement.remove();
    }
    
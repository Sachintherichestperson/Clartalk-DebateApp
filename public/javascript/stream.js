let localStream;
let peerConnections = {};
let roomId;
let userType;
let frameCounter = 0;
let recordedChunks = [];
let canvasStream;
let mediaRecorder;
let combinedStream = new MediaStream();
const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };


// let recognition;
// let debateTranscript = "";
// let lastSentTranscript = "";

// function startSpeechRecognition() {
//     if (!('webkitSpeechRecognition' in window)) {
//         console.log("Speech recognition not supported in this browser.");
//         return;
//     }

//     recognition = new webkitSpeechRecognition();
//     recognition.continuous = true;
//     recognition.interimResults = true;
//     recognition.lang = 'en-US';

//     recognition.onresult = (event) => {
//         let lastResult = event.results[event.results.length - 1];
//         if (lastResult.isFinal) {
//             debateTranscript = lastResult[0].transcript;
//             console.log("Debate Transcript:", debateTranscript);
//         }
//     };

//     recognition.onerror = (event) => {
//         console.error("Speech recognition error:", event.error);
//         console.log("Restarting speech recognition...");
//         recognition.stop();  
//         setTimeout(() => recognition.start(), 1000);
//     };

//     recognition.start();
// }

// function startAIAutoComment() {
//     setInterval(async () => {
//         const latestTranscript = debateTranscript.trim();

//         if (latestTranscript.length > 0 && latestTranscript !== lastSentTranscript) {
//             lastSentTranscript = latestTranscript;
//             await fetchAIComment(latestTranscript);
//         }
//     }, 10000);
// }

// document.addEventListener("DOMContentLoaded", () => {
//     startSpeechRecognition();
//     startAIAutoComment();
// });

// async function fetchAIComment(debateText) {
//     try {
//         const response = await fetch('/generate-ai-comment', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ 
//                 text: debateText, 
//                 videoId: liveId,  
//                 videoType: "Live",  
//                 userId: Viewers  
//             })
//         });

//         const data = await response.json();

//         if (response.ok && data.comment) {
//             addCommentToUI('AI_DebateBot', data.comment, '/images/nav.avif');
//         } else {
//             console.error("No valid comment received from AI.", data);
//         }
//     } catch (error) {
//         console.error("Error fetching AI comment:", error);
//     }
// }

// function addCommentToUI(username, comment, image) {
//     let commentSection = document.querySelector(".allsinglecomment");

//     if (!commentSection) {
//         commentSection = document.createElement("div");
//         commentSection.classList.add("allsinglecomment");
//         document.body.appendChild(commentSection); 
//     }

//     const commentElement = document.createElement("div");
//     commentElement.classList.add("single-comment");
//     commentElement.innerHTML = `
//         <img src="${image}" alt="" class="comment-image">
//         <p><strong class="strong">${username}:</strong> ${comment}</p>
//     `;

//     commentSection.prepend(commentElement);
// }


let recognition;
let debateTranscripts = {
    local: "",
    remote: {}
};
let isRecognitionActive = false;
let remoteMediaRecorders = {};
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Add mobile-specific audio constraints
const audioConstraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
    }
};

async function sendTranscriptToBackend() {
    // Combine both transcripts with user identification
    const remoteTranscripts = Object.entries(debateTranscripts.remote)
        .map(([userId, transcript]) => `Remote User ${userId}: ${transcript}`)
        .join('\n');
    
    const combinedTranscript = `Local User: ${debateTranscripts.local}\n${remoteTranscripts}`;
    
    if (!combinedTranscript.trim()) {
        console.warn("No transcript to send");
        return;
    }

    // Validate required fields
    if (!liveId || !Creator) {
        console.error("Missing required fields: liveId or Creator");
        return;
    }

    console.log("Sending transcript to backend...");
    
    try {
        const response = await fetch('/generate-ai-feedback', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: combinedTranscript,
                videoId: liveId,
                videoType: "Live",
                userId: Creator,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Backend error:", errorData);
            throw new Error(`Server responded with ${response.status}: ${errorData.message || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log("Backend response:", data);
        
        if (data.success) {
            window.location.href = "/";
        } else {
            console.error("Backend reported failure:", data.message);
        }
    } catch (error) {
        console.error("Failed to send transcript:", error);
        alert(`Failed to send transcript: ${error.message}`);
    }
}

function startSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        console.log("Speech recognition not supported");
        return;
    }

    // Request microphone permission with mobile-optimized constraints
    navigator.mediaDevices.getUserMedia(audioConstraints)
        .then(stream => {
            // Initialize recognition for local user
            recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            isRecognitionActive = true;

            // Add mobile-specific error handling
            recognition.onerror = (event) => {
                console.error("Recognition error:", event.error);
                if (event.error === 'not-allowed') {
                    alert("Please allow microphone access in your browser settings.");
                    isRecognitionActive = false;
                    return;
                }
                if (event.error === 'no-speech') {
                    console.log("No speech detected");
                    return;
                }
                if (event.error === 'aborted') {
                    console.log("Speech recognition aborted");
                    return;
                }
                if (event.error !== 'no-speech') {
                    setTimeout(() => recognition.start(), 1000);
                }
            };

            recognition.onresult = (event) => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        debateTranscripts.local += event.results[i][0].transcript + " ";
                        console.log("Local user transcript:", debateTranscripts.local);
                        
                        // Add mobile-specific feedback
                        if (isMobile) {
                            showMobileFeedback("Speech captured");
                        }
                    }
                }
            };

            recognition.onend = () => {
                if (isRecognitionActive) {
                    // Add small delay for mobile devices
                    setTimeout(() => recognition.start(), isMobile ? 2000 : 1000);
                }
            };

            recognition.start();
            console.log("Speech recognition started for local user");
        })
        .catch(err => {
            console.error("Microphone access error:", err);
            if (isMobile) {
                alert("Please check your microphone permissions in your phone settings.");
            } else {
                alert("Could not access microphone. Please check permissions.");
            }
        });
}

function handleRemoteAudio(stream, userId) {
    // Optimize MediaRecorder settings for mobile
    const mediaRecorderOptions = {
        mimeType: isMobile ? 'audio/webm' : 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
    };

    const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
    remoteMediaRecorders[userId] = mediaRecorder;

    // Handle audio chunks with mobile optimization
    mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
            const formData = new FormData();
            formData.append('audio', event.data);
            formData.append('userId', userId);
            formData.append('roomId', liveId);
            formData.append('isMobile', isMobile);

            try {
                const response = await fetch('/process-remote-audio', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.transcript) {
                        debateTranscripts.remote[userId] = (debateTranscripts.remote[userId] || '') + data.transcript + ' ';
                        console.log(`Remote user ${userId} transcript:`, debateTranscripts.remote[userId]);
                        
                        // Add mobile-specific feedback
                        if (isMobile) {
                            showMobileFeedback("Remote speech captured");
                        }
                    }
                }
            } catch (error) {
                console.error(`Error processing remote audio for user ${userId}:`, error);
                if (isMobile) {
                    showMobileFeedback("Error processing remote audio");
                }
            }
        }
    };

    // Adjust chunk size for mobile
    try {
        mediaRecorder.start(isMobile ? 2000 : 1000);
    } catch (error) {
        // Try alternative chunk size if initial start fails
        try {
            mediaRecorder.start(1000);
        } catch (retryError) {
            console.error(`Failed to start MediaRecorder even with alternative chunk size for user ${userId}:`, retryError);
        }
    }
}

function addRemoteStream(stream, userId) {
    if (!document.getElementById(`video-${userId}`)) {
        const videoElement = document.createElement("video");
        videoElement.id = `video-${userId}`;
        videoElement.className = "remote-Videos";
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.srcObject = stream;
        
        // Handle remote audio
        handleRemoteAudio(stream, userId);
        
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
    
    // Stop and cleanup MediaRecorder
    if (remoteMediaRecorders[userId]) {
        remoteMediaRecorders[userId].stop();
        delete remoteMediaRecorders[userId];
    }

    // Clean up transcript
    delete debateTranscripts.remote[userId];
}

function startRecording() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 1280;
    canvas.height = 720;

    const localVideo = document.getElementById("localVideo");
    const remoteVideos = document.querySelectorAll("#remoteVideos video");

    function drawFrame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (localVideo && !localVideo.paused && !localVideo.ended) {
            ctx.drawImage(localVideo, 0, 0, canvas.width / 2, canvas.height);
        }

        remoteVideos.forEach((video, index) => {
            if (!video.paused && !video.ended && index === 0) {
                ctx.drawImage(video, canvas.width / 2, 0, canvas.width / 2, canvas.height);
            }
        });

        requestAnimationFrame(drawFrame);
    }

    drawFrame();

    canvasStream = canvas.captureStream(10);
    setTimeout(() => {
        mediaRecorder = new MediaRecorder(canvasStream, { mimeType: "video/webm" });

        mediaRecorder.ondataavailable = (event) => {
            console.log("ondataavailable triggered, chunk size:", event.data.size);
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
                console.log("Chunk added to recordedChunks:", recordedChunks.length);
            } else {
                console.warn("Received an empty chunk!");
            }
        };
        mediaRecorder.start();
        console.log("Recording started...");
    }, 500);
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        console.log("Recording stopped.");
        setTimeout(saveRecording, 1000);
    } else {
        console.warn("MediaRecorder was already inactive.");
    }
}

function saveRecording() {
    console.log("Save Recording....");
    if (recordedChunks.length === 0) {
        console.warn("No recorded chunks available.");
        return;
    }

    const blob = new Blob(recordedChunks, { type: "video/webm" });
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


function generateOTP() {
return Math.floor(100000 + Math.random() * 900000).toString();
}


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


socket.on("receive_otp", (data) => {
alert("Your opponent wants to end the call. Share this OTP: " + data.otp);
});

socket.on("otp_success", () => {
stopRecording();

setTimeout(() => {
    socket.emit("end_call_redirect", { roomId: liveId });
    socket.emit("redirect_to_home", { roomId: liveId });
}, 2000);

});


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
        }, 5000); // Give time to complete the file download
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


    try{
        if (userType === "debater") {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            document.getElementById("localVideo").srcObject = localStream;
            startSpeechRecognition();
        }
    }catch (error) {
        console.error("Error accessing media devices:", error);
        alert("Please allow access to your camera and microphone.");
        return;
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

// Add mobile-specific feedback function
function showMobileFeedback(message) {
    const feedback = document.createElement('div');
    feedback.className = 'mobile-feedback';
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 2000);
}

// Add mobile-specific cleanup
function cleanupAudio() {
    if (localAudioContext) {
        localAudioContext.close();
    }
    Object.values(remoteAudioContexts).forEach(context => context.close());
    remoteAudioContexts = {};
    
    Object.values(remoteMediaRecorders).forEach(recorder => recorder.stop());
    remoteMediaRecorders = {};
    
    if (recognition) {
        stopSpeechRecognition();
    }
}

// Add mobile-specific event listeners
if (isMobile) {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Pause recognition when app goes to background
            if (recognition) {
                recognition.stop();
            }
        } else {
            // Resume recognition when app comes to foreground
            if (isRecognitionActive) {
                recognition.start();
            }
        }
    });

    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
        // Reinitialize audio contexts after orientation change
        setTimeout(() => {
            if (isRecognitionActive) {
                recognition.stop();
                recognition.start();
            }
        }, 500);
    });
}

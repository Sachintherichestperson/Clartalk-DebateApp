const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const expressSession = require("express-session");
const { sendPushNotificationAll, sendPushNotification } = require("./services/firebase");
const agenda = require("./services/Agenda");
const path = require("path");
const user = require("./router/user");
const creator = require("./router/creator");
const db = require("./config/mongoose-connection");
const flash = require("connect-flash");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Message = require("./mongoose/messages-mongo");
const comments = require("./mongoose/comment-mongoose");
const Community = require("./mongoose/community-mongo");
const liveMongo = require("./mongoose/live-mongo");
const vediomongoose = require("./mongoose/video-mongo");
const podcastmongoose = require("./mongoose/podcasts-mongo");
const User = require("./mongoose/user-mongo");
const server = createServer(app);
const io = new Server(server);
const axios = require("axios");
require('dotenv').config();
const SendEmail = require("./config/nodemailer");
const fs = require("fs");

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use("/uploads", express.static(uploadDir));


app.use(
  expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.EXPRESS_SESSION_SECRET,
  })
);

app.get("/firebase-config", (req, res) => {
    res.json({
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
    });
});

app.post("/generate-ai-comment", async (req, res) => {
    try {
        const { text, videoId, videoType, userId } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        const openRouterResponse = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "openai/gpt-4o",
                messages: [
                    { role: "system", content: "You are an AI that generates short, engaging, and natural-sounding comments for live debates, in Romanized Hindi. Keep it brief and conversational." },
                    { role: "user", content: `Debate transcript: "${text}". Provide a short, natural comment in Romanized Hindi. No over-explaining—just a quick reaction like a real person, Avoid complex or formal words.` }
                ],
                max_tokens: 100,
                temperature: 0.7,
                top_p: 0.9
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.COMMENT_API_KEY}`,
                    "HTTP-Referer": "http://localhost:3000",
                    "Content-Type": "application/json"
                }
            }
        );

        const aiComment = openRouterResponse.data.choices[0].message.content.trim();

        const users = ["Akshay Singh", "Shivam Rathore", "Delisha Agarwal", "Saurabh", "Amit Trivedi", "Sudiksha Agarwal", "Nitin", "Shraddha Jain", "Rohit Sharma"];
        const user = users[Math.floor(Math.random() * users.length)];
        console.log(user);


        const aiUserId = "65a9f9d7e4b0e4c3f4b67891";

        const newAIComment = new comments({
            text: text,
            userId: user,
            videoType: videoType || "live",
            liveId: videoId
        });
        return res.json({ comment: aiComment });

    } catch (error) {
        console.error("Error fetching AI comment:", error.response?.data || error.message);
        return res.status(500).json({ error: "Failed to generate AI comment" });
    }
});

app.post("/generate-ai-feedback", async (req, res) => {
    try {
        const { text, videoId, videoType, userId } = req.body;

        // AI feedback generation (using OpenRouter or similar service)
        const openRouterResponse = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "openai/gpt-4o",
                messages: [
                    { 
                        "role": "system", 
                        "content": "You are an AI that provides professional and constructive feedback on live debates. Your response should focus primarily on the content of the argument, its structure, and its persuasiveness. The tone should be professional, encouraging, and insightful. Focus less on grammatical issues unless they significantly impact the clarity of the message."
                      },
                    { 
                        role: "user", 
                        content: `Debate transcript: "${text}".Analyze the debate and provide structured feedback in a professional tone with the following format:
                        
                        1. Strengths: Highlight what the user did well in terms of argument clarity, persuasion, or delivery.
                        2. Areas for Improvement: Identify specific weaknesses or points where the debate could have been stronger.
                        3. Suggestions for Improvement: Provide practical, actionable advice to enhance debating skills.
                        
                        Keep the feedback concise, insightful, and professional.` 
                    }
                ],
                max_tokens: 500,
                temperature: 0.7,
                top_p: 0.9
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.FEEDBACK_API_KEY}`,
                    "HTTP-Referer": "http://localhost:3000",
                    "Content-Type": "application/json"
                }
            }
        );

        // Extract AI feedback from the response
        const aiFeedback = openRouterResponse.data.choices[0].message.content.trim();
        return res.json({ feedback: aiFeedback });

    } catch (error) {
        console.error("Error fetching AI feedback:", error.response?.data || error.message);
        return res.status(500).json({ error: "Failed to generate AI feedback" });
    }
});   




app.use(flash());

app.use("/", user);
app.use("/creator", creator);

const rooms = {}; 

io.on("connection", (socket) => {
    socket.on("joinCommunity", async (communityId) => {
        try {
            const community = await Community.findById(communityId).populate({
                path: "Messages",
                select: "Message sender"
            });
            socket.emit("allMessages", community.Messages);
        } catch (err) {
            console.error(err);
        }
    });

    socket.on("chatMessage", async (data) => {
        try {
            // Emit the message to all users immediately
            io.emit("chatMessage", data);
    
            // Save the message asynchronously
            const newMessage = new Message({
                Message: data.message,
                sender: data.username
            });
    
            await newMessage.save();
    
            // Push message ID to community messages
            await Community.findByIdAndUpdate(
                data.communityId,
                { $push: { Messages: newMessage._id } }
            );
    
        } catch (error) {
            console.error("Error sending message:", error);
        }
    });
    
    socket.on("Follow", async (data) => {
        try {
            const { creatorId, UserId } = data;
    
            const [creator, user] = await Promise.all([
                User.findById(creatorId),
                User.findOne({ username: UserId })
            ]);
    
            if (!user || !creator) {
                console.log("❌ User or Creator not found:", { creator, user });
                return;
            }
    
            const fcm = creator.fcmToken;
            let isFollowing;
    
            if (!user.following.includes(creatorId)) {
    
                user.following.push(creatorId);
                creator.followers.push(user._id);
                creator.followersCount += 1;
                isFollowing = true;
    
                await Promise.all([user.save(), creator.save()]);
    
                if (fcm) {
                    sendPushNotification(fcm, `New Follower`, `${user.username} followed you`, "Follow")
                        .catch(err => console.error("❌ Notification Error:", err));
                }
            } else {
    
                user.following.pull(creatorId);
                creator.followers.pull(user._id);
                creator.followersCount -= 1;
                isFollowing = false;
    
                await Promise.all([user.save(), creator.save()]);
            }
    
            io.emit("FollowStatusUpdated", { 
                creatorId, 
                UserId, 
                isFollowing, 
                followersCount: creator.followers.length 
            });
    
        } catch (error) {
            console.error("❌ Follow event error:", error);
        }
    });
    
    socket.on("VideonewComment", async (data) => {
        try {
            const user = await User.findById(data.userId);
            if (!user) return;
    
            const newComment = await comments.create({
                text: data.text,
                userId: data.userId,
                videoType: data.videoType,
                vedioId: data.vedioId
            });
    
            // ⚡ Use bulk update instead of separate calls
            await Promise.all([
                vediomongoose.findByIdAndUpdate(data.vedioId, { $push: { comment: newComment._id } }),
                podcastmongoose.findByIdAndUpdate(data.vedioId, { $push: { comment: newComment._id } }),
                liveMongo.findByIdAndUpdate(data.vedioId, { $push: { comment: newComment._id } })
            ]);
    
            // Send comment update instantly
            io.emit("addComment", {
                text: newComment.text,
                image: user.profile ? `${user.profile}` : "/images/Default.avif",
                username: user.username,
            });
    
        } catch (error) {
            console.error("Error saving comment:", error);
        }
    });

    socket.on("livenewComment", async (data) => {
        try {
            const user = await User.findById(data.userId);
            if (!user) {
                console.error("User not found");
                return;
            }
    
            // Emit the comment immediately for faster UI updates
            const profileImage = user.profile
                ? `data:image/png;base64,${user.profile.toString("base64")}`
                : "/images/default.png"; // Default profile picture
    
            io.emit("liveaddComment", {
                text: data.text,
                image: profileImage,
                username: user.username,
            });
    
            
            const newComment = new comments({
                text: data.text,
                userId: data.userId,
                videoType: "live",
                liveId: data.liveId
            });
    
            await newComment.save();
    
            
            await liveMongo.findByIdAndUpdate(
                data.liveId,
                { $push: { comment: newComment._id } }
            );
    
            
            fetch("http://localhost:3000/generate-ai-comment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: data.text,
                    videoId: data.vedioId,
                    videoType: data.videoType,
                    userId: data.userId
                })
            }).catch(err => console.error("AI Comment API Error:", err));
    
        } catch (error) {
            console.error("Error saving comment:", error);
        }
    });
    
    socket.on("livequestions", async (data) => {
        try {
            io.emit("liveaddquestion", {
                questions: data.questions,
            });
    
            await liveMongo.findByIdAndUpdate(
                data.liveId,
                { $push: { Questions: data.questions } }
            );
    
        } catch (err) {
            console.error("Error saving question:", err);
        }
    });
    
    socket.on("join-room", (roomId, userType) => {
            socket.join(roomId);
            if (!rooms[roomId]) rooms[roomId] = [];
            rooms[roomId].push({ id: socket.id, type: userType });
    
            socket.to(roomId).emit("new-user", socket.id, userType);
            socket.to(roomId).emit("user-connected"); 
    });

    socket.on("leave-room", (roomId) => {
        socket.leave(roomId);
       io.to(roomId).emit("user-disconnected", socket.id);
    });
        
    socket.on("offer", (offer, receiverId) => {
        io.to(receiverId).emit("offer", offer, socket.id);
    });
    
    socket.on("answer", (answer, senderId) => {
        io.to(senderId).emit("answer", answer, socket.id);
    });
    
    socket.on("ice-candidate", (candidate, receiverId) => {
        io.to(receiverId).emit("ice-candidate", candidate, socket.id);
    });      

    socket.on("join_room", (roomId) => {
        socket.join(roomId);
    });
    
    socket.on("send_otp", (data) => {
        const { otp, roomId } = data;
    
        socket.to(roomId).emit("receive_otp", { otp });
    });

    socket.on("verify_otp", (data) => {
        const { enteredOTP, roomId } = data;
    
        io.to(roomId).emit("otp_success");
    });
    
    socket.on("end_call_redirect", ({ roomId }) => {
        io.to(roomId).emit("redirect_to_home");
    });        

    socket.on("disconnect", () => {
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);
            io.to(roomId).emit("user-disconnected", socket.id);
        }
    });
});

server.listen(3000);
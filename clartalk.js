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
require('dotenv').config();
const OpenAI = require('openai');

const allusers = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

const cors = require('cors');
app.use(cors({ origin: '*' }));  // Allow all origins (for testing)

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

const axios = require("axios");

const COHERE_API_KEY = process.env.Cohere_API_KEY

// app.post("/generate-ai-comment", async (req, res) => {
//     try {
//         const { text, videoId, videoType, userId } = req.body;

//         if (!text) {
//             return res.status(400).json({ error: "Text is required" });
//         }

//         const deepSeekResponse = await axios.post(
//             "https://api.deepseek.com/v1/chat/completions",
//             {
//                 model: "deepseek-chat",
//                 messages: [
//                     { role: "system", content: "You are a helpful debate assistant providing insightful comments on debates." },
//                     { role: "user", content: `Debate transcript: "${text}". Provide a brief AI-generated comment related to the discussion.` }
//                 ],
//                 temperature: 0.7
//             },
//             {
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${DEEPSEEK_API_KEY}`
//                 }
//             }
//         );

//         const aiComment = deepSeekResponse.data.choices[0].message.content;
//         return res.json({ comment: aiComment });

//     } catch (error) {
//         console.error("Error fetching AI comment:", error);
//         return res.status(500).json({ error: "Failed to generate AI comment" });
//     }
// });


app.post("/generate-ai-comment", async (req, res) => {
    try {
        const { text, videoId, videoType, userId } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        const cohereResponse = await axios.post(
            "https://api.cohere.ai/generate",
            {
                model: "command", // Cohere's best model
                prompt: `Debate transcript: "${text}". Provide a brief AI-generated comment related to the discussion.`,
                max_tokens: 100,
                temperature: 0.7
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${COHERE_API_KEY}`
                }
            }
        );

        const aiComment = cohereResponse.data.generations[0].text.trim();
        return res.json({ comment: aiComment });

    } catch (error) {
        console.error("Error fetching AI comment:", error.response?.data || error.message);
        return res.status(500).json({ error: "Failed to generate AI comment" });
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
        const newMessage = await Message.create({
            Message: data.message,
            sender: data.username
        });

        const community = await Community.findById(data.communityId);
        community.Messages.push(newMessage._id);
        await community.save();

        io.emit("chatMessage", data);
    });

    socket.on("Follow", async (data) => {
        const { creatorId, UserId } = data;

        const creator = await User.findById(creatorId);
        const user = await User.findOne({ username: UserId });

        if (!user || !creator) {
            console.log('User or Creator not found');
            return;
        }

        const fcm = creator.fcmToken;

        if (fcm) {
            await sendPushNotification(fcm, `New Follower `, `${user.username} followed you`, "Follow");
        }

        if (!user.following.includes(creatorId)) {
            user.following.push(creatorId);
            creator.followers.push(user._id);
            creator.followersCount += 1;

            await user.save();
            await creator.save();

            io.emit("FollowStatusUpdated", { creatorId, UserId, isFollowing: true, followersCount: creator.followers.length });
        } else {
            user.following.pull(creatorId);
            creator.followers.pull(user._id);
            creator.followersCount -= 1;

            await user.save();
            await creator.save();

            io.emit("FollowStatusUpdated", { creatorId, UserId, isFollowing: false, followersCount: creator.followers.length });
        }
    });

    socket.on("VideonewComment", async (data) => {
        try {
            const user = await User.findById(data.userId);
            if (!user) {
                console.error("User not found");
                return;
            }
    
            // Save the comment to MongoDB
            const newComment = await comments.create({
                text: data.text,
                userId: data.userId,
                videoType: data.videoType,
                vedioId: data.vedioId
            });
            
           let fcmToken;
           let title;
           let username;

            if (data.videoType === "debate") {
                    const vedio = await vediomongoose.findById(data.vedioId).populate("creator");
                    vedio.comment.push(newComment);
                    await vedio.save();
                    
                    fcmToken = vedio.creator[0].fcmToken
                    title = vedio.title
                    username = vedio.username
            } else {
                const podcast = await podcastmongoose.findById(data.vedioId);
                podcast.comment.push(newComment);
                await podcast.save();
                fcmToken = podcast.creator[0].fcmToken
                title = podcast.title
                username = podcast.username
            }

            if(fcmToken){
                await sendPushNotification(fcmToken, `New Comment On ${title}`, `${user.username}: ${newComment.text}`, "Comment")
            }

    
            // Convert profile image to Base64 (if available)
            const profileImage = user.profile
                ? `data:image/png;base64,${user.profile.toString("base64")}`
                : "/images/default.png"; // Default profile picture
    
            // Emit the saved comment to all clients
            io.emit("addComment", {
                text: newComment.text,
                image: profileImage,
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
    
            // Save the comment to MongoDB
            const newComment = await comments.create({
                text: data.text,
                userId: data.userId,
                videoType: "live",
                liveId: data.liveId
            });

            console.log("comments", newComment);

            
                const live = await liveMongo.findById(data.liveId);
                live.comment.push(newComment);
                console.log(live);

                await live.save();
            
            
    
            // Convert profile image to Base64 (if available)
            const profileImage = user.profile
                ? `data:image/png;base64,${user.profile.toString("base64")}`
                : "/images/default.png"; // Default profile picture
    
            // Emit the saved comment to all clients
            io.emit("liveaddComment", {
                text: newComment.text,
                image: profileImage,
                username: user.username,
            });
            const response = await fetch("http://localhost:3000/generate-ai-comment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: data.text,
                    videoId: data.vedioId,
                    videoType: data.videoType,
                    userId: data.userId
                })
            });
    
        } catch (error) {
            console.error("Error saving comment:", error);
        }
    });

    socket.on("livequestions", async (data) => {
        try {

            const question = await liveMongo.findById(data.liveId);
            question.Questions.push(data.questions);
            await question.save();


            io.emit("liveaddquestion", {
                questions: question.Questions,
            });

        }catch(err){
            console.log(err);
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
            console.log(`User ${socket.id} joined room ${roomId}`);
        });
    
        // Sending OTP to the other streamer
        socket.on("send_otp", (data) => {
            const { otp, roomId } = data;
    
            // Broadcast OTP to the other streamer in the room (excluding sender)
            socket.to(roomId).emit("receive_otp", { otp });
        });
    
        // Verifying OTP and notifying both streamers
        socket.on("verify_otp", (data) => {
            const { enteredOTP, roomId } = data;
    
            io.to(roomId).emit("otp_success");
        });
    
        // Redirecting both streamers
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

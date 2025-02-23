const express = require("express");
const app = express();
const admin = require("firebase-admin")
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const expressSession = require("express-session");
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
const bodyParser = require("body-parser");
const server = createServer(app);
const io = new Server(server);

const allusers = {};

require("dotenv").config();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

const cors = require('cors');
app.use(cors({ origin: '*' }));  // Allow all origins (for testing)


const serviceAccount = require("./notification.json"); // Replace with your JSON file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(
  expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.EXPRESS_SESSION_SECRET,
  })
);

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
            console.log("comments",newComment);

            if (data.videoType === "debate") {
                    const vedio = await vediomongoose.findById(data.vedioId);
                    vedio.comment.push(newComment);
                    console.log(vedio);

                    await vedio.save();
            } else {
                const podcast = await podcastmongoose.findById(data.vedioId);
                podcast.comment.push(newComment);
                await vedio.save();
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

        socket.on('offer', (offer) => {
            socket.broadcast.emit('offer', offer);
        });
    
        socket.on('answer', (answer) => {
            socket.broadcast.emit('answer', answer);
        });
    
        socket.on('ice-candidate', (candidate) => {
            socket.broadcast.emit('ice-candidate', candidate);
        });
    
        socket.on('disconnect', () => {
            socket.broadcast.emit('user-disconnected', socket.id);
        });
    });

server.listen(3000, "0.0.0.0", () => {
    console.log("Server running on port 3000 and accessible on network");
})

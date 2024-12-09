const express = require("express");
const app = express();
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
const Community = require("./mongoose/community-mongo");
const liveMongo = require("./mongoose/live-mongo");
const debatemongoose = require("./mongoose/debate-mongo");
const User = require("./mongoose/user-mongo")

const server = createServer(app);  // Create an HTTP server with Express
const io = new Server(server);     // Initialize Socket.IO server

const allusers = {};  // Store connected users (optional, for managing chat state)

require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(
  expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.EXPRESS_SESSION_SECRET,
  })
);

app.use(flash());

// Routers
app.use("/", user);
app.use("/creator", creator);


io.on("connection", (socket) => {

//chat community
socket.on("joinCommunity",async (communityId) => {
  try{
      const community = await Community.findById(communityId).populate({
        path: "Messages",
        select: "Message sender"
  });
      socket.emit("allMessages", community.Messages);
  }catch(err){
       console.error(err);
  }
});
socket.on("chatMessage",async (data) => {
    const newMessage = await Message.create({
      Message: data.message,
      sender: data.username
  });

    const community = await Community.findById(data.communityId);
    community.Messages.push(newMessage._id);
    await community.save();


    io.emit("chatMessage", data);
});
//chat community end here

socket.on("Follow", async (data) => {
  const { creatorId, UserId } = data;

  const creator = await User.findById(creatorId);  // Creator user
  const user = await User.findOne({ username: UserId });  // Logged-in user

  if (!user) {
    console.log('User not found');
    return;
  }

  if (!creator) {
    console.log('Creator not found');
    return;
  }

  // Check if the user is following the creator
  if (!user.following.includes(creatorId)) {
    // Follow: Add creator to user's following and vice versa
    user.following.push(creatorId);
    creator.followers.push(user._id);  // Add user to creator's followers list
    creator.followersCount += 1;  // Increment followers count

    // Save both user and creator data
    await user.save();
    await creator.save();

    // Emit the updated follow status with the new follower count
    io.emit("FollowStatusUpdated", { creatorId, UserId, isFollowing: true, followersCount: creator.followers.length  });
  } else {
    // Unfollow: Remove creator from user's following and vice versa
    user.following.pull(creatorId);
    creator.followers.pull(user._id);
    creator.followersCount -= 1;  // Decrement followers count

    // Save both user and creator data
    await user.save();
    await creator.save();

    // Emit the updated follow status with the new follower count
    io.emit("FollowStatusUpdated", { creatorId, UserId, isFollowing: false, followersCount: creator.followers.length  });
  }
});


});
// Start the server
server.listen(3000);

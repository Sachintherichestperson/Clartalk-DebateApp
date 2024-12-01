const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
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
})

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

});

// Start the server
server.listen(3000);

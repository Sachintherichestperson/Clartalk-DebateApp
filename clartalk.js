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

const server = createServer(app);
const io = new Server(server);
const allusers = {};

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


server.listen(3000, () => console.log("Server running at http://localhost:3000"));

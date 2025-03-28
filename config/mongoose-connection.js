const mongoose = require("mongoose");
const dbgr = require("debug")("development:mongoose");
const config = require("config");

// const MONGO_URI = process.env.MONGO_URI || config.get("MONGODB_URI") || "mongo"

mongoose.connect("mongodb://localhost:27017/clartalk")
.then(() => dbgr("MongoDB Connected! 🚀"))
.catch((err) => dbgr("MongoDB Connection Error:"));

module.exports = mongoose.connection;

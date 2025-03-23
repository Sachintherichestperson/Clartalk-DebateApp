const mongoose = require("mongoose");
const dbgr = require("debug")("development:mongoose");
const config = require("config");

const MONGO_URI = process.env.MONGO_URI || config.get("MONGODB_URI");

mongoose
  .connect(MONGO_URI) // ✅ No extra `/debateapp`
  .then(() => dbgr("MongoDB Connected! 🚀"))
  .catch((err) => dbgr("MongoDB Connection Error:", err));

module.exports = mongoose.connection;

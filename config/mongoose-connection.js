const mongoose = require("mongoose");
const dbgr = require("debug")("development:mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/debateapp"; // Use env variable or local DB

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => dbgr("Connected to MongoDB"))
  .catch(err => dbgr("MongoDB Connection Error:", err));

module.exports = mongoose.connection;

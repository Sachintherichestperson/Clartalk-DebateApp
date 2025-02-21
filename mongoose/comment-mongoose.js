const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    text: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    videoType: { type: String, enum: ["debate", "podcast", "live"], required: true },
    videoId: {type: mongoose.Schema.Types.ObjectId}
});

module.exports = mongoose.model("comments", commentSchema);

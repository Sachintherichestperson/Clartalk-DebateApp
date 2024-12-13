const mongoose = require('mongoose');

const debateSchema = new mongoose.Schema({
    title: String,
    description: String,            
    vedio: Buffer,
    Thumbnail: Buffer,
    creator: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"  
    }],
    createdAt: {
        type: Date,
        default: Date.now
      },
    Views: {
        type: Number,
        default: 0
    },
    viewedBy: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
      }],
    LikedBy: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
      }],
    WatchHours: [{
      type: Number,
      default: 0
    }]
});

module.exports = mongoose.model('debate', debateSchema);
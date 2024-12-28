const mongoose = require('mongoose');


const videoSchema = new mongoose.Schema({
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
        validate: {
          validator: function (v) {
            return typeof v === 'number' && v >= 0; // Validate that it's a positive number
          },
          message: props => `${props.value} is not a valid watch time!`
        },
        default: 0
      }]
});

module.exports = mongoose.model('vedio', videoSchema);
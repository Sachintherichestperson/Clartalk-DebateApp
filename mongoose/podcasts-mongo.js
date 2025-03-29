const mongoose = require('mongoose');

const podcastsSchema = new mongoose.Schema({
    title: String,
    description: String,            
    vedio: String,
    Thumbnail: String,
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
      }],
      Tags: [{
        type: String,
        default: []
      }],
      comment: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "comments"
      }]
});

module.exports = mongoose.model('podcasts', podcastsSchema);
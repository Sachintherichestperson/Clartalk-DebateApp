const mongoose = require('mongoose');

const vedioSchema = new mongoose.Schema({
    title: String,
    description: String,            
    vedio: Buffer,
    Thumbnail: Buffer,
    creator: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"  
    }],
    Stream: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "fs.files" 
    }],
    Views: {
        type: Number,
        default: 0
    },
    opponent:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    Time: String,
    status: {
        type: String,
        default: "pending"
    },
    Booking: {
        type: Number,
        default: 0
    },
    BookingDoneBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    Type: {
        type: String,
        enum: ['trending', 'regular'], // 'trending' if radio selected, 'regular' otherwise
        default: 'regular',
    },
    viewedBy: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User" 
          }],
    LiveStatus: {
        type: String,
        enum: ['Processing', 'Live', 'Ended'],
        default: 'Processing'
    },
    comment: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "comments"
    }],
    Questions: { type: [String]}
});

module.exports = mongoose.model('live', vedioSchema);
const mongoose = require('mongoose');

const vedioSchema = new mongoose.Schema({
    title: String,
    description: String,
    Thumbnail: String,
    creator: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"  
    }],
    Stream: {
        type: String,
    },
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
        enum: ['trending', 'regular'],
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
    Questions: { type: [String]},
    DebateSupport: {
        type: String,
        enum: ['Support', 'Against']
    }
});

module.exports = mongoose.model('live', vedioSchema);
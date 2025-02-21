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
    EndingTime: String,
    LiveStatus: {
        type: String,
        enum: ['Processing', 'Live', 'Ended'],
        default: 'Processing'
    }
});

module.exports = mongoose.model('live', vedioSchema);
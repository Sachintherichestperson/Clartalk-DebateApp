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
    }]
});

module.exports = mongoose.model('live', vedioSchema);
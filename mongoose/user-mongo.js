const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({    
    username: String,
    email: String,
    password: String,
    communities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
    vedio: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "vedio"
    }],
    debate: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "debate"
    }],
    profile: Buffer,
    followers: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' 
    }],
    following: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' 
    }],
    Live: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "live"
    }],
    requests: [
        {
            OpponentName: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'live' },
            creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            title: String,
            description: String,
            status: { type: String, default: 'pending' }
        }
    ],
    Sender:  [
        {
            OpponentName: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
            requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'live' },
            creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            title: String,
            description: String,
            status: { type: String, default: 'pending' }
        }
    ]
});

module.exports = mongoose.model('User', userSchema);

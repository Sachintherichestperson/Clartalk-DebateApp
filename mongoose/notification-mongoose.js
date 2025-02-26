const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    notificationType: { type: String, required: true },      
    title: { type: String, required: true },
    body: {type: String, required: true },
    notificationTime: { type: Date, default: Date.now },
    notificationTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('notification', notificationSchema);

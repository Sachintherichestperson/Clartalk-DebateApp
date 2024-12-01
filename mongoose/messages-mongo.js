const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const msgSchema = new Schema({
  Message: { type: String, required: true },
  sender: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Messages', msgSchema);
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const communitySchema = new Schema({
  CommunityName: { type: String, required: true },      
  CommunityisAbout: { type: String },
  CommunityDP: Buffer,                
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  Messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Messages' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Community', communitySchema);

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CompetitionSchema = new Schema({
  CompetitionName: { type: String, required: true },      
  CompetitionisAbout: { type: String },
  CompetitionDP: Buffer,               
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Competition', CompetitionSchema);
import mongoose from 'mongoose';

const KakobuyEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  registrations: {
    type: Number,
    required: true,
    default: 0,
  },
  activeMembers: {
    type: Number,
    default: 0,
  },
  predictedMembers: {
    type: Number,
    default: 0,
  },
  revenue: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

export default mongoose.models.KakobuyEntry || mongoose.model('KakobuyEntry', KakobuyEntrySchema);

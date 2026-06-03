import mongoose from 'mongoose';

const EarningsEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  saleCNY: {
    type: Number,
    required: true,
    default: 0,
  },
  commissionRate: {
    type: Number,
    default: 30, // percent
  },
  note: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

export default mongoose.models.EarningsEntry ||
  mongoose.model('EarningsEntry', EarningsEntrySchema);

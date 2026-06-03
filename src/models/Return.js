import mongoose from 'mongoose';

const ReturnSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  returnAmountCNY: {
    type: Number,
    required: true,
    default: 0,
  },
  productRef: {
    type: String,
    default: '',
  },
  reason: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Return ||
  mongoose.model('Return', ReturnSchema);

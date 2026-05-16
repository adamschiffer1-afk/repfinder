import mongoose from 'mongoose';

const StatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['page_view', 'product_click'],
    required: true,
  },
  productId: {
    type: String, // String to support both MongoDB ObjectIds and local fallback IDs
  },
  agent: {
    type: String, // Shipping agent (e.g., 'kakobuy', 'allchinabuy')
  },
  userAgent: {
    type: String, // Browser/Device info
  },
  path: {
    type: String, // Page path (e.g., '/', '/products', '/qc')
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.Stat || mongoose.model('Stat', StatSchema);

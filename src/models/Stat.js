import mongoose from 'mongoose';

const StatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['page_view', 'product_click', 'error_log'],
    required: true,
  },
  productId: {
    type: String, // Supporting both MongoDB ObjectIds and local fallback IDs
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
  country: {
    type: String, // Two-letter country code (e.g., 'PL', 'US', 'DE')
    default: 'Unknown',
  },
  errorMessage: {
    type: String, // For error logs
  },
  errorStack: {
    type: String, // For error logs
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.Stat || mongoose.model('Stat', StatSchema);

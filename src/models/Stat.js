import mongoose from 'mongoose';

const StatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['page_view', 'product_click', 'error_log', 'engagement'],
    required: true,
  },
  productId: {
    type: String, // Supporting both MongoDB ObjectIds and local fallback IDs
  },
  agent: {
    type: String, // Shipping agent (e.g., 'kakobuy', 'allchinabuy')
  },
  visitorId: {
    type: String, // UUID for unique visitor tracking
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
  referrer: {
    type: String, // Referral source URL
  },
  utmSource: {
    type: String, // UTM parameters
  },
  utmCampaign: {
    type: String, // UTM parameters
  },
  scrollDepth: {
    type: Number, // Percentage of page scrolled (0-100)
  },
  timeSpent: {
    type: Number, // Time spent on page in seconds
  },
  errorMessage: {
    type: String, // For error logs
  },
  errorStack: {
    type: String, // For error logs
  },
  breadcrumbs: {
    type: [String], // Sentry-style user action breadcrumbs before an error
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.Stat || mongoose.model('Stat', StatSchema);

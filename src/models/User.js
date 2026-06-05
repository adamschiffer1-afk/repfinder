import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  discordId: {
    type: String,
    unique: true,
    sparse: true, // Allow null values
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allow null values
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    default: '',
  },
  image: {
    type: String,
    default: '',
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  provider: {
    type: String,
    enum: ['discord', 'google'],
    required: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
});

export default mongoose.models.User || mongoose.model('User', UserSchema);

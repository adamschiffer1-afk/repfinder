import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for this product.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  slug: {
    type: String,
    sparse: true,
    index: true
  },
  price: {
    type: Number,
    required: [true, 'Please provide a price.'],
  },
  image: {
    type: String,
    required: [true, 'Please provide an image URL.'],
  },
  category: {
    type: String,
    required: [true, 'Please provide a category.'],
  },
  batch: {
    type: String,
    enum: ['best', 'budget', 'random'],
    default: 'random',
  },
  link: {
    type: String,
    required: [true, 'Please provide a product link.'],
  },
  clicks: {
    type: Number,
    default: 0,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  imageVector: {
    type: [Number],
    select: false, // Ukryte domyślnie, by nie obciążać zapytań
  },
  qcImages: {
    type: [String],
    default: [],
  },
  pinnedOrder: {
    type: Number,
    default: null,
  }
}, {
  timestamps: true,
});

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);

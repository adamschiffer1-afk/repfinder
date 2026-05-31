const mongoose = require('mongoose');
require('dotenv').config({path: '.env.local'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Stat = require('./src/models/Stat').default;
  const Product = require('./src/models/Product').default;
  const top = await Stat.aggregate([
    { $match: { type: 'product_click', productId: { $ne: null, $ne: '' } } },
    { $group: { _id: '$productId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  console.log('Top IDs:', top);
  process.exit(0);
});

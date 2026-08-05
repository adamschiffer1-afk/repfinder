require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Stat = require('./src/models/Stat');

async function reset() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const result = await Stat.deleteMany({});
    console.log(`Deleted ${result.deletedCount} stats.`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting stats:', error);
    process.exit(1);
  }
}

reset();

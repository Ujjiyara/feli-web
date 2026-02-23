const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Event = require('./src/models/Event');

async function count() {
  await mongoose.connect(process.env.MONGODB_URI);
  const total = await Event.countDocuments({ status: { $in: ['PUBLISHED', 'ONGOING'] } });
  console.log(`Total active events: ${total}`);
  process.exit(0);
}
count();

const mongoose = require('mongoose');
const Event = require('./src/models/Event');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/felicity')
  .then(async () => {
    const event = await Event.findOne({ type: 'MERCHANDISE' }).sort({ createdAt: -1 });
    console.log("Latest Merch Event Stock:");
    event.merchandiseItems.forEach(item => {
      console.log(`- ${item.name}: ${item.stock} in stock`);
    });
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

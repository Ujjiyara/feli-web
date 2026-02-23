const mongoose = require('mongoose');
const Event = require('./backend/src/models/Event');

mongoose.connect('mongodb://localhost:27017/felicity')
  .then(async () => {
    const event = await Event.findOne({ type: 'MERCHANDISE' }).sort({ createdAt: -1 });
    console.log("Latest Merch Event:", JSON.stringify(event.merchandiseItems, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

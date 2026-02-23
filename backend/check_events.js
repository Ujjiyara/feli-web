const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Event = require('./src/models/Event');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const events = await Event.find().sort({ createdAt: -1 }).limit(5);
  events.forEach(e => {
    console.log(`Event: ${e.name} | Status: ${e.status} | Start: ${e.startDate} | Deadline: ${e.registrationDeadline}`);
  });
  process.exit(0);
}
check();

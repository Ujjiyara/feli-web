const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const Event = require('./backend/src/models/Event');

async function extend() {
  await mongoose.connect(process.env.MONGODB_URI);
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5); 
  await Event.updateMany({ name: 'Hackathon 2026' }, { registrationDeadline: futureDate });
  console.log('Deadline extended');
  process.exit(0);
}
extend();

const mongoose = require('mongoose');
const { Registration, Event } = require('./src/models');
require('dotenv').config({ path: './.env' });

async function verifyEvents() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const registrations = await Registration.find({})
    .populate({
      path: 'eventId',
      select: 'name type organizerId startDate endDate status'
    })
    .sort({ createdAt: -1 });

  const now = new Date();
  const upcoming = [];
  const completed = [];

  registrations.forEach(reg => {
    if (!reg.eventId) return;
    const event = reg.eventId;
    
    // Exact logic from participantController
    const isCompletedEvent = event.status === 'COMPLETED' || new Date(event.endDate) < now;
    
    const statusToUse = isCompletedEvent && event.status !== 'CANCELLED' ? 'COMPLETED' : event.status;
    
    if (reg.status === 'ATTENDED' || new Date(event.endDate) < now || event.status === 'COMPLETED') {
        completed.push({ name: event.name, endDate: event.endDate, computedStatus: statusToUse, now });
    } else {
        upcoming.push({ name: event.name, endDate: event.endDate, computedStatus: statusToUse, now });
    }
  });

  console.log('--- UPCOMING ---');
  upcoming.forEach(e => console.log(e));
  
  console.log('\n--- COMPLETED ---');
  completed.forEach(e => console.log(e));

  mongoose.disconnect();
}

verifyEvents().catch(console.error);

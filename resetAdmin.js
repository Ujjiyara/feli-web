require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Admin = require('./backend/src/models/Admin');

const reset = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const admin = await Admin.findOne({ email: 'admin@felicity.iiit.ac.in' });
    if (admin) {
      admin.password = 'Admin@123';
      await admin.save();
      console.log('Admin password reset to Admin@123');
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
reset();

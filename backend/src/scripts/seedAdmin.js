require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Organizer = require('../models/Organizer');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create Admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@felicity.iiit.ac.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    const existingAdmin = await Admin.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('Admin already exists:', adminEmail);
      existingAdmin.password = adminPassword;
      await existingAdmin.save();
      console.log('Password forcibly reset to match seed for E2E tests.');
    } else {
      await Admin.create({ email: adminEmail, password: adminPassword });
      console.log('\n✅ Admin created!');
      console.log('   Email:', adminEmail);
      console.log('   Password:', adminPassword);
    }

    // Create Test Organizer
    const orgEmail = 'techclub@felicity.iiit.ac.in';
    const orgPassword = 'TechClub@123';

    const existingOrg = await Organizer.findOne({ email: orgEmail });
    
    if (existingOrg) {
      console.log('\nOrganizer already exists:', orgEmail);
    } else {
      await Organizer.create({
        name: 'Tech Club',
        email: orgEmail,
        password: orgPassword,
        category: 'Technical',
        description: 'The official Technical Club of IIIT',
        isActive: true
      });
      console.log('\n✅ Test Organizer created!');
      console.log('   Email:', orgEmail);
      console.log('   Password:', orgPassword);
    }

    console.log('\n🎉 Seed complete! You can now login as Admin or Organizer.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

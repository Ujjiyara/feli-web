#!/usr/bin/env node
/**
 * seedEval.js — Comprehensive Evaluation Seed Script
 * 
 * Clears ALL existing data (except Admin) and seeds:
 *   - 10 Organizers
 *   - 12 Events (8 normal + 3 merchandise + 1 hackathon)
 *   - 8 Test Participants
 *   - Registrations with attendance for completed events
 * 
 * Usage:  cd backend && node src/scripts/seedEval.js
 *   or:   npm run seed:eval
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

// Models
const User = require('../models/User');
const Organizer = require('../models/Organizer');
const Admin = require('../models/Admin');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const DiscussionMessage = require('../models/DiscussionMessage');

// ─── Helpers ───────────────────────────────────────────────────────────────────

const now = new Date();
const day = (offset) => new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);

const ORG_PASSWORD = 'Organizer@123';

async function generateQR(ticketId, eventId, participantId, eventName) {
  const qrData = JSON.stringify({ ticketId, eventId, participantId, eventName });
  return QRCode.toDataURL(qrData);
}

function ticketId(prefix = 'NOR') {
  return `FEL-${prefix}-${uuidv4().slice(0, 8).toUpperCase()}`;
}

// ─── Data Definitions ──────────────────────────────────────────────────────────

const ORGANIZERS = [
  { name: 'Chess Club',       email: 'chess@felicity.iiit.ac.in',       category: 'Sports',    description: 'Official Chess Club of IIIT Hyderabad' },
  { name: 'LitClub',          email: 'litclub@felicity.iiit.ac.in',     category: 'Literary',  description: 'Literary & Cultural Society of IIIT Hyderabad' },
  { name: 'Pentaprism',       email: 'pentaprism@felicity.iiit.ac.in',  category: 'Cultural',  description: 'Arts & Photography Club of IIIT Hyderabad' },
  { name: 'ASEC',             email: 'asec@felicity.iiit.ac.in',        category: 'Sports',    description: 'Adventure & Sports Enthusiasts Club of IIIT Hyderabad' },
  { name: 'TDC',              email: 'tdc@felicity.iiit.ac.in',         category: 'Cultural',  description: 'The Dance Collective — Performing Arts Club' },
  { name: 'Queer Collective', email: 'queer@felicity.iiit.ac.in',       category: 'Social',    description: 'Queer Collective — Social & Cultural Club' },
  { name: 'Adventure Group',  email: 'adventure@felicity.iiit.ac.in',   category: 'Other',     description: 'Adventure & Gaming Club of IIIT Hyderabad' },
  { name: 'TVRQC',            email: 'tvrqc@felicity.iiit.ac.in',       category: 'Other',     description: 'The Very Reputed Quiz Club of IIIT Hyderabad' },
  { name: 'Merchandise Team', email: 'merch@felicity.iiit.ac.in',       category: 'Other',     description: 'Official Merchandise & Sales Team for Felicity' },
  { name: 'OSDG',             email: 'osdg@felicity.iiit.ac.in',        category: 'Technical', description: 'Open Source Development Group of IIIT Hyderabad' },
];

const PARTICIPANTS = [
  { firstName: 'Aarav',    lastName: 'Sharma',    email: 'aarav.sharma@students.iiit.ac.in' },
  { firstName: 'Priya',    lastName: 'Nair',      email: 'priya.nair@students.iiit.ac.in' },
  { firstName: 'Rohan',    lastName: 'Gupta',     email: 'rohan.gupta@students.iiit.ac.in' },
  { firstName: 'Sneha',    lastName: 'Reddy',     email: 'sneha.reddy@students.iiit.ac.in' },
  { firstName: 'Arjun',    lastName: 'Patel',     email: 'arjun.patel@students.iiit.ac.in' },
  { firstName: 'Kavya',    lastName: 'Iyer',      email: 'kavya.iyer@students.iiit.ac.in' },
  { firstName: 'Diya',     lastName: 'Kapoor',    email: 'diya.kapoor@students.iiit.ac.in' },
  { firstName: 'Vikram',   lastName: 'Singh',     email: 'vikram.singh@students.iiit.ac.in' },
];

// ─── Main Seed Function ────────────────────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ── 1. Clear everything except Admin ────────────────────────────────────
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      Event.deleteMany({}),
      Registration.deleteMany({}),
      User.deleteMany({}),
      Organizer.deleteMany({}),
      PasswordResetRequest.deleteMany({}),
      DiscussionMessage.deleteMany({}),
    ]);
    console.log('   ✓ Cleared: Events, Registrations, Users, Organizers, PasswordResetRequests, DiscussionMessages\n');

    // ── 2. Ensure Admin exists ──────────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@felicity.iiit.ac.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    let admin = await Admin.findOne({ email: adminEmail });
    if (!admin) {
      admin = await Admin.create({ email: adminEmail, password: adminPassword });
      console.log('✅ Admin created:', adminEmail);
    } else {
      admin.password = adminPassword;
      await admin.save();
      console.log('✅ Admin exists (password reset):', adminEmail);
    }

    // ── 3. Create Organizers ────────────────────────────────────────────────
    console.log('\n📋 Creating Organizers...');
    const orgMap = {};
    for (const orgData of ORGANIZERS) {
      const org = await Organizer.create({
        ...orgData,
        password: ORG_PASSWORD,
        isActive: true,
      });
      orgMap[orgData.name] = org;
      console.log(`   ✓ ${orgData.name} (${orgData.email})`);
    }

    // ── 4. Create Test Participants ─────────────────────────────────────────
    console.log('\n👥 Creating Test Participants...');
    const users = [];
    for (const pData of PARTICIPANTS) {
      const user = await User.create({
        ...pData,
        password: 'Test@123',
        participantType: 'IIIT',
        collegeName: 'IIIT Hyderabad',
        contactNumber: '9' + Math.floor(100000000 + Math.random() * 900000000),
        interests: ['Technology', 'Sports', 'Cultural'],
        followedOrganizers: [],
        onboardingCompleted: true,
      });
      users.push(user);
      console.log(`   ✓ ${pData.firstName} ${pData.lastName} (${pData.email})`);
    }

    // ── 5. Create Events ────────────────────────────────────────────────────
    console.log('\n🎪 Creating Events...\n');

    // --- 5.1  UPCOMING Normal Events (4) ---
    const event1 = await Event.create({
      name: 'Chess Championship Workshop',
      description: 'An intensive chess workshop and championship featuring grandmaster tutorials, practice matches, and a competitive tournament. Open to all skill levels from beginner to advanced. Learn opening strategies, middle-game tactics, and endgame techniques from experienced players.',
      type: 'NORMAL',
      eligibility: 'ALL',
      registrationDeadline: day(7),
      startDate: day(10),
      endDate: day(11),
      registrationLimit: 50,
      registrationFee: 0,
      organizerId: orgMap['Chess Club']._id,
      tags: ['chess', 'workshop', 'tournament', 'strategy', 'board games'],
      status: 'PUBLISHED',
      customFormFields: [
        { fieldName: 'Chess Rating (if any)', fieldType: 'text', required: false, order: 1 },
        { fieldName: 'Experience Level', fieldType: 'dropdown', options: ['Beginner', 'Intermediate', 'Advanced'], required: true, order: 2 },
      ],
    });
    console.log('   ✓ [UPCOMING] Chess Championship Workshop (Chess Club)');

    const event2 = await Event.create({
      name: 'Poetry Slam Competition',
      description: 'Express yourself through the power of spoken word at IIIT\'s biggest Poetry Slam Competition. Perform original pieces on any theme, judged on content, delivery, and audience engagement. Cash prizes for top 3 performers.',
      type: 'NORMAL',
      eligibility: 'ALL',
      registrationDeadline: day(8),
      startDate: day(12),
      endDate: day(12),
      registrationLimit: 30,
      registrationFee: 0,
      organizerId: orgMap['LitClub']._id,
      tags: ['poetry', 'slam', 'literary', 'spoken word', 'performance'],
      status: 'PUBLISHED',
      customFormFields: [
        { fieldName: 'Performance Title', fieldType: 'text', required: true, order: 1 },
        { fieldName: 'Language', fieldType: 'dropdown', options: ['English', 'Hindi', 'Telugu', 'Other'], required: true, order: 2 },
      ],
    });
    console.log('   ✓ [UPCOMING] Poetry Slam Competition (LitClub)');

    const event3 = await Event.create({
      name: 'Photography Workshop',
      description: 'A hands-on photography workshop covering composition, lighting, portrait photography, and post-processing techniques. Bring your own camera (DSLR/Mirrorless preferred, but phone cameras welcome). Guest speaker from National Geographic.',
      type: 'NORMAL',
      eligibility: 'ALL',
      registrationDeadline: day(6),
      startDate: day(9),
      endDate: day(9),
      registrationLimit: 25,
      registrationFee: 0,
      organizerId: orgMap['Pentaprism']._id,
      tags: ['photography', 'workshop', 'camera', 'arts', 'creativity'],
      status: 'PUBLISHED',
      customFormFields: [
        { fieldName: 'Camera Type', fieldType: 'dropdown', options: ['DSLR', 'Mirrorless', 'Phone', 'Other'], required: true, order: 1 },
      ],
    });
    console.log('   ✓ [UPCOMING] Photography Workshop (Pentaprism)');

    const event6 = await Event.create({
      name: 'Social Mixer Event',
      description: 'A casual social gathering to meet new people across departments. Features ice-breaker games, group activities, and free refreshments. A safe and inclusive space for everyone to connect and make new friends at IIIT.',
      type: 'NORMAL',
      eligibility: 'ALL',
      registrationDeadline: day(9),
      startDate: day(14),
      endDate: day(14),
      registrationLimit: 100,
      registrationFee: 0,
      organizerId: orgMap['Queer Collective']._id,
      tags: ['social', 'mixer', 'community', 'networking', 'fun'],
      status: 'PUBLISHED',
      customFormFields: [],
    });
    console.log('   ✓ [UPCOMING] Social Mixer Event (Queer Collective)');

    // --- 5.2  ONGOING Normal Events (2) ---
    const event4 = await Event.create({
      name: 'Fitness Bootcamp',
      description: 'An intensive fitness bootcamp featuring cardio, strength training, yoga, and obstacle courses. Professional trainers guide participants through various fitness stations. Suitable for all fitness levels.',
      type: 'NORMAL',
      eligibility: 'ALL',
      registrationDeadline: day(-2),
      startDate: day(-1),
      endDate: day(2),
      registrationLimit: 40,
      registrationFee: 0,
      organizerId: orgMap['ASEC']._id,
      tags: ['fitness', 'sports', 'bootcamp', 'health', 'gym'],
      status: 'ONGOING',
      registrationCount: 0,
    });
    console.log('   ✓ [ONGOING]  Fitness Bootcamp (ASEC)');

    const event5 = await Event.create({
      name: 'Solo Dance Performance',
      description: 'Showcase your dance talent in any style — classical, contemporary, hip-hop, bollywood, or freestyle. Solo performances judged by professional choreographers. Grand prize of ₹70,000 for the winner.',
      type: 'NORMAL',
      eligibility: 'ALL',
      registrationDeadline: day(-3),
      startDate: day(-1),
      endDate: day(1),
      registrationLimit: 25,
      registrationFee: 0,
      organizerId: orgMap['TDC']._id,
      tags: ['dance', 'performance', 'solo', 'performing arts', 'competition'],
      status: 'ONGOING',
      registrationCount: 0,
    });
    console.log('   ✓ [ONGOING]  Solo Dance Performance (TDC)');

    // --- 5.3  COMPLETED Normal Events (2) — need 5+ registrations with attendance ---
    const event7 = await Event.create({
      name: 'Adventure Escape Room',
      description: 'An immersive escape room challenge combining puzzle-solving, teamwork, and quick thinking. Navigate through themed rooms with clues, locks, and hidden passages. Test your problem-solving skills in a 60-minute adrenaline rush.',
      type: 'NORMAL',
      eligibility: 'ALL',
      registrationDeadline: day(-15),
      startDate: day(-10),
      endDate: day(-5),
      registrationLimit: 30,
      registrationFee: 0,
      organizerId: orgMap['Adventure Group']._id,
      tags: ['escape room', 'adventure', 'puzzle', 'gaming', 'teamwork'],
      status: 'COMPLETED',
      registrationCount: 0,
    });
    console.log('   ✓ [COMPLETED] Adventure Escape Room (Adventure Group)');

    const event8 = await Event.create({
      name: 'Solo Quiz Competition',
      description: 'IIIT\'s flagship solo quiz competition covering general knowledge, science, history, pop culture, and current affairs. Multiple rounds with increasing difficulty. Prizes worth ₹17,500 for top 3 scorers.',
      type: 'NORMAL',
      eligibility: 'ALL',
      registrationDeadline: day(-14),
      startDate: day(-9),
      endDate: day(-4),
      registrationLimit: 50,
      registrationFee: 0,
      organizerId: orgMap['TVRQC']._id,
      tags: ['quiz', 'trivia', 'knowledge', 'competition', 'solo'],
      status: 'COMPLETED',
      registrationCount: 0,
    });
    console.log('   ✓ [COMPLETED] Solo Quiz Competition (TVRQC)');

    // --- 5.4  MERCHANDISE Events (3) ---
    const makeVariants = (sizes, colors, price, stockPerSize) => {
      const items = [];
      for (const size of sizes) {
        for (const color of colors) {
          items.push({
            name: `${color} - ${size}`,
            size,
            color,
            price,
            stock: stockPerSize,
            purchaseLimit: 2,
          });
        }
      }
      return items;
    };
    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];

    const event9 = await Event.create({
      name: 'DISCO GORGON T-Shirt',
      description: 'IIIT Hyderabad - Disco Gorgon Premium 220 GSM Oversize T-Shirt. High-quality cotton blend with exclusive Felicity design. Available in multiple sizes and colors.',
      type: 'MERCHANDISE',
      eligibility: 'ALL',
      registrationDeadline: day(14),
      startDate: day(15),
      endDate: day(20),
      registrationFee: 450,
      organizerId: orgMap['Merchandise Team']._id,
      tags: ['merchandise', 'tshirt', 'fashion', 'felicity'],
      status: 'PUBLISHED',
      merchandiseItems: makeVariants(sizes, ['Black', 'Navy Blue', 'Maroon'], 450, 20),
    });
    console.log('   ✓ [UPCOMING] DISCO GORGON T-Shirt (Merchandise Team)');

    const event10 = await Event.create({
      name: 'PENGUIN Premium T-Shirt',
      description: 'IIIT Hyderabad - Penguin Premium T-Shirt. Soft cotton fabric with the iconic Penguin logo. Perfect for everyday campus wear.',
      type: 'MERCHANDISE',
      eligibility: 'ALL',
      registrationDeadline: day(14),
      startDate: day(15),
      endDate: day(20),
      registrationFee: 399,
      organizerId: orgMap['Merchandise Team']._id,
      tags: ['merchandise', 'tshirt', 'penguin', 'felicity'],
      status: 'PUBLISHED',
      merchandiseItems: makeVariants(sizes, ['White', 'Black', 'Grey'], 399, 20),
    });
    console.log('   ✓ [UPCOMING] PENGUIN Premium T-Shirt (Merchandise Team)');

    const event11 = await Event.create({
      name: 'FRIED MAGGI T-Shirt',
      description: 'IIIT Hyderabad - Fried Maggi Premium 220 GSM Oversize T-Shirt. Bold colors with the legendary Fried Maggi design that represents late-night campus culture.',
      type: 'MERCHANDISE',
      eligibility: 'ALL',
      registrationDeadline: day(14),
      startDate: day(15),
      endDate: day(20),
      registrationFee: 450,
      organizerId: orgMap['Merchandise Team']._id,
      tags: ['merchandise', 'tshirt', 'maggi', 'felicity'],
      status: 'PUBLISHED',
      merchandiseItems: makeVariants(sizes, ['Yellow', 'Orange', 'Red'], 450, 20),
    });
    console.log('   ✓ [UPCOMING] FRIED MAGGI T-Shirt (Merchandise Team)');

    // --- 5.5  HACKATHON Event (Part 2 — A1) ---
    const event12 = await Event.create({
      name: 'HackIIIT',
      description: 'IIIT Hyderabad\'s premier 24-hour hackathon! Build innovative solutions to real-world problems. Form teams of 4-5 members, brainstorm, code, and present. Grand prize pool of ₹50,000. Mentors from top tech companies available throughout.',
      type: 'NORMAL',
      eligibility: 'ALL',
      registrationDeadline: day(10),
      startDate: day(15),
      endDate: day(16),
      registrationLimit: 100,
      registrationFee: 0,
      organizerId: orgMap['OSDG']._id,
      tags: ['hackathon', 'coding', 'technology', 'innovation', 'teamwork'],
      status: 'PUBLISHED',
      customFormFields: [
        { fieldName: 'GitHub Profile', fieldType: 'text', required: false, order: 1 },
        { fieldName: 'Primary Tech Stack', fieldType: 'dropdown', options: ['Web', 'Mobile', 'ML/AI', 'Blockchain', 'IoT', 'Other'], required: true, order: 2 },
        { fieldName: 'Dietary Preferences', fieldType: 'dropdown', options: ['Veg', 'Non-Veg', 'Vegan'], required: true, order: 3 },
      ],
    });
    console.log('   ✓ [UPCOMING] HackIIIT (OSDG)');

    // ── 6. Seed Registrations for COMPLETED events ──────────────────────────
    console.log('\n🎟️  Seeding registrations for completed events...\n');

    const completedEvents = [
      { event: event7, label: 'Adventure Escape Room' },
      { event: event8, label: 'Solo Quiz Competition' },
    ];

    for (const { event, label } of completedEvents) {
      // Register 7 participants (first 7 users)
      const regUsers = users.slice(0, 7);
      let regCount = 0;

      for (const user of regUsers) {
        const tid = ticketId('NOR');
        const qrCode = await generateQR(tid, event._id, user._id, event.name);

        await Registration.create({
          eventId: event._id,
          participantId: user._id,
          ticketId: tid,
          qrCode,
          status: 'CONFIRMED',
          formResponses: {},
          paymentStatus: 'NOT_REQUIRED',
          paymentAmount: 0,
          attendance: {
            checked: true,
            timestamp: new Date(event.startDate.getTime() + 30 * 60 * 1000), // 30 min after start
            checkedBy: event.organizerId,
          },
        });
        regCount++;
      }

      // Update event counts
      event.registrationCount = regCount;
      event.formLocked = true;
      event.viewCount = Math.floor(50 + Math.random() * 100);
      await event.save();

      console.log(`   ✓ ${label}: ${regCount} registrations (all with attendance marked)`);
    }

    // ── 7. Seed some registrations for ONGOING events ───────────────────────
    console.log('\n🎟️  Seeding registrations for ongoing events...\n');

    const ongoingEvents = [
      { event: event4, label: 'Fitness Bootcamp' },
      { event: event5, label: 'Solo Dance Performance' },
    ];

    for (const { event, label } of ongoingEvents) {
      const regUsers = users.slice(0, 5);
      let regCount = 0;

      for (let i = 0; i < regUsers.length; i++) {
        const user = regUsers[i];
        const tid = ticketId('NOR');
        const qrCode = await generateQR(tid, event._id, user._id, event.name);

        // Mark attendance for first 2 (simulating partial check-in)
        const attendanceData = i < 2 ? {
          checked: true,
          timestamp: new Date(),
          checkedBy: event.organizerId,
        } : { checked: false };

        await Registration.create({
          eventId: event._id,
          participantId: user._id,
          ticketId: tid,
          qrCode,
          status: 'CONFIRMED',
          formResponses: {},
          paymentStatus: 'NOT_REQUIRED',
          paymentAmount: 0,
          attendance: attendanceData,
        });
        regCount++;
      }

      event.registrationCount = regCount;
      event.formLocked = true;
      event.viewCount = Math.floor(30 + Math.random() * 50);
      await event.save();

      console.log(`   ✓ ${label}: ${regCount} registrations (2 with attendance)`);
    }

    // ── 8. Add some followed organizers to participants ──────────────────────
    console.log('\n🔗 Setting up followed organizers for participants...');
    const orgIds = Object.values(orgMap).map(o => o._id);
    for (const user of users) {
      // Each user follows 3-4 random organizers
      const shuffled = orgIds.sort(() => 0.5 - Math.random());
      user.followedOrganizers = shuffled.slice(0, 3 + Math.floor(Math.random() * 2));
      await user.save();
    }
    console.log('   ✓ Each participant follows 3-4 random organizers');

    // ── 9. Summary ──────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(70));
    console.log('                    🎉 EVAL SEEDING COMPLETE!');
    console.log('═'.repeat(70));

    console.log('\n📊 Counts:');
    console.log(`   Organizers:     ${ORGANIZERS.length}`);
    console.log(`   Events:         12 (4 upcoming + 2 ongoing + 2 completed + 3 merch + 1 hackathon)`);
    console.log(`   Participants:   ${users.length}`);
    const totalRegs = await Registration.countDocuments({});
    console.log(`   Registrations:  ${totalRegs}`);

    console.log('\n🔑 CREDENTIALS:');
    console.log('─'.repeat(70));
    console.log('   ADMIN:');
    console.log(`     Email:    ${adminEmail}`);
    console.log(`     Password: ${adminPassword}`);

    console.log('\n   ORGANIZERS (all share password: ' + ORG_PASSWORD + '):');
    for (const org of ORGANIZERS) {
      console.log(`     ${org.name.padEnd(20)} ${org.email}`);
    }

    console.log('\n   PARTICIPANTS (all share password: Test@123):');
    for (const p of PARTICIPANTS) {
      console.log(`     ${(p.firstName + ' ' + p.lastName).padEnd(20)} ${p.email}`);
    }

    console.log('\n📋 EVENTS:');
    console.log('─'.repeat(70));

    const allEvents = [
      { n: 'Chess Championship Workshop',  s: 'UPCOMING',  o: 'Chess Club' },
      { n: 'Poetry Slam Competition',       s: 'UPCOMING',  o: 'LitClub' },
      { n: 'Photography Workshop',          s: 'UPCOMING',  o: 'Pentaprism' },
      { n: 'Social Mixer Event',            s: 'UPCOMING',  o: 'Queer Collective' },
      { n: 'Fitness Bootcamp',              s: 'ONGOING',   o: 'ASEC' },
      { n: 'Solo Dance Performance',        s: 'ONGOING',   o: 'TDC' },
      { n: 'Adventure Escape Room',         s: 'COMPLETED', o: 'Adventure Group' },
      { n: 'Solo Quiz Competition',         s: 'COMPLETED', o: 'TVRQC' },
      { n: 'DISCO GORGON T-Shirt',          s: 'UPCOMING',  o: 'Merchandise Team' },
      { n: 'PENGUIN Premium T-Shirt',        s: 'UPCOMING',  o: 'Merchandise Team' },
      { n: 'FRIED MAGGI T-Shirt',           s: 'UPCOMING',  o: 'Merchandise Team' },
      { n: 'HackIIIT',                      s: 'UPCOMING',  o: 'OSDG' },
    ];

    for (const e of allEvents) {
      const statusIcon = e.s === 'UPCOMING' ? '🟢' : e.s === 'ONGOING' ? '🟡' : '🔴';
      console.log(`   ${statusIcon} [${e.s.padEnd(9)}] ${e.n.padEnd(35)} → ${e.o}`);
    }

    console.log('\n' + '═'.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  }
}

seed();

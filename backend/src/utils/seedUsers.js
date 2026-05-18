'use strict';

/**
 * Seed script — creates one doctor and one receptionist user for demo/testing.
 * Only runs if the users collection is empty to avoid duplicate seeding.
 *
 * Usage:
 *   node src/utils/seedUsers.js
 *
 * Requires MONGO_URI and JWT_SECRET to be set in the environment (via .env).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const { hashPassword } = require('../services/authService');

const SEED_USERS = [
  {
    name: 'Dr. Sarah Ahmed',
    email: 'doctor@clinic.demo',
    password: 'Doctor@123',
    role: 'doctor',
    credentials: 'MD, General Practice',
  },
  {
    name: 'Layla Hassan',
    email: 'receptionist@clinic.demo',
    password: 'Recept@123',
    role: 'receptionist',
  },
];

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌  MONGO_URI is not set. Aborting seed.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅  Connected to MongoDB');

  const existingCount = await User.countDocuments();
  if (existingCount > 0) {
    console.log(`ℹ️   Users collection already has ${existingCount} document(s). Skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  for (const userData of SEED_USERS) {
    const hashedPw = await hashPassword(userData.password);
    await User.create({ ...userData, password: hashedPw });
    console.log(`✅  Created ${userData.role}: ${userData.email}  (password: ${userData.password})`);
  }

  console.log('\n🎉  Seed complete. Demo credentials:');
  for (const u of SEED_USERS) {
    console.log(`   ${u.role.padEnd(14)} ${u.email}  /  ${u.password}`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});

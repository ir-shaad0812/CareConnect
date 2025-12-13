/**
 * One-time migration script: activate all users stuck in PENDING_APPROVAL status
 * whose email has already been verified.
 *
 * Run: npm run activate-users
 */

import mongoose from 'mongoose';
import config from '../config/index.js';
import User from '../models/user.model.js';

async function run() {
  await mongoose.connect(config.mongodbUri || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const result = await User.updateMany(
    { status: 'pending_approval', isEmailVerified: true },
    { $set: { status: 'active' } }
  );

  console.log(`Updated ${result.modifiedCount} user(s) from pending_approval → active`);

  // Print which users were activated
  if (result.modifiedCount > 0) {
    const activated = await User.find(
      { status: 'active', isEmailVerified: true },
      'email fullName role createdAt'
    ).sort({ createdAt: -1 }).limit(50);

    console.log('\nRecently activated accounts:');
    activated.forEach(u => {
      console.log(`  [${u.role}] ${u.fullName} <${u.email}>`);
    });
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

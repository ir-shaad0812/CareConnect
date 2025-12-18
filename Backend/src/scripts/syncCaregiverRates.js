// ============================================
// CAREGIVER RATES SYNC SCRIPT
// Syncs rates between User and Caregiver models
// Run: node src/scripts/syncCaregiverRates.js
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import User from '../models/user.model.js';
import Caregiver from '../models/caregiver.model.js';

const RATE_FIELDS = ['hourlyRate', 'dailyRate', 'weeklyRate', 'monthlyRate', 'currency'];

async function syncCaregiverRates() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/careconnect';
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all caregivers
    const caregivers = await Caregiver.find({}).populate('userId');
    console.log(`\n📋 Found ${caregivers.length} caregivers to check\n`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const caregiver of caregivers) {
      try {
        if (!caregiver.userId) {
          console.log(`⚠️  Caregiver ${caregiver._id} has no linked user - skipping`);
          continue;
        }

        const user = caregiver.userId;
        let needsUpdate = false;
        const updates = {};

        // For each rate field, determine the source of truth
        // Priority: Use the non-zero value, prefer Caregiver model if both have values
        for (const field of RATE_FIELDS) {
          const caregiverValue = caregiver[field];
          const userValue = user[field];

          // If caregiver has no value but user does, sync from user
          if ((!caregiverValue || caregiverValue === 0) && userValue && userValue > 0) {
            updates[field] = userValue;
            needsUpdate = true;
            console.log(`  📝 ${field}: User (${userValue}) → Caregiver (was ${caregiverValue || 0})`);
          }
          // If both have different non-zero values, log warning
          else if (caregiverValue > 0 && userValue > 0 && caregiverValue !== userValue) {
            console.log(`  ⚠️  ${field}: Mismatch - Caregiver(${caregiverValue}) vs User(${userValue}) - keeping Caregiver value`);
          }
        }

        if (needsUpdate) {
          // Update caregiver document
          await Caregiver.findByIdAndUpdate(caregiver._id, { $set: updates });
          
          // Also sync back to user for consistency
          await User.findByIdAndUpdate(user._id, { $set: updates });
          
          console.log(`✅ Synced rates for caregiver: ${user.fullName} (${user.email})`);
          syncedCount++;
        } else {
          console.log(`ℹ️  No sync needed for: ${user.fullName}`);
        }
      } catch (err) {
        console.error(`❌ Error processing caregiver ${caregiver._id}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total caregivers checked: ${caregivers.length}`);
    console.log(`Successfully synced: ${syncedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the sync
syncCaregiverRates();

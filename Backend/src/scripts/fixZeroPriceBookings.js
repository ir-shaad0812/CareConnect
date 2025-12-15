// ============================================
// FIX ZERO-PRICE BOOKINGS SCRIPT
// Recalculates and fixes bookings with zero pricing
// Run: node src/scripts/fixZeroPriceBookings.js
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';
import Caregiver from '../models/caregiver.model.js';
import { PLATFORM_FEE_PERCENTAGE } from '../constants/booking.constants.js';

/**
 * Calculate pricing for a booking
 */
function calculatePricing(durationType, schedule, caregiverPricing, rateType) {
  const startDate = new Date(schedule.startDate);
  const endDate = new Date(schedule.endDate);
  
  const diffMs = Math.max(endDate - startDate, 0);
  const diffHours = Math.max(diffMs / (1000 * 60 * 60), 1);
  const diffDays = Math.max(diffMs / (1000 * 60 * 60 * 24), 1);

  let rate = 0;
  let subtotal = 0;
  let totalHours = diffHours;
  let totalDays = Math.ceil(diffDays);

  // Get effective rate with fallback
  const getEffectiveRate = (requestedType) => {
    const rateMap = {
      hourly: caregiverPricing?.hourly || 0,
      daily: caregiverPricing?.daily || 0,
      weekly: caregiverPricing?.weekly || 0,
      monthly: caregiverPricing?.monthly || 0,
    };

    if (rateMap[requestedType] > 0) return { rate: rateMap[requestedType], type: requestedType };
    if (rateMap.hourly > 0) return { rate: rateMap.hourly, type: 'hourly' };
    if (rateMap.daily > 0) return { rate: rateMap.daily / 8, type: 'hourly' };
    
    for (const [type, rateValue] of Object.entries(rateMap)) {
      if (rateValue > 0) return { rate: rateValue, type };
    }
    return { rate: 0, type: requestedType };
  };

  const { rate: effectiveRate, type: effectiveType } = getEffectiveRate(rateType);
  rate = effectiveRate;

  switch (effectiveType) {
    case 'hourly':
      subtotal = rate * diffHours;
      break;
    case 'daily':
    case 'half_day':
    case 'full_day':
      subtotal = rate * totalDays;
      totalHours = totalDays * 24;
      break;
    case 'weekly':
      const weeks = Math.ceil(diffDays / 7);
      subtotal = rate * weeks;
      totalHours = weeks * 7 * 24;
      break;
    case 'monthly':
      const months = Math.ceil(diffDays / 30);
      subtotal = rate * months;
      totalHours = months * 30 * 24;
      break;
    default:
      subtotal = rate * diffHours;
  }

  subtotal = Math.max(subtotal, 0);
  const platformFee = (subtotal * PLATFORM_FEE_PERCENTAGE) / 100;
  const total = subtotal + platformFee;

  return {
    rateType: effectiveType,
    baseRate: rate,
    rate,
    totalHours: Math.max(totalHours, 0),
    totalDays,
    subtotal: Math.round(subtotal * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
    taxes: 0,
    total: Math.round(total * 100) / 100,
    currency: caregiverPricing?.currency || 'NPR',
  };
}

async function fixZeroPriceBookings() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/careconnect';
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find bookings with zero or missing total amount
    const zeroPriceBookings = await Booking.find({
      $or: [
        { totalAmount: { $lte: 0 } },
        { totalAmount: { $exists: false } },
        { 'pricing.total': { $lte: 0 } },
        { 'pricing.total': { $exists: false } },
      ],
      status: { $nin: ['cancelled', 'completed'] }, // Only fix active bookings
    }).populate('caregiverId');

    console.log(`📋 Found ${zeroPriceBookings.length} bookings with zero/missing pricing\n`);

    let fixedCount = 0;
    let cannotFixCount = 0;

    for (const booking of zeroPriceBookings) {
      try {
        console.log(`\n📝 Processing booking: ${booking.bookingNumber} (${booking._id})`);
        
        // Get caregiver rates
        const caregiverUser = booking.caregiverId;
        const caregiverDoc = await Caregiver.findOne({ userId: caregiverUser._id || caregiverUser });
        
        // Build pricing from both sources
        const caregiverPricing = {
          hourly: caregiverDoc?.hourlyRate || caregiverUser?.hourlyRate || 0,
          daily: caregiverDoc?.dailyRate || caregiverUser?.dailyRate || 0,
          weekly: caregiverDoc?.weeklyRate || caregiverUser?.weeklyRate || 0,
          monthly: caregiverDoc?.monthlyRate || caregiverUser?.monthlyRate || 0,
          currency: caregiverDoc?.currency || caregiverUser?.currency || 'NPR',
        };

        // Check if any rate is available
        const hasAnyRate = Object.entries(caregiverPricing)
          .filter(([k]) => k !== 'currency')
          .some(([, v]) => v > 0);

        if (!hasAnyRate) {
          console.log(`  ⚠️  Cannot fix - no rates available for caregiver`);
          cannotFixCount++;
          continue;
        }

        // Recalculate pricing
        const newPricing = calculatePricing(
          booking.durationType,
          booking.schedule,
          caregiverPricing,
          booking.pricing?.rateType || booking.durationType || 'hourly'
        );

        if (newPricing.total <= 0) {
          console.log(`  ⚠️  Cannot fix - calculated total is still 0`);
          cannotFixCount++;
          continue;
        }

        console.log(`  📊 Current: Total=${booking.totalAmount || 0}, Rate=${booking.pricing?.rate || 0}`);
        console.log(`  📊 New:     Total=${newPricing.total}, Rate=${newPricing.rate}`);

        // Update booking
        await Booking.findByIdAndUpdate(booking._id, {
          $set: {
            pricing: newPricing,
            totalAmount: newPricing.total,
            amountDue: newPricing.total - (booking.amountPaid || 0),
          },
        });

        console.log(`  ✅ Fixed booking ${booking.bookingNumber}`);
        fixedCount++;

      } catch (err) {
        console.error(`  ❌ Error fixing booking ${booking._id}:`, err.message);
        cannotFixCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 FIX SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total bookings checked: ${zeroPriceBookings.length}`);
    console.log(`Successfully fixed: ${fixedCount}`);
    console.log(`Could not fix: ${cannotFixCount}`);
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

// Run the fix
fixZeroPriceBookings();

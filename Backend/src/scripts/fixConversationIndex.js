// ============================================
// FIX CONVERSATION BOOKINGID INDEX
// Run once to fix duplicate key error for null bookingId
// Usage: node src/scripts/fixConversationIndex.js
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('conversations');

    // List existing indexes
    const indexes = await collection.indexes();
    console.log('\nExisting indexes:', indexes.map(idx => idx.name));

    // Find and drop the old bookingId index if it exists
    const bookingIdIndex = indexes.find(idx =>
      idx.key && idx.key.bookingId !== undefined && idx.name !== '_id_'
    );

    if (bookingIdIndex) {
      console.log(`\nDropping old index: ${bookingIdIndex.name}`);
      await collection.dropIndex(bookingIdIndex.name);
      console.log('Old index dropped successfully');
    } else {
      console.log('\nNo bookingId index found to drop');
    }

    // Create new partial index
    console.log('\nCreating new partial index on bookingId...');
    await collection.createIndex(
      { bookingId: 1 },
      {
        unique: true,
        partialFilterExpression: { bookingId: { $type: 'objectId' } },
        name: 'bookingId_partial_unique'
      }
    );
    console.log('New partial index created successfully');

    // Verify indexes
    const newIndexes = await collection.indexes();
    console.log('\nUpdated indexes:', newIndexes.map(idx => idx.name));

    console.log('\n✅ Index fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing index:', error);
    process.exit(1);
  }
}

fixIndex();

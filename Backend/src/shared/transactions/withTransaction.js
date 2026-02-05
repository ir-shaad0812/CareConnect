// ============================================
// TRANSACTION HELPER
// Wraps MongoDB session lifecycle for atomic workflows
// ============================================

import mongoose from 'mongoose';

export const withTransaction = async (handler) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await handler(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
};

export default withTransaction;

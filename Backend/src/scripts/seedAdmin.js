// ============================================
// ADMIN SEED SCRIPT
// Creates the default admin user if not exists
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

import User from '../models/user.model.js';
import { USER_ROLES, USER_STATUS, AUTH_PROVIDERS } from '../constants/index.js';

function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in Backend/.env before running seed:admin');
  }

  return {
    email,
    password,
    fullName: 'Admin User',
    role: USER_ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    isEmailVerified: true,
    authProvider: AUTH_PROVIDERS.LOCAL,
  };
}

async function seedAdmin() {
  try {
    const adminCredentials = getAdminCredentials();

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminCredentials.email });
    
    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists');
      
      // Update password using plain text - the pre-save hook will hash it
      existingAdmin.password = adminCredentials.password;
      existingAdmin.role = USER_ROLES.ADMIN;
      existingAdmin.status = USER_STATUS.ACTIVE;
      existingAdmin.isEmailVerified = true;
      existingAdmin.loginAttempts = 0;
      existingAdmin.lockUntil = undefined;
      await existingAdmin.save();
      console.log('✅ Admin user password, role, and login lock state updated successfully');
    } else {
      // Create admin user - password will be hashed by pre-save hook
      const adminUser = new User({
        ...adminCredentials,
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully');
      console.log('   Email loaded from ADMIN_EMAIL in environment variables');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedAdmin();

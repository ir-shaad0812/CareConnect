// PASSPORT CONFIGURATION
// OAuth strategy: Google only (Facebook removed)
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';
import config from './index.js';
import { USER_STATUS, AUTH_PROVIDERS, USER_ROLES } from '../constants/index.js';
import logger from '../utils/logger.js';

// ============================================
// GOOGLE OAUTH STRATEGY
// ============================================

if (config.google.clientId && config.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl || '/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();

          if (!email) {
            return done(new Error('No email found in Google profile'), null);
          }

          // Check if user exists
          let user = await User.findOne({
            $or: [
              { googleId: profile.id },
              { email },
            ],
          }).select('+googleId');

          if (user) {
            // Update Google ID if not set
            if (!user.googleId && user.isEmailVerified) {
              user.googleId = profile.id;
              await user.save();
            } else if (!user.googleId && !user.isEmailVerified) {
              // Don't auto-link to unverified accounts - potential account takeover
              return done(new Error('Account exists but email not verified. Please verify via original method.'), null);
            }
            return done(null, user);
          }

          // Create new user with sanitized data
          const displayName = profile.displayName || 
            `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 
            'User';

          user = await User.create({
            googleId: profile.id,
            email,
            fullName: displayName,
            avatar: profile.photos?.[0]?.value || null,
            authProvider: AUTH_PROVIDERS.GOOGLE,
            isEmailVerified: true,
            status: USER_STATUS.ONBOARDING,
            role: null,
            isProfileComplete: false,
          });

          return done(null, user);
        } catch (error) {
          logger.error('[SERVICES] Google OAuth strategy error', { reason: error.message });
          return done(error, null);
        }
      }
    )
  );
}

// Facebook OAuth has been removed from this application.
// Only Google OAuth is supported.


// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;

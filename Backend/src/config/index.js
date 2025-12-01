import dotenv from 'dotenv';

dotenv.config();

// Token types for JWT validation
export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
};

/**
 * Validate required environment variables
 * App should fail fast if critical config is missing
 */
const validateEnv = () => {
  const required = [
    'NODE_ENV',
    'PORT',
    'MONGODB_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_ACCESS_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN',
    'COOKIE_SECRET',
    'FRONTEND_URL',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}\n\nPlease check your .env file.`
    );
  }

  // Validate JWT secrets are not default/weak values
  if (process.env.NODE_ENV === 'production') {
    const weakSecrets = ['secret', 'change-in-production', 'your-super-secret'];
    const isWeakAccess = weakSecrets.some(weak => 
      process.env.JWT_ACCESS_SECRET.toLowerCase().includes(weak)
    );
    const isWeakRefresh = weakSecrets.some(weak => 
      process.env.JWT_REFRESH_SECRET.toLowerCase().includes(weak)
    );

    if (isWeakAccess || isWeakRefresh) {
      throw new Error('JWT secrets must be changed in production environment');
    }

    if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT access and refresh secrets must be different');
    }
  }
};

// Validate environment on import
validateEnv();

const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisDb = parseInt(process.env.REDIS_DB || '0', 10);
const redisEnabled =
  process.env.REDIS_ENABLED === 'true' ||
  Boolean(process.env.REDIS_URL);

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT, 10),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // MongoDB
  mongodbUri: process.env.MONGODB_URI,

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },

  // Cookie
  cookieSecret: process.env.COOKIE_SECRET,

  // Google OAuth (optional)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || null,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || null,
    enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  },

  // Facebook OAuth (optional)
  facebook: {
    appId: process.env.FACEBOOK_APP_ID || null,
    appSecret: process.env.FACEBOOK_APP_SECRET || null,
    callbackUrl: process.env.FACEBOOK_CALLBACK_URL || null,
    enabled: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
  },

  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL,

  // Cloudinary (optional)
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    apiKey: process.env.CLOUDINARY_API_KEY || null,
    apiSecret: process.env.CLOUDINARY_API_SECRET || null,
    enabled: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
  },

  // SMTP Email Configuration (required for production)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false', // default true for port 465 SSL
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.SMTP_FROM || 'CareConnect <noreply@careconnect.com>',
    enabled: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
  },

  // WebRTC TURN Server Configuration (optional — improves call reliability behind NAT)
  webrtc: {
    turnUrl: process.env.TURN_SERVER_URL || null,
    turnUsername: process.env.TURN_USERNAME || null,
    turnCredential: process.env.TURN_CREDENTIAL || null,
    // STUN servers are always included; TURN is additive when configured
    stunServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  },

  // Stripe Payment Configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || null,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
    enabled: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY),
  },

  // Redis (optional; used by queue workers)
  redis: {
    enabled: redisEnabled,
    url: process.env.REDIS_URL || null,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number.isNaN(redisPort) ? 6379 : redisPort,
    username: process.env.REDIS_USERNAME || null,
    password: process.env.REDIS_PASSWORD || null,
    db: Number.isNaN(redisDb) ? 0 : redisDb,
    tls: process.env.REDIS_TLS === 'true',
    queuePrefix: process.env.REDIS_QUEUE_PREFIX || 'careconnect',
  },
};

export default config;

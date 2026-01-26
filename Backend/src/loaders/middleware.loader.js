// ============================================
// MIDDLEWARE LOADER
// Registers global middleware for the API
// ============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import path from 'path';

import config from '../config/index.js';
import { localizationMiddleware } from '../middleware/localization.middleware.js';
import { getDirname } from '../utils/pathHelper.js';

// Load Passport strategies once during bootstrap.
import '../config/passport.js';

const __dirname = getDirname(import.meta.url);
const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];

const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== 'string') {
    return null;
  }

  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

const getAllowedOrigins = () => {
  const origins = [normalizeOrigin(config.frontendUrl)];

  if (config.isDevelopment) {
    DEFAULT_DEV_ORIGINS.forEach((origin) => origins.push(normalizeOrigin(origin)));
  }

  return [...new Set(origins.filter(Boolean))];
};

const buildHelmetOptions = () => {
  const connectSrc = ["'self'", ...getAllowedOrigins()];

  return {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: config.isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://lh3.googleusercontent.com'],
            connectSrc,
            fontSrc: ["'self'", 'data:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
          },
        }
      : false,
    hsts: config.isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    hidePoweredBy: true,
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  };
};

const createCorsOptions = () => {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin: (origin, callback) => {
      const normalizedOrigin = normalizeOrigin(origin);

      if (!origin || allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Requested-With'],
    maxAge: 86400,
  };
};

export const registerCoreMiddleware = (app) => {
  if (config.isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(helmet(buildHelmetOptions()));
  app.use(cors(createCorsOptions()));
  app.use(config.isDevelopment ? morgan('dev') : morgan('combined'));

  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }

        return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024,
    }),
  );

  // Stripe webhook needs the unparsed body for signature verification.
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(cookieParser(config.cookieSecret));
  app.use(passport.initialize());
  app.use(localizationMiddleware);

  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
};

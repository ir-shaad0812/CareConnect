# CareConnect Backend API

> **Production-Grade Care Booking & Management Platform**

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8.0-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?style=flat-square&logo=socket.io&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-20.x-635BFF?style=flat-square&logo=stripe&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)

---

## 🌟 Overview

CareConnect is a **production-grade, full-featured care booking platform** that connects **Care Seekers** with **Caregivers** across multiple service categories — from elderly care and child care to palliative and respite care. The backend is engineered for reliability, auditability, and real-time responsiveness at scale.

### What It Does

- Manages the **complete booking lifecycle** — from a 10-minute slot reservation through agreement signing, payment, live care tracking, and dispute resolution.
- Enforces a **formal agreement workflow**: both parties must digitally accept a system-generated PDF agreement before payment is unlocked.
- Provides **real-time updates** via Socket.IO so clients see booking state changes, tracking events, and notifications instantly.
- Runs a **BullMQ/Redis notification queue** for reliable, retryable delivery across in-app, push, email, and SMS channels.
- Automates **daily tracking enforcement** via a cron job that flags missed caregiver logs and sends reminders.
- Supports **multiple payment gateways**: Stripe (international), Khalti, and eSewa (Nepal-local).

### Key Features

| Feature | Description |
|---|---|
| 13-State Booking Machine | Full lifecycle from `reserved` → `expired`/`completed`/`disputed` |
| Agreement Engine | Auto-generated PDF contract; dual-party acceptance required |
| Reservation System | 10-min slot hold with up to 2 extensions (5 min each) |
| Tracking Engine | Daily caregiver check-in/out + care report logs with admin review |
| Real-Time Engine | Socket.IO rooms per booking, per user, per role |
| Notification Queue | BullMQ workers with configurable retry and channel routing |
| Payment Escrow | Stripe/Khalti/eSewa with hold-and-release flow |
| AI Caregiver Matching | Recommendation engine via `/api/ai-match` |
| Video Calls | Stream.io integration for in-platform video consultations |
| Admin Dashboard | Full monitoring, enforcement, analytics, and moderation |

---

## 📋 Table of Contents

1. [Architecture](#-architecture)
2. [Quick Start](#-quick-start)
3. [Project Structure](#-project-structure)
4. [Environment Variables](#-environment-variables)
5. [Core Modules](#-core-modules)
   - [Availability Engine](#1-availability-engine)
   - [Booking Engine](#2-booking-engine)
   - [Agreement Engine](#3-agreement-engine)
   - [Tracking Engine](#4-tracking-engine)
   - [Notification Engine](#5-notification-engine)
   - [Real-Time Engine](#6-real-time-engine)
   - [Admin Module](#7-admin-module)
6. [Booking State Machine](#-booking-state-machine)
7. [API Reference](#-api-reference)
8. [Database Schema](#-database-schema)
9. [Real-Time Events](#-real-time-events)
10. [Security](#-security)
11. [Deployment](#-deployment)
12. [Testing](#-testing)
13. [Performance & Scaling](#-performance--scaling)
14. [Debugging Guide](#-debugging-guide)
15. [Changelog](#-changelog)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│            Web App (Next.js)  ·  Mobile App (React Native)          │
└────────────────────────┬─────────────────────┬──────────────────────┘
                         │ HTTPS REST           │ WSS (Socket.IO)
┌────────────────────────▼─────────────────────▼──────────────────────┐
│                     EXPRESS.JS API SERVER                            │
│  ┌──────────┐ ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│  │  Helmet  │ │    CORS     │ │ Rate Limiter │ │  Morgan Logger  │ │
│  │  (CSP)   │ │ (Whitelist) │ │  (per-route) │ │  (dev/combined) │ │
│  └──────────┘ └─────────────┘ └──────────────┘ └─────────────────┘ │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     ROUTE LAYER (/api/*)                      │   │
│  │  auth · users · bookings · payments · tracking · admin · ...  │   │
│  └───────────────────────────┬──────────────────────────────────┘   │
│                               │                                       │
│  ┌────────────────────────────▼───────────────────────────────────┐ │
│  │                      SERVICE LAYER                              │ │
│  │  BookingService · AgreementService · PaymentService            │ │
│  │  NotificationService · TrackingService · EmailService          │ │
│  └────────┬───────────────────────────────────────┬──────────────┘ │
│            │                                       │                  │
│  ┌─────────▼──────────┐             ┌─────────────▼──────────────┐  │
│  │   MONGOOSE ODM     │             │     SOCKET.IO SERVER        │  │
│  │  (Booking, User,   │             │  EventBus · Room Targeting  │  │
│  │   Agreement, etc.) │             │  (user:id · booking:id)     │  │
│  └─────────┬──────────┘             └─────────────────────────────┘  │
└────────────┼────────────────────────────────────────────────────────┘
             │
┌────────────▼────────────┐    ┌─────────────────────────────────────┐
│       MONGODB           │    │          REDIS + BULLMQ              │
│  Collections:           │    │  Queues:                             │
│  · bookings             │    │  · notification:queue                │
│  · users                │    │  · email:queue                       │
│  · caregivers           │    │  · payment:queue                     │
│  · transactions         │    │                                      │
│  · notifications        │    │  Workers: retry · backoff · DLQ      │
│  · (27 total)           │    └──────────────────────────────────────┘
└─────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────────────┐
│                     THIRD-PARTY INTEGRATIONS                          │
│  Cloudinary (images) · Stripe · Khalti · eSewa · Stream.io · SMTP    │
└───────────────────────────────────────────────────────────────────────┘

CRON JOBS (in-process)
  └─ TrackingEnforcementCron  [every 60 min]
       · upsertMissedTrackingLogs()
       · sendTrackingReminder()
```

---

## ⚡ Quick Start

### Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Node.js | 18.x LTS | ESM modules (`"type": "module"`) |
| MongoDB | 6.x+ | Atlas or self-hosted |
| Redis | 7.x+ | Required for BullMQ queues |
| npm | 9.x+ | |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/careconnect.git
cd careconnect/Backend

# 2. Install dependencies
npm install

# 3. Copy and configure environment
cp .env.example .env
# Edit .env with your values (see Environment Variables section)

# 4. Seed the admin user
npm run seed:admin

# 5. Run startup validation (checks all service connections)
npm run startup:check
```

### Running the Server

```bash
# Development (nodemon, hot-reload)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:<PORT>` (default `5000`).

Health check endpoint: `GET /health`

---

## 📁 Project Structure

```
Backend/
├── src/
│   ├── app.js                    # Express app factory
│   ├── server.js                 # HTTP server bootstrap + startup orchestration
│   │
│   ├── config/
│   │   ├── index.js              # Validated config object (all env vars)
│   │   ├── database.js           # Mongoose connection with retry logic
│   │   └── passport.js           # Google OAuth strategy configuration
│   │
│   ├── constants/
│   │   ├── booking.constants.js  # STATE_TRANSITIONS, enums, RESERVATION_CONFIG
│   │   └── index.js              # Re-exports (USER_ROLES, etc.)
│   │
│   ├── controllers/
│   │   ├── auth/                 # register, login, OAuth, token refresh
│   │   ├── admin/                # dashboard stats, analytics, user management
│   │   ├── booking/              # full booking lifecycle controller
│   │   ├── tracking/             # check-in, check-out, log submit, admin review
│   │   ├── notification/         # CRUD + preferences for notifications
│   │   └── payment/              # Stripe, Khalti, eSewa controllers
│   │
│   ├── cron/
│   │   └── trackingEnforcement.cron.js  # 60-min cron: flag missed logs + send reminders
│   │
│   ├── integrations/
│   │   ├── cloudinary.js         # Image upload helper
│   │   ├── stream.js             # Stream.io video call token generation
│   │   └── stripe.js             # Stripe SDK wrapper
│   │
│   ├── loaders/
│   │   ├── app.loader.js         # Composes middleware + routes + error handlers
│   │   ├── middleware.loader.js  # Helmet, CORS, compression, passport, morgan
│   │   ├── routes.loader.js      # Registers all /api/* routes + health endpoints
│   │   ├── realtime.loader.js    # Socket.IO server init + EventBus attachment
│   │   ├── jobs.loader.js        # Starts cron jobs and background workers
│   │   └── error.loader.js       # Global error handling middleware
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js     # authenticate, requireActive, authorize(role)
│   │   ├── rateLimiter.middleware.js  # apiLimiter, authLimiter, adminAuthLimiter
│   │   ├── upload.middleware.js   # multer config for docs, avatars, tracking images
│   │   ├── validate.middleware.js # express-validator error collector
│   │   └── localization.middleware.js  # Accept-Language header → req.lang/req.t()
│   │
│   ├── models/
│   │   ├── booking.model.js       # Core booking + embedded agreement schema
│   │   ├── user.model.js          # Base user (all roles)
│   │   ├── caregiver.model.js     # Extended caregiver profile + pricing
│   │   ├── careseeker.model.js    # Care seeker profile + care recipient info
│   │   ├── slot.model.js          # Availability slots
│   │   ├── notification.model.js  # Per-user notification inbox
│   │   ├── transaction.model.js   # Payment transaction records
│   │   ├── wallet.model.js        # Caregiver earnings wallet
│   │   ├── ledger.model.js        # Double-entry financial ledger
│   │   ├── dispute.model.js       # Dispute records with evidence
│   │   ├── review.model.js        # Post-booking reviews
│   │   ├── conversation.model.js  # Chat conversation threads
│   │   ├── message.model.js       # Individual chat messages
│   │   ├── locationLog.model.js   # GPS tracking logs
│   │   ├── document.model.js      # Uploaded documents (generic)
│   │   ├── caregiverDocument.model.js  # Caregiver-specific documents
│   │   ├── careSeekerDocument.model.js # Care seeker location proofs
│   │   ├── job.model.js           # Care job postings
│   │   ├── jobApplication.model.js # Caregiver applications
│   │   ├── note.model.js          # Admin/user notes
│   │   ├── notice.model.js        # Platform notice board
│   │   ├── task.model.js          # Task center items
│   │   ├── token.model.js         # Refresh token store
│   │   ├── userActivity.model.js  # Login/activity audit log
│   │   ├── userInteraction.model.js # Profile views, match signals
│   │   ├── userPreference.model.js  # Notification preference settings
│   │   └── moderationLog.model.js   # Admin moderation actions
│   │
│   ├── modules/
│   │   ├── booking/
│   │   │   └── booking.validation.js  # Joi schemas for booking requests
│   │   ├── tracking/
│   │   │   └── tracking.validation.js # Joi schemas for tracking endpoints
│   │   └── payment/
│   │       └── payment.validation.js  # Joi schemas for payment endpoints
│   │
│   ├── routes/
│   │   ├── index.js               # Central re-export of all route modules
│   │   ├── auth.routes.js         # /api/auth/*
│   │   ├── booking.routes.js      # /api/bookings/*
│   │   ├── payment.routes.js      # /api/payments/*
│   │   ├── tracking.routes.js     # /api/tracking/*
│   │   ├── availability.routes.js # /api/availability/*
│   │   ├── notification.routes.js # /api/notifications/*
│   │   ├── admin.routes.js        # /api/admin/*
│   │   ├── user.routes.js         # /api/users/*
│   │   ├── review.routes.js       # /api/reviews/*
│   │   ├── chat.routes.js         # /api/chat/*
│   │   ├── dispute.routes.js      # /api/disputes/*
│   │   ├── dashboard.routes.js    # /api/dashboard/*
│   │   └── ...                    # (video, ai, search, notice, task, etc.)
│   │
│   ├── scripts/
│   │   ├── seedAdmin.js           # Creates the first admin user
│   │   ├── startupCheck.js        # Validates all service connections pre-boot
│   │   └── activatePendingUsers.js # Batch-activates users (maintenance)
│   │
│   ├── services/
│   │   ├── booking.service.js     # Core booking logic (~3000 lines)
│   │   ├── agreement.service.js   # Agreement generation, acceptance, PDF (~1400 lines)
│   │   ├── payment.service.js     # Stripe payment orchestration
│   │   ├── khalti.service.js      # Khalti payment gateway
│   │   ├── esewa.service.js       # eSewa payment gateway
│   │   ├── notification.service.js # Notification creation + BullMQ enqueue
│   │   ├── email.service.js       # Nodemailer SMTP wrapper
│   │   └── user.service.js        # User profile operations
│   │
│   ├── shared/
│   │   └── validators/
│   │       └── joiRequest.validator.js  # Generic Joi validation middleware factory
│   │
│   ├── startup/
│   │   └── serviceHealth.js       # Checks Redis, MongoDB, SMTP at boot
│   │
│   ├── utils/
│   │   ├── apiResponse.js         # Standardized success/error response builders
│   │   ├── eventBus.js            # Socket.IO wrapper: emitToUser, emitToBookingParties
│   │   ├── cloudinary.js          # Upload/delete helpers
│   │   ├── cache.js               # In-memory TTL cache
│   │   ├── tokenUtils.js          # JWT sign/verify/rotate helpers
│   │   ├── sanitize.js            # Input sanitization utilities
│   │   ├── security.utils.js      # HMAC, random token generators
│   │   ├── haversine.js           # GPS distance calculation
│   │   ├── logger.js              # Winston logger configuration
│   │   └── validateEnv.js         # Fail-fast env var checker
│   │
│   └── validators/
│       └── auth.validator.js      # express-validator chains for auth routes
│
├── uploads/                       # Temporary local file storage (dev only)
├── package.json
├── .env.example
└── README.md
```

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` before running. Variables marked **Required** will throw on boot if missing.

### Core Server

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `NODE_ENV` | `string` | ✅ | — | `development` \| `production` \| `test` |
| `PORT` | `number` | ✅ | — | HTTP port (e.g. `5000`) |
| `FRONTEND_URL` | `string` | ✅ | — | Allowed CORS origin (e.g. `https://app.careconnect.com`) |
| `COOKIE_SECRET` | `string` | ✅ | — | Secret for signed cookies (min 32 chars in prod) |

### Database

| Variable | Type | Required | Description |
|---|---|---|---|
| `MONGODB_URI` | `string` | ✅ | Full MongoDB connection string (Atlas or self-hosted) |

### Authentication — JWT

| Variable | Type | Required | Example | Description |
|---|---|---|---|---|
| `JWT_ACCESS_SECRET` | `string` | ✅ | `s3cr3t-acc3ss` | Signing secret for access tokens |
| `JWT_REFRESH_SECRET` | `string` | ✅ | `s3cr3t-r3fr3sh` | Signing secret for refresh tokens (must differ from access) |
| `JWT_ACCESS_EXPIRES_IN` | `string` | ✅ | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `string` | ✅ | `7d` | Refresh token TTL |

> ⚠️ In production, secrets are validated to not contain common weak values and must differ from each other.

### Redis / BullMQ

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `REDIS_ENABLED` | `boolean` | — | `false` | Set `true` to enable queue workers |
| `REDIS_URL` | `string` | — | — | Full Redis URL (overrides host/port if set) |
| `REDIS_HOST` | `string` | — | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `number` | — | `6379` | Redis port |
| `REDIS_USERNAME` | `string` | — | — | Redis ACL username |
| `REDIS_PASSWORD` | `string` | — | — | Redis password |
| `REDIS_DB` | `number` | — | `0` | Redis database index |
| `REDIS_TLS` | `boolean` | — | `false` | Enable TLS for Redis connection |
| `REDIS_QUEUE_PREFIX` | `string` | — | `careconnect` | BullMQ queue name prefix |

### Cloudinary

| Variable | Type | Required | Description |
|---|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | `string` | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | `string` | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | `string` | — | Cloudinary API secret |

> Without Cloudinary, image uploads fall back to local disk (`/uploads`).

### SMTP / Email

| Variable | Type | Default | Description |
|---|---|---|---|
| `SMTP_HOST` | `string` | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_PORT` | `number` | `465` | SMTP port |
| `SMTP_SECURE` | `boolean` | `true` | Use SSL (true for port 465) |
| `SMTP_USER` | `string` | — | SMTP username / email address |
| `SMTP_PASS` | `string` | — | SMTP password or app password |
| `SMTP_FROM` | `string` | `CareConnect <noreply@careconnect.com>` | From address in outgoing emails |

### Stripe

| Variable | Type | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | `string` | Stripe secret key (`sk_live_*` or `sk_test_*`) |
| `STRIPE_PUBLISHABLE_KEY` | `string` | Stripe publishable key (`pk_*`) |
| `STRIPE_WEBHOOK_SECRET` | `string` | Webhook signing secret for event verification |

### Khalti (Nepal)

| Variable | Type | Description |
|---|---|---|
| `KHALTI_SECRET_KEY` | `string` | Khalti secret key |
| `KHALTI_PUBLIC_KEY` | `string` | Khalti public key |
| `KHALTI_BASE_URL` | `string` | Khalti API base URL |

### eSewa (Nepal)

| Variable | Type | Description |
|---|---|---|
| `ESEWA_MERCHANT_ID` | `string` | eSewa merchant code |
| `ESEWA_SECRET` | `string` | eSewa verification secret |
| `ESEWA_BASE_URL` | `string` | eSewa payment URL |

### Google OAuth

| Variable | Type | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `string` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `string` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | `string` | OAuth redirect URI (e.g. `/api/auth/google/callback`) |

### Stream.io Video

| Variable | Type | Description |
|---|---|---|
| `STREAM_API_KEY` | `string` | Stream.io app API key |
| `STREAM_API_SECRET` | `string` | Stream.io app API secret |
| `STREAM_APP_ID` | `string` | Stream.io app ID |

### Complete `.env.example`

```dotenv
# ── Core ──────────────────────────────────────────
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
COOKIE_SECRET=change-me-to-a-long-random-string

# ── Database ──────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/careconnect

# ── JWT ───────────────────────────────────────────
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Redis / BullMQ ────────────────────────────────
REDIS_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_QUEUE_PREFIX=careconnect

# ── Cloudinary ────────────────────────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── SMTP ──────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
SMTP_FROM=CareConnect <noreply@careconnect.com>

# ── Stripe ────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Khalti ────────────────────────────────────────
KHALTI_SECRET_KEY=
KHALTI_PUBLIC_KEY=
KHALTI_BASE_URL=https://khalti.com/api/v2

# ── eSewa ─────────────────────────────────────────
ESEWA_MERCHANT_ID=
ESEWA_SECRET=
ESEWA_BASE_URL=https://esewa.com.np

# ── Google OAuth ──────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# ── Stream.io ─────────────────────────────────────
STREAM_API_KEY=
STREAM_API_SECRET=
STREAM_APP_ID=
```

---

## 🧩 Core Modules

### 1. Availability Engine

Manages caregiver time slot availability and prevents double-booking.

**How It Works:**
- Caregivers define a **weekly recurring schedule** with per-day time windows.
- On top of the weekly schedule, caregivers can add **blocked dates** for holidays or unavailability.
- When a booking is created, its status is added to `SLOT_BLOCKING_STATUSES` — preventing other bookings from claiming the same time window until the booking reaches a terminal state.
- The `checkAvailability` service method checks both the caregiver's schedule and any conflicting active bookings before allowing a reservation.

**APIs:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/availability/caregivers/:caregiverId` | Public | Get caregiver's availability for a date range |
| `GET` | `/api/availability/caregivers/:caregiverId/slots` | Public | Get available time slots for a specific date |
| `GET` | `/api/availability/me` | Caregiver | Get own availability settings |
| `GET` | `/api/availability/me/calendar` | Caregiver | Get own calendar view |
| `PUT` | `/api/availability/me/weekly-schedule` | Caregiver | Replace entire weekly schedule |
| `PUT` | `/api/availability/me/blocked-dates` | Caregiver | Replace all blocked dates |
| `POST` | `/api/availability/me/blocked-dates` | Caregiver | Add a single blocked date |
| `DELETE` | `/api/availability/me/blocked-dates/:date` | Caregiver | Remove a specific blocked date |

---

### 2. Booking Engine

The central orchestration layer of the platform. The `BookingService` (~3,000 lines) handles the full booking lifecycle.

**Reservation Flow:**
1. Care Seeker calls `POST /api/bookings` → slot is **RESERVED** for 10 minutes.
2. They fill in care details and call `POST /api/bookings/:id/submit` → status moves to **PENDING**.
3. They may extend the reservation up to **2 times** (5 minutes each) via `POST /api/bookings/:id/extend-reservation`.
4. If not submitted within the hold duration, the cron/worker auto-expires it to **EXPIRED**.

**Pricing Calculation:**
- Rates are pulled from the caregiver's profile pricing (`hourly`, `daily`, `weekly`, `monthly`).
- The engine automatically selects the most appropriate rate type based on the booking `durationType`.
- Platform fee: **10%** of subtotal.
- Currency: **NPR** by default.

**APIs:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/bookings` | Care Seeker | Create booking (→ RESERVED) |
| `POST` | `/api/bookings/check-availability` | Authenticated | Check caregiver slot availability |
| `GET` | `/api/bookings` | Authenticated | Get my bookings (paginated, filterable) |
| `GET` | `/api/bookings/stats` | Authenticated | Get booking statistics |
| `GET` | `/api/bookings/calendar` | Authenticated | Get calendar events |
| `GET` | `/api/bookings/:bookingId` | Authenticated | Get booking details |
| `POST` | `/api/bookings/:bookingId/submit` | Care Seeker | Submit reservation (→ PENDING) |
| `POST` | `/api/bookings/:bookingId/extend-reservation` | Care Seeker | Extend hold timer |
| `POST` | `/api/bookings/:bookingId/confirm` | Caregiver | Accept booking (→ ACCEPTED → AGREEMENT_PENDING) |
| `POST` | `/api/bookings/:bookingId/reject` | Caregiver | Reject booking (→ REJECTED) |
| `POST` | `/api/bookings/:bookingId/cancel` | Both | Cancel booking (refund policy applied) |
| `POST` | `/api/bookings/:bookingId/check-in` | Caregiver | Record check-in (→ ACTIVE) |
| `POST` | `/api/bookings/:bookingId/check-out` | Caregiver | Record check-out (→ COMPLETED) |
| `POST` | `/api/bookings/:bookingId/care-report` | Caregiver | Submit daily care report |
| `GET` | `/api/bookings/:bookingId/care-reports` | Both | List care reports for booking |
| `POST` | `/api/bookings/:bookingId/modify` | Both | Request a schedule modification |
| `POST` | `/api/bookings/:bookingId/modifications/:modId/respond` | Both | Respond to modification request |
| `POST` | `/api/bookings/:bookingId/dispute` | Both | Raise a dispute (→ DISPUTED) |
| `GET` | `/api/bookings/:bookingId/refund-preview` | Authenticated | Preview refund amount before cancelling |
| `GET` | `/api/bookings/:bookingId/slots` | Authenticated | Get slot assignments for booking |
| `PATCH` | `/api/bookings/status/:bookingId` | Admin | Force-update booking status |

---

### 3. Agreement Engine

The `AgreementService` enforces a **formal, dual-party consent flow** before payment is enabled.

**Generation Flow:**
1. When the caregiver calls `confirm`, `BookingService` triggers `AgreementService.generateAgreement()`.
2. The service builds a structured JSON **agreement content** object from the booking data including:
   - Party details (seeker + caregiver name, email, userId)
   - Booking details (service, dates, times, location, duration type)
   - Payment terms (total, currency, deadline, partial payment rules)
   - Tracking rules (daily check-in required, report submission, proof of work)
   - Leave policy (min notice hours, no sudden leave)
   - Penalty rules (missed work, late submission flags)
   - Dispute terms (evidence required, admin final decision, resolution days)
   - Platform rules (no off-platform comms, data privacy, fee percentage)
3. The agreement content is stored embedded in `booking.agreement.content` (Mixed schema field).
4. Booking status advances to **`agreement_pending`**.
5. Both parties are notified via the real-time engine.

**Acceptance Flow:**
1. Care Seeker accepts → `booking.agreement.seekerAccepted = true`
2. Caregiver accepts → `booking.agreement.caregiverAccepted = true`
3. When **both** have accepted → `agreement.accepted = true`, lifecycle status = `FULLY_ACCEPTED`, booking advances to **`payment_pending`**.
4. A PDF is generated on demand via PDFKit and optionally stored in Cloudinary.

**APIs:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/bookings/:bookingId/agreement` | Both | Get agreement content + acceptance state |
| `POST` | `/api/bookings/:bookingId/agreement/accept` | Both | Accept the agreement (idempotent) |
| `GET` | `/api/bookings/:bookingId/agreement/pdf` | Both | Download agreement as PDF |

**Agreement States:**

| `agreement.status` | `lifecycle` | Meaning |
|---|---|---|
| `pending` | `PENDING` | Generated, neither party has accepted |
| `pending` | `ACCEPTED_BY_SEEKER` | Seeker accepted, waiting on caregiver |
| `pending` | `ACCEPTED_BY_CAREGIVER` | Caregiver accepted, waiting on seeker |
| `accepted` | `FULLY_ACCEPTED` | Both accepted, payment now unlocked |

---

### 4. Tracking Engine

Enforces **daily caregiver accountability** for active bookings.

**Daily Log Lifecycle:**
- Each day the booking is `active` or `confirmed`, the caregiver must:
  1. **Check in** (GPS/manual/QR) → `trackingLog.checkIn` populated
  2. **Check out** → `trackingLog.checkOut` populated
  3. **Submit a tracking log** with tasks completed, photos, care notes, mood, vitals, etc.
- Each log has a `workflowStatus`: `LOG_PENDING` → `LOG_SUBMITTED` | `LOG_MISSED`
- If no log is submitted by end of day, the **Tracking Enforcement Cron** marks it `LOG_MISSED` with `issueFlag: true`.

**Admin Review:**
- Admins can approve, penalize, or dispute individual tracking logs.
- Late submissions (submitted after the scheduled day) are auto-flagged via `lateSubmissionFlag`.

**Cron Schedule:**
- Runs every **60 minutes** (warm-up after 20 seconds).
- Processes all `confirmed`, `active`, `in_progress`, and `completed` bookings.
- Calls `upsertMissedTrackingLogs()` to fill in missed entries retroactively.
- Sends caregiver reminders if today's log is still `LOG_PENDING`.

**APIs:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/tracking/check-in` | Caregiver | Record daily check-in with location |
| `POST` | `/api/tracking/check-out` | Caregiver | Record daily check-out |
| `POST` | `/api/tracking/submit` | Caregiver | Submit full tracking log (with images) |
| `GET` | `/api/tracking/:bookingId` | Both | Get all tracking logs for a booking |
| `PATCH` | `/api/tracking/:bookingId/:date/review` | Both | Seeker reviews/acknowledges a log |
| `PATCH` | `/api/tracking/:bookingId/:date/admin` | Admin | Admin override: approve/penalize/dispute |
| `POST` | `/api/tracking/:bookingId/:date/remind` | Admin | Manually trigger a tracking reminder |
| `GET` | `/api/tracking/admin/overview` | Admin | Paginated overview of all tracked bookings |

---

### 5. Notification Engine

Provides **reliable, multi-channel notification delivery** backed by BullMQ.

**Architecture:**
```
Service Layer
   └─ notificationService.create({ userId, type, title, message, channels })
         │
         ├─ Saves to MongoDB `notifications` collection (in-app inbox)
         └─ Enqueues to BullMQ `notification:queue`
               │
               ├─ Worker: inApp   → already saved; mark delivered
               ├─ Worker: push    → FCM / APNs push notification
               ├─ Worker: email   → emailService.send() via SMTP
               └─ Worker: sms     → SMS gateway integration
```

**Queue Configuration:**
- **Retry Policy:** Exponential backoff, up to 3 attempts.
- **Dead Letter Queue (DLQ):** Failed jobs land in `notification:dlq` for inspection.
- **Graceful Shutdown:** Workers drain the queue before process exit.

**Notification Types (60+):**
Covers booking workflow, check-in/out, care reports, payment, chat, documents, profile, reviews, system alerts, reservation lifecycle, agreement workflow, task deadlines, and safety events.

**APIs:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Authenticated | Get paginated notification inbox |
| `GET` | `/api/notifications/unread-count` | Authenticated | Get count of unread notifications |
| `GET` | `/api/notifications/preferences` | Authenticated | Get channel preferences |
| `PUT` | `/api/notifications/preferences` | Authenticated | Update channel preferences (email, push, sms) |
| `PATCH` | `/api/notifications/read-all` | Authenticated | Mark all notifications as read |
| `PATCH` | `/api/notifications/:notificationId/read` | Authenticated | Mark single notification as read |
| `DELETE` | `/api/notifications/:notificationId` | Authenticated | Delete a notification |

---

### 6. Real-Time Engine

Powered by **Socket.IO 4.8** with a custom `EventBus` class that wraps all emit operations.

**Connection & Authentication:**
- Client connects via `WSS` and authenticates by passing the JWT access token.
- On connection, the user is registered in the EventBus user map and joined to their personal room `user:<userId>`.
- Caregivers are also tracked in role-based sets for broadcast operations.

**Room Targeting Strategy:**

| Target | Room Name | Use Case |
|---|---|---|
| Single user | `user:<userId>` | Personal notifications |
| Booking parties | `booking:<bookingId>` | Booking state changes |
| Role broadcast | `role:caregiver` / `role:admin` | Platform-wide announcements |
| All clients | `*` | System updates |

**EventBus Methods:**

| Method | Description |
|---|---|
| `emitToUser(userId, event, payload)` | Emit to a single user's socket room |
| `emitToBookingParties(booking, event, payload)` | Emit to both seeker and caregiver of a booking |
| `emitToRole(role, event, payload)` | Broadcast to all connected users with a given role |
| `emitToAll(event, payload)` | Broadcast to all connected sockets |
| `isUserConnected(userId)` | Check if a user has an active socket connection |
| `getConnectionStats()` | Returns `{ total, byRole }` connection counts |

---

### 7. Admin Module

Full platform monitoring, content moderation, and operational control.

**Capabilities:**
- **Dashboard Analytics**: revenue stats, booking funnels, user growth, time-series charts.
- **User Management**: view/approve/suspend/delete users; role assignment.
- **Caregiver Verification**: background check status, featured toggle, profile verification.
- **Document Review**: approve or reject uploaded verification documents.
- **Booking Intervention**: force-update status, admin cancel, resolve disputes.
- **Tracking Oversight**: paginated overview of all active tracking; per-log actions (approve, penalize, dispute).
- **Location Proof Management**: verify/reject care seeker location proofs.

**APIs:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/dashboard/stats` | Platform KPI summary |
| `GET` | `/api/admin/analytics/full` | Full time-series analytics |
| `GET` | `/api/admin/analytics/revenue` | Revenue breakdown |
| `GET` | `/api/admin/users` | All users (paginated + filterable) |
| `PATCH` | `/api/admin/users/:userId/status` | Activate/suspend user |
| `POST` | `/api/admin/users/:userId/approve` | Approve a pending user |
| `GET` | `/api/admin/bookings` | All bookings (admin view) |
| `PATCH` | `/api/admin/bookings/:bookingId/status` | Force booking status change |
| `POST` | `/api/admin/bookings/:bookingId/resolve-dispute` | Resolve a dispute |
| `GET` | `/api/admin/documents` | All uploaded documents |
| `PATCH` | `/api/admin/documents/:documentId/verify` | Approve document |
| `PATCH` | `/api/admin/documents/:documentId/reject` | Reject document |
| `GET` | `/api/tracking/admin/overview` | Tracking compliance overview |

---

## 🔁 Booking State Machine

### State Diagram

```
                        ┌─────────┐
              ┌─────────│  START  │
              │         └─────────┘
              │ POST /bookings
              ▼
         ┌──────────┐  (timer expires)  ┌─────────┐
         │ RESERVED │──────────────────▶│ EXPIRED │
         └────┬─────┘                   └─────────┘
              │ /submit
              ▼
         ┌─────────┐  /reject   ┌──────────┐
         │ PENDING │───────────▶│ REJECTED │
         └────┬────┘            └──────────┘
              │ /confirm (caregiver)
              ▼
         ┌──────────┐
         │ ACCEPTED │ (auto-transitions after agreement generated)
         └────┬─────┘
              │ agreement generated
              ▼
     ┌──────────────────┐
     │ AGREEMENT_PENDING │ ◀── both parties must call /agreement/accept
     └────────┬─────────┘
              │ fully accepted
              ▼
     ┌─────────────────┐
     │ PAYMENT_PENDING  │ ◀── payment gateway initiated
     └────────┬─────────┘
              │ payment confirmed
              ▼
         ┌───────────┐
         │ CONFIRMED  │
         └─────┬──────┘
               │ /check-in (caregiver)
               ▼
          ┌────────┐
          │ ACTIVE │
          └────┬───┘
               │ /check-out (caregiver)
               ▼
         ┌───────────┐   /dispute  ┌──────────┐
         │ COMPLETED │────────────▶│ DISPUTED │
         └───────────┘             └────┬─────┘
                                        │ admin resolve
                                        ▼
                              ┌──────────────────┐
                              │ COMPLETED/CANCELLED│
                              └──────────────────┘

    ─ ─ ─  Any non-terminal state can transition → CANCELLED  ─ ─ ─
```

### State Transition Rules

| From | Allowed Transitions | Triggered By |
|---|---|---|
| `reserved` | `pending`, `expired`, `cancelled` | Submit / timer / cancel |
| `pending` | `accepted`, `rejected`, `cancelled` | Caregiver action / cancel |
| `accepted` | `agreement_pending`, `cancelled` | Auto after caregiver accept |
| `agreement_pending` | `payment_pending`, `cancelled` | Both parties accept agreement |
| `payment_pending` | `confirmed`, `cancelled` | Successful payment / cancel |
| `confirmed` | `active`, `in_progress`, `cancelled` | Check-in / cancel |
| `active` | `completed`, `disputed`, `cancelled` | Check-out / dispute / cancel |
| `in_progress` | `active`, `completed`, `disputed` | Legacy alias migration |
| `completed` | `disputed` | Post-completion dispute only |
| `cancelled` | *(none)* | Terminal state |
| `rejected` | *(none)* | Terminal state |
| `expired` | *(none)* | Terminal state |
| `disputed` | `completed`, `cancelled` | Admin resolution |

### Slot-Blocking Statuses

Bookings in the following statuses prevent the caregiver's time slot from being double-booked:

```
reserved · pending · accepted · agreement_pending · payment_pending · confirmed · active · in_progress
```

### Cancellation Refund Policy

| Hours Before Start | Refund | Fee |
|---|---|---|
| > 24 hours | 100% | None |
| 12–24 hours | 50% | 50% of total |
| < 6 hours | 0% | Full cancellation fee |

---

## 📊 API Reference

> **Base URL:** `https://api.careconnect.com/api`
>
> **Authentication:** All protected routes require `Authorization: Bearer <access_token>` header.
>
> **Standard Response Envelope:**
> ```json
> {
>   "success": true,
>   "message": "Operation description",
>   "data": { ... }
> }
> ```
> **Error Response:**
> ```json
> {
>   "success": false,
>   "message": "Error description",
>   "error": "ERROR_CODE",
>   "details": [ ... ]
> }
> ```

---

### 🔑 Auth APIs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new user |
| `POST` | `/auth/register/complete` | Public | Upload documents to complete registration |
| `POST` | `/auth/login` | Public | Login with email + password |
| `POST` | `/auth/admin/login` | Public | Admin-only login endpoint (stricter rate limit) |
| `GET` | `/auth/verify-email` | Public | Verify email via token from email link |
| `POST` | `/auth/resend-verification` | Public | Resend email verification |
| `POST` | `/auth/forgot-password` | Public | Request password reset email |
| `POST` | `/auth/reset-password` | Public | Reset password with token |
| `POST` | `/auth/refresh` | Public | Refresh access token using refresh token |
| `POST` | `/auth/logout` | Public | Clear refresh token cookie |
| `POST` | `/auth/change-password` | Authenticated | Change password (requires current password) |
| `POST` | `/auth/logout-all` | Authenticated | Revoke all refresh tokens for the user |
| `GET` | `/auth/me` | Authenticated | Get current user profile |
| `GET` | `/auth/google` | Public | Initiate Google OAuth flow |
| `GET` | `/auth/google/callback` | Public | Google OAuth callback handler |

**Register Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "role": "care_seeker",
  "phone": "+9779800000000"
}
```

**Login Response:**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "email": "jane@example.com", "role": "care_seeker" },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

---

### 📅 Booking APIs

**Create Booking Request:**
```json
{
  "caregiverId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "serviceType": "elderly_care",
  "bookingType": "one_time",
  "durationType": "daily",
  "schedule": {
    "startDate": "2025-08-01",
    "endDate": "2025-08-07",
    "startTime": "08:00",
    "endTime": "18:00"
  },
  "location": {
    "address": "123 Main St",
    "city": "Kathmandu"
  },
  "careRecipient": {
    "name": "John Doe Sr.",
    "relationship": "father",
    "age": 75,
    "careType": "elderly"
  }
}
```

**Create Booking Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Booking reserved successfully",
  "data": {
    "booking": {
      "_id": "...",
      "bookingNumber": "CC-20250801-XXXX",
      "status": "reserved",
      "pricing": {
        "rateType": "daily",
        "rate": 2500,
        "subtotal": 17500,
        "platformFee": 1750,
        "total": 19250,
        "currency": "NPR"
      }
    },
    "reservationInfo": {
      "expiresAt": "2025-08-01T10:10:00.000Z",
      "remainingSeconds": 600,
      "maxExtensions": 2,
      "extensionsUsed": 0
    }
  }
}
```

**Get My Bookings Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | `string` | Filter by booking status |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Results per page (default: 10) |
| `sortBy` | `string` | Field to sort by (default: `createdAt`) |
| `sortOrder` | `string` | `asc` \| `desc` |
| `startDate` | `ISO date` | Filter bookings starting from |
| `endDate` | `ISO date` | Filter bookings ending before |

---

### 📜 Agreement APIs

**Get Agreement Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "...",
    "bookingNumber": "CC-20250801-XXXX",
    "bookingStatus": "agreement_pending",
    "agreement": {
      "agreementId": "AGR-XXXX",
      "status": "pending",
      "accepted": false,
      "seekerAccepted": true,
      "caregiverAccepted": false,
      "seekerAcceptedAt": "2025-08-01T11:00:00.000Z",
      "caregiverAcceptedAt": null,
      "version": "v1",
      "content": {
        "parties": { ... },
        "bookingDetails": { ... },
        "paymentTerms": { ... },
        "trackingRules": { ... },
        "penaltyRules": { ... },
        "disputeTerms": { ... }
      }
    }
  }
}
```

**Accept Agreement Response (partial — waiting on other party):**
```json
{
  "success": true,
  "message": "Agreement accepted. Waiting for the caregiver to also accept.",
  "data": {
    "bookingId": "...",
    "bookingNumber": "CC-20250801-XXXX",
    "status": "agreement_pending"
  }
}
```

**Accept Agreement Response (fully accepted):**
```json
{
  "success": true,
  "message": "Agreement fully accepted. Booking is now awaiting payment.",
  "data": {
    "bookingId": "...",
    "bookingNumber": "CC-20250801-XXXX",
    "newStatus": "payment_pending"
  }
}
```

---

### 📊 Tracking APIs

**Submit Tracking Log Request:**
```json
{
  "bookingId": "...",
  "date": "2025-08-03",
  "tasksCompleted": ["medication", "bathing", "meal_preparation"],
  "mood": "good",
  "vitals": { "bloodPressure": "120/80", "temperature": "98.6" },
  "notes": "Patient was in good spirits today.",
  "issueFlag": false
}
```

**Get Tracking Logs Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "...",
    "bookingNumber": "CC-20250801-XXXX",
    "bookingStatus": "active",
    "trackingStatus": "LOG_SUBMITTED",
    "controls": {
      "trackingEnabled": true,
      "chatEnabled": true,
      "mapVisible": true
    },
    "trackingLogs": [
      {
        "date": "2025-08-03T00:00:00.000Z",
        "dateKey": "2025-08-03",
        "status": "submitted",
        "workflowStatus": "LOG_SUBMITTED",
        "missed": false,
        "lateSubmission": false,
        "issueFlag": false,
        "checkIn": { "time": "2025-08-03T08:05:00.000Z" },
        "checkOut": { "time": "2025-08-03T17:55:00.000Z" }
      }
    ],
    "summary": {
      "submitted": 3,
      "pending": 0,
      "flagged": 0,
      "missed": 0,
      "expectedDays": 7
    }
  }
}
```

---

### 💳 Payment APIs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/payments/config` | Public | Get Stripe publishable key |
| `GET` | `/payments/gateways` | Public | List available payment gateways |
| `POST` | `/payments/checkout-session` | Authenticated | Create Stripe Checkout session |
| `POST` | `/payments/khalti/initiate` | Authenticated | Initiate Khalti payment |
| `POST` | `/payments/khalti/verify` | Authenticated | Verify Khalti payment callback |
| `POST` | `/payments/esewa/initiate` | Authenticated | Initiate eSewa payment |
| `POST` | `/payments/esewa/verify` | Authenticated | Verify eSewa payment callback |
| `POST` | `/payments/webhook` | Public (Stripe sig) | Stripe webhook receiver |
| `GET` | `/payments/bookings/:bookingId/summary` | Authenticated | Payment summary for booking |
| `GET` | `/payments/transactions` | Authenticated | My transaction history |
| `GET` | `/payments/transactions/:id/invoice/pdf` | Authenticated | Download invoice PDF |
| `GET` | `/payments/earnings` | Caregiver | Earnings dashboard |
| `POST` | `/payments/admin/:bookingId/release` | Admin | Release escrowed payment to caregiver |
| `POST` | `/payments/admin/:bookingId/refund` | Admin | Process refund to care seeker |

**Stripe Checkout Request:**
```json
{
  "bookingId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "amount": 19250,
  "currency": "NPR",
  "successUrl": "https://app.careconnect.com/payment/success",
  "cancelUrl": "https://app.careconnect.com/payment/cancel"
}
```

---

### 🔔 Notification APIs

**Get Notifications Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | `number` | Page (default: 1) |
| `limit` | `number` | Per page (default: 20) |
| `unreadOnly` | `boolean` | Filter to unread only |
| `type` | `string` | Filter by notification type |

---

### 👮 Admin APIs

**Admin Booking Cancel Request:**
```json
{
  "reason": "Care seeker reported no-show by caregiver",
  "refundPercentage": 100
}
```

**Resolve Dispute Request:**
```json
{
  "resolution": "Refund issued to care seeker after evidence review.",
  "outcome": "refund",
  "refundAmount": 19250
}
```

---

## 🗄️ Database Schema

### User Model

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `firstName` | String | Required |
| `lastName` | String | Required |
| `email` | String | Unique, required |
| `password` | String | Bcrypt hashed |
| `role` | String | `care_seeker` \| `caregiver` \| `admin` |
| `status` | String | `pending` \| `active` \| `suspended` \| `deleted` |
| `isEmailVerified` | Boolean | Email confirmation flag |
| `googleId` | String | Google OAuth subject |
| `avatar` | String | Cloudinary URL |
| `phone` | String | |
| `createdAt` | Date | |
| `updatedAt` | Date | |

---

### Booking Model (Core)

| Field | Type | Description |
|---|---|---|
| `bookingNumber` | String | Unique human-readable ID (e.g. `CC-20250801-XXXX`) |
| `careSeekerId` | ObjectId → User | |
| `caregiverId` | ObjectId → User | |
| `careRecipient` | Object | Name, relationship, age, gender, care type, conditions |
| `serviceType` | String | Enum: 8 service types |
| `bookingType` | String | `one_time` \| `recurring` |
| `status` | String | 13-state enum |
| `reservationExpiry` | Date | Indexed; TTL for RESERVED state |
| `reservedAt` | Date | |
| `extensionCount` | Number | Default 0; max 2 |
| `caregiverAcceptance` | Object | `{status, respondedAt, notes}` |
| `schedule` | Object | `{startDate, endDate, startTime, endTime, timezone, recurringPattern}` |
| `durationType` | String | `hourly` \| `half_day` \| `daily` \| `full_day` \| `weekly` \| `monthly` \| `long_term` |
| `location` | Object | Address, city, state, zip, GeoJSON coordinates, instructions |
| `pricing` | Object | `{rateType, rate, totalHours, subtotal, platformFee, platformFeePercentage, taxes, total, currency}` |
| **`agreement`** | Object | Embedded agreement (see below) |
| `payment` | Object | Legacy `{status, method, transactionId, paidAt, escrowHeld}` |
| `paymentStatus` | String | `unpaid` \| `payment_pending` \| `fully_paid` \| `refunded` \| … |
| `totalAmount` | Number | Canonical total |
| `amountPaid` | Number | Sum of successful payments |
| `amountDue` | Number | `totalAmount - amountPaid` |
| `paymentDeadline` | Date | Payment expires after this date |
| `stripeSessionIds` | [String] | All Stripe Checkout Session IDs |
| `khaltiTransactionIds` | [String] | Khalti transaction IDs |
| `esewaTransactionIds` | [String] | eSewa transaction IDs |
| `checkIn` | Object | `{time, location (GeoJSON), notes, verifiedBy}` |
| `checkOut` | Object | `{time, location (GeoJSON), notes}` |
| `trackingLogs` | [Object] | Daily log array (see Tracking Engine) |
| `careReports` | [Object] | Daily care report array |
| `modifications` | [Object] | Modification request history |
| `dispute` | Object | `{raisedBy, reason, description, evidence, status, createdAt}` |
| `cancellation` | Object | `{cancelledBy, reason, cancelledAt, refundAmount, cancellationFee}` |
| `careInstructions` | String | Special care instructions |
| `notes` | String | General notes |

**Embedded `agreement` Object:**

| Field | Type | Description |
|---|---|---|
| `agreementId` | String | Unique agreement reference |
| `status` | String | `pending` \| `accepted` \| `rejected` \| `revoked` |
| `accepted` | Boolean | `true` when both parties have accepted |
| `acceptedAt` | Date | Timestamp of full acceptance |
| `pdfUrl` | String | Cloudinary URL of generated PDF |
| `version` | String | Default `v1` |
| `content` | Mixed | Full structured agreement JSON |
| `seekerAccepted` | Boolean | Care seeker acceptance flag |
| `caregiverAccepted` | Boolean | Caregiver acceptance flag |
| `seekerAcceptedAt` | Date | |
| `caregiverAcceptedAt` | Date | |

**Indexes on Booking:**
- `bookingNumber` (unique)
- `careSeekerId`, `caregiverId` (query optimization)
- `status` (filtered queries)
- `reservationExpiry` (TTL-like expiry queries)
- `paymentStatus`
- `schedule.startDate`, `schedule.endDate`
- `location.coordinates` (2dsphere — geospatial queries)

---

### Caregiver Model

| Field | Type | Description |
|---|---|---|
| `userId` | ObjectId → User | One-to-one with User |
| `bio` | String | Professional bio |
| `experience` | Number | Years of experience |
| `services` | [String] | List of service types offered |
| `pricing` | Object | `{hourly, daily, weekly, monthly, currency}` |
| `availability` | Object | Weekly schedule + blocked dates |
| `rating` | Number | Average rating (0–5) |
| `reviewCount` | Number | |
| `backgroundCheck` | Object | `{status, verifiedAt, provider}` |
| `isVerified` | Boolean | Admin-verified profile |
| `isFeatured` | Boolean | Admin-featured on search results |
| `isSuspended` | Boolean | Blocks new booking acceptance |
| `documents` | [ObjectId] | References to CaregiverDocument |
| `languages` | [String] | Spoken languages |
| `certifications` | [Object] | Professional certifications |

---

### Notification Model

| Field | Type | Description |
|---|---|---|
| `userId` | ObjectId → User | Recipient |
| `type` | String | One of 60+ `NOTIFICATION_TYPE` enums |
| `title` | String | Short title for display |
| `message` | String | Full notification message |
| `isRead` | Boolean | Default `false` |
| `priority` | String | `low` \| `normal` \| `high` \| `urgent` |
| `data.referenceId` | ObjectId | Related resource ID (e.g. bookingId) |
| `data.referenceType` | String | Resource type (e.g. `booking`) |
| `data.actionUrl` | String | Deep-link URL for client navigation |
| `data.metadata` | Object | Event-specific data (bookingNumber, status, etc.) |
| `channels` | Object | `{inApp, push, email, sms}` delivery flags |
| `createdAt` | Date | |

---

### Transaction Model

| Field | Type | Description |
|---|---|---|
| `bookingId` | ObjectId → Booking | |
| `userId` | ObjectId → User | Payer |
| `caregiverId` | ObjectId → User | Payee |
| `gateway` | String | `stripe` \| `khalti` \| `esewa` \| `cash` |
| `gatewayTransactionId` | String | Gateway's transaction reference |
| `amount` | Number | Amount in base currency unit |
| `currency` | String | Default `NPR` |
| `status` | String | `pending` \| `completed` \| `failed` \| `refunded` |
| `type` | String | `payment` \| `refund` \| `payout` \| `platform_fee` |
| `platformFee` | Number | Platform fee deducted |
| `netAmount` | Number | Amount after fee |
| `metadata` | Object | Gateway-specific response data |
| `createdAt` | Date | |

---

### Slot Model

| Field | Type | Description |
|---|---|---|
| `caregiverId` | ObjectId → User | |
| `date` | Date | Slot date |
| `startTime` | String | `HH:MM` |
| `endTime` | String | `HH:MM` |
| `isAvailable` | Boolean | |
| `bookingId` | ObjectId → Booking | Null if free |
| `blockedReason` | String | Manual block reason |

---

## ⚡ Real-Time Events

All events are emitted by the `EventBus` using Socket.IO. Clients listen on their personal `user:<userId>` room or on a `booking:<bookingId>` room.

### Booking Events

| Event | Emitted To | Payload |
|---|---|---|
| `BOOKING_CREATED` | Care Seeker | `{ bookingId, bookingNumber, status, reservationExpiry }` |
| `BOOKING_ACCEPTED` | Both parties | `{ bookingId, bookingNumber, status: "agreement_pending" }` |
| `BOOKING_AGREEMENT_GENERATED` | Both parties | `{ bookingId, bookingNumber, agreementId }` |
| `BOOKING_AGREEMENT_ACCEPTED` | Both parties | `{ bookingId, bookingNumber, acceptedBy, fullyAccepted }` |
| `BOOKING_PAYMENT_COMPLETED` | Both parties | `{ bookingId, bookingNumber, amountPaid }` |
| `BOOKING_PAYMENT_FAILED` | Care Seeker | `{ bookingId, bookingNumber, error }` |
| `BOOKING_CONFIRMED` | Both parties | `{ bookingId, bookingNumber, status: "confirmed" }` |
| `BOOKING_ACTIVE` | Both parties | `{ bookingId, bookingNumber, checkInTime }` |
| `BOOKING_COMPLETED` | Both parties | `{ bookingId, bookingNumber, checkOutTime }` |
| `BOOKING_CANCELLED` | Both parties | `{ bookingId, bookingNumber, cancelledBy, refundAmount }` |

### Tracking Events

| Event | Emitted To | Payload |
|---|---|---|
| `TRACKING_SUBMITTED` | Both parties | `{ bookingId, bookingNumber, dateKey, workflowStatus }` |
| `TRACKING_FLAGGED` | Both parties + Admin | `{ bookingId, bookingNumber, dateKey, issueFlag }` |
| `TRACKING_MISSED` | Both parties + Admin | `{ bookingId, bookingNumber, source: "tracking_enforcement_cron" }` |

### Dispute & System Events

| Event | Emitted To | Payload |
|---|---|---|
| `DISPUTE_CREATED` | Both parties + Admin | `{ bookingId, disputeId, raisedBy }` |
| `DISPUTE_RESOLVED` | Both parties | `{ bookingId, outcome, refundAmount }` |
| `DISPUTE_UPDATED` | Both parties | `{ bookingId, disputeId, status }` |
| `NOTIFICATION_CREATED` | Recipient user | Full notification object |
| `SYSTEM_STATS_UPDATED` | Admin role | Platform-wide stats snapshot |

### Availability Events

| Event | Emitted To | Payload |
|---|---|---|
| `availability:update` | Caregiver's room | `{ caregiverId, bookingId, changes, timestamp }` |

---

## 🔒 Security

### Authentication
- **Access Token:** Short-lived JWT (default 15 min), signed with `JWT_ACCESS_SECRET`.
- **Refresh Token:** Long-lived JWT (default 7 days), stored in a signed `HttpOnly` cookie + MongoDB `tokens` collection.
- **Token Rotation:** Every refresh invalidates the old token and issues a new pair.
- **Revocation:** `POST /auth/logout-all` removes all refresh tokens for the user.
- **Password Hashing:** bcryptjs with default salt rounds.

### Authorization
Three-level RBAC enforced by `auth.middleware.js`:
- `authenticate` — verifies the JWT access token.
- `requireActive` — ensures the account is not suspended or pending.
- `authorize(role)` — checks the user's role (e.g. `admin`, `caregiver`).

### Rate Limiting
`express-rate-limit` configured per route sensitivity:

| Limiter | Applied To | Limit |
|---|---|---|
| `apiLimiter` | All `/api/*` routes | General limit |
| `authLimiter` | `/api/auth/register`, `/api/auth/login` | Strict |
| `adminAuthLimiter` | `/api/auth/admin/login` | Very strict |
| `passwordResetLimiter` | `/api/auth/forgot-password`, `/reset-password` | Strict |
| `refreshTokenLimiter` | `/api/auth/refresh` | Moderate |

### HTTP Security Headers (Helmet)
- **Content-Security-Policy** (production only): restricts script, style, image, and connect sources.
- **HSTS** (production only): `max-age=31536000; includeSubDomains; preload`
- **X-Frame-Options:** `DENY`
- **X-Content-Type-Options:** `nosniff`
- **Referrer-Policy:** `strict-origin-when-cross-origin`
- **hidePoweredBy:** removes `X-Powered-By: Express` header.

### CORS
- Whitelist-based: only `FRONTEND_URL` (+ `localhost:3000/3001` in development).
- `credentials: true` required for cookie-based auth.
- Preflight cache: 86400 seconds.

### Input Validation
- All request bodies are validated by **Joi schemas** via the `validateRequest` middleware factory.
- Auth routes use **express-validator** chains in addition.
- File uploads restricted by MIME type and size limits in `multer` configuration.

### Webhook Security
- Stripe webhook endpoint receives **raw body** (applied before `express.json`) for HMAC signature verification.

---

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique JWT secrets (validated at boot)
- [ ] Enable Redis (`REDIS_ENABLED=true`) for queue reliability
- [ ] Configure Cloudinary for persistent image storage
- [ ] Set `FRONTEND_URL` to the exact production origin
- [ ] Enable SMTP credentials for email delivery
- [ ] Configure Stripe webhook endpoint and secret
- [ ] Run `npm run seed:admin` to create the first admin user
- [ ] Run `npm run startup:check` to validate all connections
- [ ] Set `trust proxy` to `1` if behind a reverse proxy (Nginx/Caddy) — automatically set in production

### PM2 (Recommended for VPS)

```bash
# Install PM2 globally
npm install -g pm2

# Start the server
pm2 start src/server.js --name careconnect-api --interpreter node

# Enable auto-restart on reboot
pm2 startup
pm2 save

# Monitor logs
pm2 logs careconnect-api
pm2 monit
```

**`ecosystem.config.cjs` example:**
```js
module.exports = {
  apps: [{
    name: 'careconnect-api',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
EXPOSE 5000
CMD ["node", "src/server.js"]
```

```yaml
# docker-compose.yml
version: '3.9'
services:
  api:
    build: .
    ports:
      - "5000:5000"
    env_file: .env
    depends_on:
      - mongodb
      - redis

  mongodb:
    image: mongo:7
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  mongo_data:
  redis_data:
```

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl;
    server_name api.careconnect.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> The `X-Forwarded-Proto` header is required for `trust proxy: 1` to work correctly with rate limiters and secure cookies.

---

## 🧪 Testing

```bash
# Run all tests (Jest with ESM support)
npm test

# Run with coverage
npm test -- --coverage

# Run a specific test file
npm test -- --testPathPattern=booking.service
```

**Test Stack:**
- **Jest 29** with `--experimental-vm-modules` for ESM support.
- Tests live in `src/**/__tests__/` or `*.test.js` co-located files.

**Test Structure (recommended):**
```
src/
├── services/
│   ├── booking.service.js
│   └── __tests__/
│       ├── booking.createBooking.test.js
│       ├── booking.stateMachine.test.js
│       └── agreement.acceptance.test.js
└── utils/
    └── __tests__/
        └── tokenUtils.test.js
```

---

## 📈 Performance & Scaling

### MongoDB Indexes
Critical indexes defined on the Booking model:
- **Compound index** on `(caregiverId, status, schedule.startDate)` — powers availability conflict checks.
- **`reservationExpiry` index** — efficiently queried by the expiry background job.
- **`paymentStatus` index** — payment dashboard queries.
- **`location.coordinates` (2dsphere)** — geospatial caregiver search.
- All `bookingNumber` lookups are O(1) via unique index.

### Caching Strategy
- `src/utils/cache.js` provides an **in-memory TTL cache** used for:
  - Caregiver profile lookups during booking creation.
  - User session data (`src/utils/userCache.js`).
- For production horizontal scaling, replace with Redis-backed cache using `ioredis`.

### Compression
- `compression` middleware is active on all responses (`gzip`, level 6, threshold 1 KB).
- Large file downloads (PDFs, CSVs) bypass compression via `X-No-Compression` header.

### Horizontal Scaling
- The API is **stateless** (JWT auth, no in-process session).
- Socket.IO requires a **Redis adapter** (`@socket.io/redis-adapter`) when running multiple instances behind a load balancer. Wire it in `loaders/realtime.loader.js`.
- BullMQ workers scale independently — run dedicated worker processes alongside API nodes.

### Request Limits
- JSON body limit: **10 MB** (configurable for file uploads).
- Rate limits protect against DDoS on auth and public endpoints.

---

## 🐛 Debugging Guide

### Common Error: `400 Bad Request` on `POST /bookings/:id/agreement/accept`

**Symptom:** Agreement accept returns 400 even though the booking appears correct.

**Root Causes & Fixes:**

| Cause | Check | Fix |
|---|---|---|
| Booking not in `agreement_pending` status | `GET /api/bookings/:id` → check `status` | Ensure caregiver has called `/confirm` first |
| Caller is not a party to the booking | Verify `careSeekerId`/`caregiverId` matches authenticated user | Use the correct user's token |
| Agreement not generated yet | Check `booking.agreement.agreementId` is set | Trigger caregiver confirm to auto-generate |
| Both parties already accepted | `agreement.accepted === true` | This is a success state; check `bookingStatus` instead |
| Stale agreement state (recovery needed) | `agreement.status` vs `seekerAccepted`/`caregiverAccepted` mismatch | `GET /api/bookings/:id/agreement` triggers `syncAgreementStateInPlace` auto-repair |

### Common Error: Reservation Expires Immediately

**Cause:** Server clock drift or `reservationExpiry` computed against wrong timezone.
**Fix:** Ensure all date computation uses UTC. `schedule.timezone` defaults to `Asia/Kathmandu` but expiry is always UTC.

### Common Error: WebSocket Disconnects After Auth

**Cause:** Access token expired mid-session (15-min TTL).
**Fix:** Client must refresh the token before Socket.IO reconnect. Use the `disconnect` event to trigger a token refresh, then reconnect.

### Common Error: BullMQ Workers Not Processing

**Symptom:** Notifications appear in MongoDB but emails/push are not sent.
**Checks:**
1. `REDIS_ENABLED=true` in `.env`
2. Redis connection is healthy: `redis-cli ping`
3. Queue workers started: check server logs for `[QUEUE] Worker started`
4. Check dead letter queue for failed jobs.

### Common Error: `500` on PDF Download

**Cause:** `booking.agreement.content` is `null` (agreement not yet generated).
**Fix:** Agreement PDF is only available after status reaches `agreement_pending`. Check `agreement.agreementId` before calling the PDF endpoint.

### Logging

In development, the server uses `morgan('dev')` for HTTP request logs. Set `NODE_ENV=development` for verbose output. Application-level logs use the Winston logger configured in `src/utils/logger.js`.

```bash
# Watch server logs in real-time (PM2)
pm2 logs careconnect-api --lines 100

# Filter for cron output
pm2 logs careconnect-api | grep "\[CRON\]"

# Filter for booking errors
pm2 logs careconnect-api | grep "\[BookingService\]"
```

### Health & Diagnostics Endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Basic liveness check (`200 OK` = server is up) |
| `GET /api` | API version and available route groups |
| `GET /api/languages` | Supported localization languages |

---

## 📝 Changelog

### v1.0.0 — Initial Production Release
- Full 13-state booking lifecycle engine
- Reservation system with 10-minute hold and 2 extensions
- Dual-party agreement engine with PDF generation (PDFKit)
- Daily tracking enforcement cron (60-minute interval)
- BullMQ/Redis notification queue (in-app, email, push, SMS)
- Stripe + Khalti + eSewa payment gateway integration
- Socket.IO real-time event bus with role-based room targeting
- Google OAuth 2.0 login
- Stream.io video call integration
- AI caregiver matching endpoint
- Admin dashboard with full analytics and moderation tools
- Comprehensive rate limiting, Helmet CSP, CORS, and JWT security
- Cloudinary image storage for avatars, documents, and tracking photos

---

<div align="center">

**CareConnect Backend API**

Built with ❤️ by Mohammad Irshad Aalam

Node.js · Express · MongoDB · Socket.IO · BullMQ · Redis · Stripe · Cloudinary · PDFKit

</div>
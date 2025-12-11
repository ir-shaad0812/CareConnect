# CareConnect Frontend — Modern Care Booking Interface

<div align="center">

![CareConnect](public/logo.png)

**A full-featured, real-time care services marketplace built with Next.js 16 App Router**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black?logo=socket.io)](https://socket.io/)
[![License](https://img.shields.io/badge/License-Private-red)](LICENSE)

</div>

---

## 🌟 Overview

CareConnect is a **premium care services marketplace** that connects care seekers with verified caregivers. The frontend is a production-grade Next.js application that orchestrates a sophisticated multi-step booking lifecycle, real-time communication, video calling, payment processing, and live tracking — all within a single, cohesive interface.

### What the Frontend Does

- **Discovers & Matches** caregivers to care seekers via AI-assisted search with interactive Leaflet maps
- **Orchestrates a 10-step booking lifecycle** from slot selection → agreement signing → payment → active care → daily tracking → completion and review
- **Streams real-time data** through Socket.IO — live notifications, chat, booking status changes, and incoming video calls
- **Processes payments** via Stripe (checkout sessions + webhooks) and local gateways (Khalti, eSewa)
- **Hosts video calls** powered by the Stream Video React SDK
- **Protects routes** with JWT + httpOnly cookie auth, role-based guards, and session cache validation
- **Supports multiple languages** via i18next with browser-based language detection
- **Tracks care delivery** through caregiver-submitted daily logs that care seekers review and approve

### Tech Stack at a Glance

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.1 (App Router, RSC) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS v4 + `clsx` + `tailwind-merge` |
| Data Fetching | TanStack React Query v5 |
| Real-Time | Socket.IO Client v4.8 |
| Payments | Stripe React + Stripe.js |
| Video Calls | Stream Video React SDK |
| Maps | Leaflet + React-Leaflet + MarkerCluster |
| Charts | Recharts + custom chart components |
| Animations | Framer Motion v11 |
| i18n | i18next + react-i18next + browser detector |
| Date Handling | date-fns v4 |
| Icons | Lucide React |
| Fonts | Hubot Sans · Inter · IBM Plex Sans · IBM Plex Mono |

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Architecture](#️-architecture)
3. [Quick Start](#-quick-start)
4. [Project Structure](#-project-structure)
5. [Environment Variables](#-environment-variables)
6. [Design System](#-design-system)
7. [Pages & Routes](#-pages--routes)
8. [Booking Flow — Complete User Journey](#-booking-flow--complete-user-journey)
9. [Real-Time Features](#-real-time-features)
10. [API Integration](#-api-integration)
11. [Key Components](#-key-components)
12. [Authentication & Authorization](#-authentication--authorization)
13. [State Management](#-state-management)
14. [Role-Based Access](#-role-based-access)
15. [Common Issues & Fixes](#-common-issues--fixes)
16. [Deployment](#-deployment)
17. [Performance](#-performance)

---

## 🏗️ Architecture

### Next.js App Router Structure

CareConnect uses the **App Router** introduced in Next.js 13 and refined through version 16. Every directory under `src/app` is a route segment. Layouts compose hierarchically, enabling shared chrome (navbar, footer, dashboard sidebar) without re-mounting on navigation.

```
CareConnect/frontend/src/app/layout.tsx#L1-5
Root Layout  ──→  HTML shell + font variables + Providers tree
                  │
                  ├── (public pages)  ──→  Navbar + Footer
                  │
                  ├── /dashboard      ──→  DashboardRouteGuard
                  │     └── /caregiver | /careseeker
                  │
                  └── /admin          ──→  AdminLayout + AdminAuth
```

### Provider / Context Hierarchy

All client-side providers are composed in `src/app/providers.tsx` and wrap the entire React tree:

```
CareConnect/frontend/src/app/providers.tsx#L1-5
ErrorBoundary
  └── QueryClientProvider          ← TanStack React Query v5
        └── LanguageProvider       ← i18next context
              └── AuthProvider     ← JWT session + user state
                    └── SocketProvider    ← Socket.IO connection
                          └── VideoCallProvider   ← Stream Video SDK
                                └── {children}
                                      ├── UnifiedChatWidget (global)
                                      └── IncomingCallHandler (global)
```

### Component Architecture

```
/dev/null/arch.txt#L1-20
src/
├── app/              ← Next.js route segments (pages + layouts)
├── components/       ← Pure, reusable UI primitives and composites
│   ├── booking/      ← Booking-domain smart components
│   ├── ui/           ← Design-system atoms (Button, Card, Input…)
│   ├── layout/       ← Navbar, Footer, DashboardLayout, AdminLayout
│   ├── features/     ← Auth, chat, payments, reviews, search UI
│   ├── admin/        ← Admin-only component overrides
│   ├── ai-match/     ← AI caregiver matching UI
│   └── wallet/       ← Wallet/earnings UI
├── features/         ← Domain feature modules (collocated logic)
│   ├── auth/         ← Auth components, hooks, services, types
│   ├── booking/      ← Availability calendar, reservation timer
│   ├── chat/         ← Unified chat widget, premium chat, video
│   ├── health/       ← Health tracking components
│   ├── map/          ← Leaflet map components and hooks
│   ├── payment/      ← Stripe payment flow
│   ├── search/       ← Search filters and results
│   ├── user/         ← Profile, onboarding, settings
│   └── video/        ← Stream SDK video call logic
├── services/api/     ← Fetch-based API client + domain services
├── context/          ← React contexts (Auth, Socket, Language)
├── hooks/            ← Shared custom hooks
├── lib/              ← Utilities, constants, env, SEO helpers
└── types/            ← Global TypeScript interfaces
```

---

## ⚡ Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18.x or 20.x LTS |
| npm | 9.x+ |
| CareConnect Backend | Running on port 5000 |

### 1. Clone & Install

```/dev/null/bash.sh#L1-5
git clone https://github.com/your-org/careconnect.git
cd careconnect/frontend
npm install
```

### 2. Configure Environment

Create a `.env.local` file in the `frontend/` directory (see [Environment Variables](#-environment-variables) for the full reference):

```/dev/null/.env.local#L1-12
# Required
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional — if omitted, Socket.IO connects to NEXT_PUBLIC_API_URL host
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# Feature flags
NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN=true
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Third-party integrations
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STREAM_API_KEY=your-stream-api-key
NEXT_PUBLIC_STREAM_APP_ID=your-stream-app-id
NEXT_PUBLIC_MAPBOX_API_KEY=pk.eyJ1...
```

### 3. Run Development Server

```/dev/null/bash.sh#L1-3
npm run dev
# Starts Next.js with webpack bundler on http://localhost:3000
```

> **Note:** The `dev` script explicitly uses `--webpack` flag to ensure HMR stability. If you encounter HMR errors, see [Common Issues](#-common-issues--fixes).

### 4. Build for Production

```/dev/null/bash.sh#L1-4
npm run build      # Compile + optimize
npm run start      # Start production server on port 3000
```

### 5. Lint

```/dev/null/bash.sh#L1-2
npm run lint
```

---

## 📁 Project Structure

```
/dev/null/tree.txt#L1-120
frontend/
├── public/                        # Static assets (logo, og-image, icons)
├── src/
│   ├── app/                       # ← Next.js App Router root
│   │   ├── layout.tsx             # Root HTML shell + fonts + Providers
│   │   ├── page.tsx               # Landing page (redirects to /home)
│   │   ├── providers.tsx          # All client providers composed here
│   │   ├── globals.css            # Tailwind base + CSS variables
│   │   ├── error.tsx              # Global error boundary page
│   │   ├── not-found.tsx          # 404 page
│   │   ├── loading.tsx            # Global Suspense fallback
│   │   │
│   │   ├── home/                  # Marketing landing page
│   │   ├── about/                 # About CareConnect
│   │   ├── how-it-works/          # How the platform works
│   │   ├── safety/                # Safety & trust information
│   │   ├── help/                  # Help centre
│   │   ├── jobs/                  # Caregiver job board
│   │   ├── articles/              # Blog / knowledge base
│   │   ├── cost-calculator/       # Care cost estimator tool
│   │   ├── employer-benefits/     # Employer info page
│   │   ├── search/                # Caregiver search + filters
│   │   ├── browse/                # Browse all caregivers
│   │   ├── caregivers/            # Caregiver listing page
│   │   ├── caregiver/             # Public caregiver profile
│   │   ├── book/[id]/             # Book a specific caregiver
│   │   ├── booking/
│   │   │   ├── [bookingId]/
│   │   │   │   └── payment/       # Stripe payment step
│   │   │   └── confirmation/      # Post-payment confirmation
│   │   ├── bookings/              # Care seeker's bookings list
│   │   │
│   │   ├── login/                 # Login page
│   │   ├── register/              # Registration (role selection)
│   │   ├── verify-email/          # Email verification gate
│   │   ├── forgot-password/       # Password reset request
│   │   ├── reset-password/        # Password reset form
│   │   ├── onboarding/            # Post-registration onboarding
│   │   ├── waiting/               # Pending approval waiting room
│   │   ├── unauthorized/          # 403 access denied page
│   │   ├── auth/callback/         # OAuth2 callback handler
│   │   │
│   │   ├── profile/               # User profile editor
│   │   ├── messages/              # Messaging inbox
│   │   ├── message/               # Individual conversation thread
│   │   ├── notices/               # Platform notices/announcements
│   │   ├── my-care/               # Care seeker's care overview
│   │   ├── my-timetable/          # Caregiver's schedule view
│   │   ├── payroll/               # Payroll management
│   │   │
│   │   ├── dashboard/             # ← Auth-gated dashboard root
│   │   │   ├── layout.tsx         # DashboardRouteGuard wraps all /dashboard/*
│   │   │   ├── page.tsx           # Role-aware redirect hub
│   │   │   ├── activity/          # Activity feed
│   │   │   ├── notifications/     # Notification centre
│   │   │   ├── bookings/
│   │   │   │   ├── page.tsx       # Unified bookings list
│   │   │   │   └── [id]/          # Single booking detail + actions
│   │   │   ├── payments/          # Payment history
│   │   │   ├── earnings/          # Earnings overview (caregiver)
│   │   │   ├── reviews/           # Reviews sent/received
│   │   │   ├── disputes/          # Open disputes
│   │   │   ├── pending/           # Pending action items
│   │   │   ├── caregiver/         # ← Caregiver-only section
│   │   │   │   ├── page.tsx       # Caregiver dashboard home
│   │   │   │   ├── availability/  # Set weekly availability
│   │   │   │   ├── bookings/      # Caregiver booking management
│   │   │   │   ├── documents/     # Upload certifications/ID
│   │   │   │   ├── jobs/          # Applied/matched jobs
│   │   │   │   ├── my-work/       # Active care sessions
│   │   │   │   ├── notes/         # Care notes editor
│   │   │   │   ├── rates/         # Set hourly/daily rates
│   │   │   │   ├── reviews/       # Caregiver reviews received
│   │   │   │   ├── support/       # Support tickets
│   │   │   │   └── wallet/        # Earnings wallet
│   │   │   └── careseeker/        # ← Care seeker-only section
│   │   │       ├── page.tsx       # Care seeker dashboard home
│   │   │       ├── tracking/      # Review caregiver tracking logs
│   │   │       ├── notes/         # Care notes viewer
│   │   │       ├── support/       # Support tickets
│   │   │       └── wallet/        # Payment wallet
│   │   │
│   │   └── admin/                 # ← Admin panel (separate auth)
│   │       ├── layout.tsx         # AdminLayout guard
│   │       ├── login/             # Admin-specific login
│   │       ├── dashboard/         # Admin KPI dashboard
│   │       ├── users/             # User management
│   │       ├── caregivers/        # Caregiver verification + management
│   │       ├── care-seekers/      # Care seeker management
│   │       ├── bookings/          # All bookings oversight
│   │       ├── tracking/          # Global tracking log overview
│   │       ├── payments/          # Payment management
│   │       ├── disputes/          # Dispute resolution
│   │       ├── reviews/           # Review moderation
│   │       ├── documents/         # Document review
│   │       ├── analytics/         # Platform analytics + charts
│   │       ├── map/               # Caregiver/seeker geo map
│   │       ├── messages/          # Message monitoring
│   │       ├── chat-monitoring/   # Live chat oversight
│   │       ├── notices/           # Publish platform notices
│   │       ├── notifications/     # Notification broadcast
│   │       ├── notes/             # Care notes review
│   │       ├── jobs/              # Job board management
│   │       ├── feedback/          # User feedback review
│   │       ├── activity/          # Platform activity log
│   │       ├── users-activity/    # Per-user activity detail
│   │       ├── settings/          # Platform settings
│   │       └── help/              # Admin help docs
│   │
│   ├── components/
│   │   ├── booking/               # Booking-domain UI components
│   │   ├── ui/                    # Atomic design system components
│   │   ├── layout/                # Navbar, Footer, DashboardLayout
│   │   ├── features/              # Feature-specific composite components
│   │   ├── admin/                 # Admin-panel exclusive components
│   │   ├── ai-match/              # AI matching UI
│   │   ├── wallet/                # Wallet + transaction UI
│   │   └── ErrorBoundary.tsx      # Global React error boundary
│   │
│   ├── features/                  # Domain-collocated feature modules
│   │   ├── auth/                  # Auth guards, hooks, services
│   │   ├── booking/               # AvailabilityCalendar, ReservationTimer
│   │   ├── chat/                  # UnifiedChatWidget, QAChatWidget
│   │   ├── health/                # Health tracking features
│   │   ├── map/                   # Leaflet map components + hooks
│   │   ├── payment/               # Stripe integration hooks + components
│   │   ├── search/                # Search filters + result hooks
│   │   ├── user/                  # Profile, onboarding, settings
│   │   └── video/                 # Stream Video SDK integration
│   │
│   ├── services/api/              # Centralised API service layer
│   │   ├── client.ts              # Core fetch client (auth, refresh, retry)
│   │   ├── auth.service.ts        # Login, register, OAuth, refresh
│   │   ├── booking.service.ts     # Full booking lifecycle API
│   │   ├── availability.service.ts
│   │   ├── slot.service.ts        # Time slot management
│   │   ├── payment.service.ts     # Stripe + gateway calls
│   │   ├── wallet.service.ts      # Wallet balance + transactions
│   │   ├── chat.service.ts        # Conversation + message API
│   │   ├── video.service.ts       # Video call tokens + rooms
│   │   ├── caregiver.service.ts   # Caregiver profile + search
│   │   ├── user.service.ts        # User CRUD + profile update
│   │   ├── review.service.ts      # Ratings + reviews
│   │   ├── notification.service.ts
│   │   ├── dispute.service.ts     # Dispute raise + resolution
│   │   ├── dashboard.service.ts   # Dashboard stats
│   │   ├── search.service.ts      # Caregiver search + filters
│   │   ├── document.service.ts    # Document upload + verification
│   │   ├── location.service.ts    # Geocoding + location lookup
│   │   ├── aiMatch.service.ts     # AI caregiver matching
│   │   ├── admin.service.ts       # Admin-only platform operations
│   │   ├── job.service.ts         # Job board API
│   │   ├── task.service.ts        # Task management
│   │   ├── note.service.ts        # Care notes
│   │   ├── notice.service.ts      # Platform notices
│   │   └── feedback.service.ts    # User feedback
│   │
│   ├── context/                   # React Context providers
│   ├── hooks/                     # Shared custom React hooks
│   ├── lib/                       # Utilities, constants, env, SEO
│   ├── config/                    # env.ts — typed env variable access
│   ├── data/                      # Static data (FAQ, constants)
│   └── types/                     # Global TypeScript type definitions
│
├── next.config.mjs                # Next.js configuration
├── postcss.config.mjs             # PostCSS + Tailwind plugin
├── tsconfig.json                  # TypeScript compiler config
├── eslint.config.mjs              # ESLint flat config (Next.js ruleset)
└── package.json
```

---

## 🔐 Environment Variables

All environment variables consumed by the browser are prefixed with `NEXT_PUBLIC_`. They are validated at boot time by `src/lib/validate-env.ts` — missing required variables throw in production and warn in development.

Create `frontend/.env.local` (never commit this file):

```/dev/null/.env.local#L1-35
# ─────────────────────────────────────────────────────────────────────────────
# REQUIRED — App will not start without these in production
# ─────────────────────────────────────────────────────────────────────────────

# Backend REST API base URL (must end with /api)
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Frontend canonical URL (used for SEO, OG tags, OAuth callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─────────────────────────────────────────────────────────────────────────────
# OPTIONAL — Socket.IO connection
# ─────────────────────────────────────────────────────────────────────────────

# If omitted, the client derives this from NEXT_PUBLIC_API_URL's host.
# Only set this if your Socket.IO server lives on a different host/port.
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# ─────────────────────────────────────────────────────────────────────────────
# OPTIONAL — Authentication
# ─────────────────────────────────────────────────────────────────────────────

# Enable Google OAuth login button
NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN=true
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

# ─────────────────────────────────────────────────────────────────────────────
# OPTIONAL — Stripe (required for payment flow)
# ─────────────────────────────────────────────────────────────────────────────

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx

# ─────────────────────────────────────────────────────────────────────────────
# OPTIONAL — Stream Video SDK (required for video calls)
# ─────────────────────────────────────────────────────────────────────────────

NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key
NEXT_PUBLIC_STREAM_APP_ID=your_stream_app_id

# ─────────────────────────────────────────────────────────────────────────────
# OPTIONAL — Maps
# ─────────────────────────────────────────────────────────────────────────────

NEXT_PUBLIC_MAPBOX_API_KEY=pk.eyJ1IjoieW91ci11c2VyIn0...

# ─────────────────────────────────────────────────────────────────────────────
# OPTIONAL — SEO
# ─────────────────────────────────────────────────────────────────────────────

NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=xxxxxxxxxxxxxxxx
```

### Variable Reference Table

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | — | Backend REST API base URL |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | — | Frontend canonical URL |
| `NEXT_PUBLIC_SOCKET_URL` | ⚪ No | Derived from API URL | Socket.IO server URL |
| `NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN` | ⚪ No | `false` | Toggle Google OAuth button |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ⚪ No | — | Google OAuth client ID |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⚪ No | — | Stripe publishable key (required for payments) |
| `NEXT_PUBLIC_STREAM_API_KEY` | ⚪ No | — | Stream Video API key (required for video calls) |
| `NEXT_PUBLIC_STREAM_APP_ID` | ⚪ No | — | Stream Video app ID |
| `NEXT_PUBLIC_MAPBOX_API_KEY` | ⚪ No | — | Mapbox key for caregiver map |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | ⚪ No | — | Google Search Console verification |

---

## 🎨 Design System

### Typography

The app uses four Google Fonts loaded via `next/font/google` with `display: swap` for optimal performance:

| Variable | Font | Role | Weights |
|---|---|---|---|
| `--font-hubot` | Hubot Sans | Brand / headings | 400, 500, 600, 700 |
| `--font-inter` | Inter | Secondary UI | Variable (all) |
| `--font-ibm-sans` | IBM Plex Sans | Body / forms | 400, 500, 600 |
| `--font-mono` | IBM Plex Mono | Code / metadata | 400, 500 |

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| Primary / Brand | `#39B54A` | Buttons, CTAs, active states |
| Primary Dark | `#2D9240` | Button hover, focus rings |
| Background | `#F5F7FA` | Dashboard backgrounds |
| Surface | `#FFFFFF` | Cards, modals |
| Border | `#E5E7EB` | Dividers, input borders |
| Text Primary | `#111827` | Headings |
| Text Secondary | `#6B7280` | Descriptive copy |
| Text Muted | `#9CA3AF` | Placeholders, metadata |
| Danger | `#EF4444` | Errors, destructive actions |
| Warning | `#F59E0B` | Amber notices, pending states |
| Success | `#10B981` | Confirmed states, success toasts |

### Tailwind Configuration

Tailwind v4 is configured via PostCSS (`postcss.config.mjs`). CSS custom properties from `globals.css` expose the design tokens to both Tailwind utility classes and raw CSS.

### Utility Helpers

```/dev/null/utils.ts#L1-8
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind classes safely, resolving conflicts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Key UI Components

| Component | Path | Description |
|---|---|---|
| `Button` | `components/ui/Button.tsx` | Primary, secondary, ghost, destructive variants |
| `Card` | `components/ui/Card.tsx` | Surface container with shadow levels |
| `Input` | `components/ui/Input.tsx` | Accessible form inputs with error states |
| `Select` | `components/ui/Select.tsx` | Dropdown selector |
| `StarRating` | `components/ui/StarRating.tsx` | Interactive + read-only star rating |
| `TrustScoreBadge` | `components/ui/TrustScoreBadge.tsx` | Caregiver trust score indicator |
| `JourneyStepper` | `components/ui/JourneyStepper.tsx` | Multi-step booking progress indicator |
| `ActivityTimeline` | `components/ui/ActivityTimeline.tsx` | Chronological event display |
| `NotificationBell` | `components/ui/NotificationBell.tsx` | Bell icon with unread badge |
| `TimetableCalendar` | `components/ui/TimetableCalendar.tsx` | Weekly schedule grid |
| `CareCalendar` | `components/ui/CareCalendar.tsx` | Monthly care session calendar |
| `ModernCharts` | `components/ui/ModernCharts.tsx` | Recharts-based dashboard charts |
| `TransactionCard` | `components/ui/TransactionCard.tsx` | Payment/transaction list item |
| `LanguageSwitcher` | `components/ui/LanguageSwitcher.tsx` | i18n locale picker |

---

## 📱 Pages & Routes

### Public Pages

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Root — redirects to `/home` |
| `/home` | `app/home/page.tsx` | Marketing landing page |
| `/about` | `app/about/page.tsx` | About CareConnect |
| `/how-it-works` | `app/how-it-works/page.tsx` | Platform walkthrough |
| `/safety` | `app/safety/page.tsx` | Safety & vetting information |
| `/help` | `app/help/page.tsx` | Help centre |
| `/jobs` | `app/jobs/page.tsx` | Caregiver job board |
| `/articles` | `app/articles/page.tsx` | Blog / resources |
| `/cost-calculator` | `app/cost-calculator/page.tsx` | Interactive care cost tool |
| `/employer-benefits` | `app/employer-benefits/page.tsx` | Employer partnership info |
| `/search` | `app/search/page.tsx` | Caregiver search with filters |
| `/browse` | `app/browse/page.tsx` | Browse caregiver directory |
| `/caregivers` | `app/caregivers/page.tsx` | Caregiver listing |
| `/caregiver` | `app/caregiver/page.tsx` | Public caregiver profile |
| `/notices` | `app/notices/page.tsx` | Platform announcements |
| `/privacy-policy` | `app/privacy-policy/page.tsx` | Privacy policy |
| `/terms-of-service` | `app/terms-of-service/page.tsx` | Terms of service |
| `/cookies-policy` | `app/cookies-policy/page.tsx` | Cookie policy |
| `/copyright-policy` | `app/copyright-policy/page.tsx` | Copyright policy |

### Auth Pages

| Route | File | Access | Description |
|---|---|---|---|
| `/login` | `app/login/page.tsx` | Guest | Email + Google OAuth login |
| `/register` | `app/register/page.tsx` | Guest | Care seeker / caregiver signup |
| `/verify-email` | `app/verify-email/page.tsx` | Post-register | Email verification gate |
| `/forgot-password` | `app/forgot-password/page.tsx` | Guest | Password reset request |
| `/reset-password` | `app/reset-password/page.tsx` | Token link | New password form |
| `/onboarding` | `app/onboarding/page.tsx` | New users | Role-specific onboarding wizard |
| `/waiting` | `app/waiting/page.tsx` | Pending users | Approval waiting room |
| `/unauthorized` | `app/unauthorized/page.tsx` | Any | 403 role mismatch page |
| `/auth/callback` | `app/auth/callback/page.tsx` | OAuth | Google OAuth2 callback handler |

### Booking Pages (Care Seeker)

| Route | File | Description |
|---|---|---|
| `/book/[id]` | `app/book/[id]/page.tsx` | Caregiver booking wizard |
| `/bookings` | `app/bookings/page.tsx` | My bookings list |
| `/booking/[bookingId]/payment` | `app/booking/[bookingId]/payment/page.tsx` | Stripe payment step |
| `/booking/confirmation` | `app/booking/confirmation/page.tsx` | Post-payment success |

### Dashboard — Care Seeker (`/dashboard/careseeker/*`)

| Route | Description |
|---|---|
| `/dashboard/careseeker` | Overview: active bookings, upcoming sessions, wallet balance |
| `/dashboard/careseeker/tracking` | Review daily care logs submitted by caregiver |
| `/dashboard/careseeker/notes` | Care notes from caregiver |
| `/dashboard/careseeker/wallet` | Wallet balance, top-up, payment history |
| `/dashboard/careseeker/support` | Submit and track support tickets |

### Dashboard — Caregiver (`/dashboard/caregiver/*`)

| Route | Description |
|---|---|
| `/dashboard/caregiver` | Overview: active bookings, earnings, schedule |
| `/dashboard/caregiver/availability` | Set weekly availability windows |
| `/dashboard/caregiver/bookings` | Manage received booking requests |
| `/dashboard/caregiver/my-work` | Active care sessions and daily tracking submission |
| `/dashboard/caregiver/notes` | Write and manage care notes |
| `/dashboard/caregiver/documents` | Upload and manage certifications / ID documents |
| `/dashboard/caregiver/rates` | Configure hourly and daily service rates |
| `/dashboard/caregiver/jobs` | Browse and apply to care job postings |
| `/dashboard/caregiver/reviews` | View reviews from care seekers |
| `/dashboard/caregiver/wallet` | Wallet balance and payout management |
| `/dashboard/caregiver/support` | Submit and track support tickets |

### Dashboard — Shared Routes

| Route | Description |
|---|---|
| `/dashboard` | Role-aware redirect (→ caregiver or careseeker) |
| `/dashboard/bookings` | All bookings list (role-filtered) |
| `/dashboard/bookings/[id]` | Booking detail with full lifecycle actions |
| `/dashboard/payments` | Payment history |
| `/dashboard/earnings` | Earnings summary (caregiver-weighted) |
| `/dashboard/reviews` | Reviews sent and received |
| `/dashboard/disputes` | Open and resolved disputes |
| `/dashboard/notifications` | Notification centre |
| `/dashboard/activity` | Personal activity log |
| `/dashboard/pending` | Pending actions requiring attention |

### Admin Dashboard (`/admin/*`)

| Route | Description | Access |
|---|---|---|
| `/admin/login` | Admin authentication | Admin |
| `/admin/dashboard` | KPI cards, platform health metrics | Admin |
| `/admin/users` | All user management (CRUD, status) | Admin |
| `/admin/caregivers` | Caregiver approval, verification | Admin |
| `/admin/care-seekers` | Care seeker management | Admin |
| `/admin/bookings` | All platform bookings oversight | Admin |
| `/admin/tracking` | Global caregiver tracking log overview | Admin |
| `/admin/payments` | Payment management + reconciliation | Admin |
| `/admin/disputes` | Dispute resolution panel | Admin |
| `/admin/reviews` | Review moderation | Admin |
| `/admin/documents` | Document review + approval | Admin |
| `/admin/analytics` | Platform analytics with charts | Admin |
| `/admin/map` | Geo map of users and caregivers | Admin |
| `/admin/messages` | Message monitoring | Admin |
| `/admin/chat-monitoring` | Live chat oversight | Admin |
| `/admin/notices` | Publish platform-wide notices | Admin |
| `/admin/notifications` | Broadcast notifications | Admin |
| `/admin/notes` | Care notes review | Admin |
| `/admin/jobs` | Job board management | Admin |
| `/admin/feedback` | User feedback review | Admin |
| `/admin/activity` | Platform activity log | Admin |
| `/admin/users-activity` | Per-user activity detail | Admin |
| `/admin/settings` | Platform-wide settings | Admin |

---

## 🔁 Booking Flow — Complete User Journey

### Overview State Machine

```
/dev/null/states.txt#L1-20
pending_payment
     ↓
  confirmed   ←── (after Stripe/gateway payment)
     ↓
 agreement_pending
     ↓
 agreement_accepted  ←── (both parties signed)
     ↓
   active     ←── (check-in by caregiver)
     ↓
  tracking    ←── (daily log submission loop)
     ↓
  completed   ←── (check-out + review)

Exits at any state:
  cancelled   ←── (either party cancels)
  disputed    ←── (dispute raised by care seeker)
```

### Care Seeker Flow

```
/dev/null/flow.txt#L1-60
┌─────────────────────────────────────────────────────────────────┐
│                    CARE SEEKER BOOKING JOURNEY                  │
└─────────────────────────────────────────────────────────────────┘

STEP 1 ── Browse & Discover
  /search or /browse
  ├── Filter by service type, location, price, rating
  ├── View caregiver cards with TrustScoreBadge
  └── Open full caregiver profile page

STEP 2 ── Check Availability
  /book/[caregiverId]
  ├── AvailabilityCalendar shows caregiver's open slots
  ├── SlotPicker lets user select time windows
  └── SlotCards display selected slots summary

STEP 3 ── Create Booking Request
  /book/[caregiverId]
  ├── Fill in care recipient details
  ├── Select service type (elderly care, child care, etc.)
  ├── Choose duration type (hourly / daily / weekly)
  └── POST /bookings → status: pending_payment

STEP 4 ── Payment
  /booking/[bookingId]/payment
  ├── Stripe Elements UI embedded in page
  ├── POST /payments/checkout-session
  ├── Stripe webhook confirms payment server-side
  └── Booking → status: confirmed

          ↓ Booking confirmed ↓

STEP 5 ── Await Agreement
  /dashboard/bookings/[id]
  ├── AgreementViewer renders contract terms
  ├── ReservationTimer counts down acceptance window
  └── Care seeker accepts → agreementAcceptedBySeeker = true

STEP 6 ── Await Caregiver Acceptance
  /dashboard/bookings/[id]  [polling or WebSocket push]
  ├── Socket event: booking:accepted
  ├── Caregiver accepts agreement → agreementAcceptedByCaregiver = true
  └── Booking → status: agreement_accepted

          ↓ Both parties agreed ↓

STEP 7 ── Active Booking
  Status: active
  ├── Caregiver checks in (checkIn endpoint)
  ├── Real-time status update via Socket.IO
  └── JourneyStepper shows current phase

STEP 8 ── Daily Tracking Review
  /dashboard/careseeker/tracking
  ├── Care seeker receives log submission notification
  ├── Views TrackingLogForm (proof-of-work images, notes, vitals)
  ├── Approves or flags the log
  └── PATCH /bookings/:id/tracking/:logId/review

STEP 9 ── Completion
  /dashboard/bookings/[id]
  ├── Caregiver submits final check-out
  ├── Care seeker confirms session end
  └── Booking → status: completed

STEP 10 ── Review & Rate
  /dashboard/reviews
  ├── Star rating (1–5) + written review
  ├── POST /reviews
  └── Caregiver TrustScore updated
```

### Caregiver Flow

```
/dev/null/caregiver-flow.txt#L1-50
┌─────────────────────────────────────────────────────────────────┐
│                   CAREGIVER BOOKING JOURNEY                     │
└─────────────────────────────────────────────────────────────────┘

STEP 1 ── Set Availability
  /dashboard/caregiver/availability
  ├── TimetableCalendar — drag to mark available windows
  ├── Set recurring weekly slots
  └── PUT /availability → slots stored server-side

STEP 2 ── Receive Booking Request
  Real-time: Socket event booking:new_request
  ├── NotificationBell badge increments
  ├── Push notification (if enabled)
  └── Booking appears in /dashboard/caregiver/bookings

STEP 3 ── Accept or Decline Request
  /dashboard/caregiver/bookings or /dashboard/bookings/[id]
  ├── Review care seeker profile + requirements
  ├── Accept → POST /bookings/:id/confirm
  └── Decline → POST /bookings/:id/reject (with reason)

STEP 4 ── Review & Accept Agreement
  /dashboard/bookings/[id]
  ├── AgreementViewer renders full contract
  ├── Caregiver must scroll + explicitly accept
  └── POST /bookings/:id/agreement/accept

          ↓ Agreement accepted by both ↓

STEP 5 ── Active Booking / Check-In
  /dashboard/caregiver/my-work
  ├── Check-in button activates session
  ├── POST /bookings/:id/check-in
  └── Timer starts, status → active

STEP 6 ── Daily Tracking Submission
  /dashboard/caregiver/my-work
  ├── TrackingLogForm — fill daily notes, upload proof images
  ├── Record vitals / tasks completed
  ├── POST /bookings/:id/tracking/submit
  └── Care seeker notified for review

STEP 7 ── Check-Out & Completion
  /dashboard/caregiver/my-work
  ├── Submit final care report
  ├── POST /bookings/:id/check-out
  ├── Booking → status: completed
  └── Earnings released to wallet
```

### Booking Status Badge Reference

| Status | Badge Colour | Meaning |
|---|---|---|
| `pending_payment` | 🟡 Yellow | Awaiting payment |
| `confirmed` | 🔵 Blue | Paid, awaiting agreement |
| `agreement_pending` | 🟠 Orange | Agreement review in progress |
| `agreement_accepted` | 🟢 Green | Both parties agreed |
| `active` | 🟢 Green (pulsing) | Care session in progress |
| `completed` | ⚫ Grey | Session finished |
| `cancelled` | 🔴 Red | Cancelled by either party |
| `disputed` | 🟣 Purple | Dispute raised |

---

## ⚡ Real-Time Features

CareConnect uses a persistent Socket.IO connection managed by `SocketProvider` in `src/context/`. The socket authenticates via the same JWT token used for HTTP requests.

### Socket Events Handled in Frontend

| Event | Direction | Handler | Description |
|---|---|---|---|
| `booking:new_request` | Server → Client | Dashboard notifications | New booking request received (caregiver) |
| `booking:accepted` | Server → Client | Booking detail page | Caregiver accepted the booking |
| `booking:rejected` | Server → Client | Booking detail page | Caregiver declined the booking |
| `booking:agreement_accepted` | Server → Client | Booking detail page | Both parties signed the agreement |
| `booking:status_changed` | Server → Client | Dashboard / booking page | Any booking status transition |
| `booking:tracking_submitted` | Server → Client | Care seeker dashboard | Caregiver submitted daily tracking log |
| `booking:completed` | Server → Client | Booking page + notifications | Session marked complete |
| `booking:cancelled` | Server → Client | Booking page + notifications | Booking was cancelled |
| `notification:new` | Server → Client | `NotificationBell` | New in-app notification |
| `message:new` | Server → Client | Chat widget / messages page | New chat message received |
| `call:incoming` | Server → Client | `IncomingCallHandler` | Incoming video call alert |
| `call:ended` | Server → Client | `VideoCallProvider` | Remote party ended the call |
| `careconnect:session-expired` | Client event | `AuthProvider` | JWT expired — triggers logout flow |

### Custom Client-Side Events

The API client dispatches `careconnect:session-expired` as a `CustomEvent` on `window` when a 401 response cannot be recovered by token refresh. `AuthProvider` listens for this event and handles redirect to `/login` via the Next.js router — keeping navigation completely out of the data layer.

### WebSocket Connection Lifecycle

```
/dev/null/socket-lifecycle.txt#L1-15
App mount
    │
    ▼
SocketProvider
    ├── Creates socket.io-client instance
    ├── Connects with { credentials: 'include', auth: { token } }
    ├── Registers all event listeners
    └── Reconnects automatically on drop (exponential backoff)
         │
         ├── On auth failure  → dispatches session-expired event
         ├── On disconnect    → shows reconnecting UI indicator
         └── On reconnect     → re-authenticates with fresh token
```

---

## 🔌 API Integration

### API Client Architecture

The custom fetch-based client (`src/services/api/client.ts`) provides a clean, typed HTTP interface with several production-grade features:

- **Automatic token refresh** — detects expired JWTs pre-request; deduplicates concurrent refresh calls
- **httpOnly cookie support** — `credentials: 'include'` on every request
- **Bearer token fallback** — reads `localStorage` for legacy compatibility
- **Language header** — injects `Accept-Language` from current i18n locale
- **Request timeout** — `AbortController` with configurable timeout (default from `API_CONFIG.TIMEOUT`)
- **Retry on 401** — one automatic retry after successful token refresh
- **Network error handling** — wraps `TypeError` (CORS, network down) with descriptive messages

### Making API Calls

```/dev/null/example.ts#L1-20
import { apiClient } from "@/services/api/client";

// GET with query params
const { data } = await apiClient.get<Booking[]>("/bookings", {
  params: { status: "active", page: 1, limit: 10 },
});

// POST with body
const { data: booking } = await apiClient.post<Booking>("/bookings", {
  caregiverId: "abc123",
  serviceType: "elderly_care",
  slots: [...],
});

// PATCH
await apiClient.patch(`/bookings/${id}/agreement/accept`);

// File upload (FormData)
const form = new FormData();
form.append("document", file);
await apiClient.post("/documents/upload", form);
```

### Domain Service Layer

Each domain exposes a typed service class that wraps `apiClient`. Import from the service index:

```/dev/null/service-usage.ts#L1-12
import { bookingService } from "@/services/api/booking.service";
import { authService }    from "@/services/api/auth.service";
import { paymentService } from "@/services/api/payment.service";

// Booking lifecycle
await bookingService.createBooking(data);
await bookingService.acceptAgreement(bookingId);
await bookingService.checkInTracking(bookingId, slotId);
await bookingService.submitTrackingLog(bookingId, logData);
await bookingService.reviewTrackingLog(bookingId, logId, { approved: true });
```

### React Query Integration

Data fetching uses TanStack React Query v5. Queries are configured with sensible defaults in `src/lib/queryClient.ts`:

```/dev/null/query-example.tsx#L1-18
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingService } from "@/services/api/booking.service";

// Fetch booking by ID
const { data, isLoading } = useQuery({
  queryKey: ["booking", bookingId],
  queryFn: () => bookingService.getBookingById(bookingId),
  staleTime: 30_000,
});

// Accept agreement mutation
const qc = useQueryClient();
const { mutate } = useMutation({
  mutationFn: () => bookingService.acceptAgreement(bookingId),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["booking", bookingId] }),
});
```

---

## 🧩 Key Components

### Booking Components (`src/components/booking/`)

| Component | Description |
|---|---|
| `BookingStateMachine` | Renders the correct UI panel based on current booking status. Central orchestrator for the booking detail page. |
| `AgreementViewer` | Displays the care agreement contract. Tracks scroll completion before enabling the accept button. Handles the agreement `400` error gracefully. |
| `BookingStatusBadge` | Colour-coded status pill — maps every `BookingStatus` enum value to a visual badge. |
| `SlotPicker` | Calendar-driven time slot selector for the booking wizard. Integrates with `availability.service.ts`. |
| `SlotCards` | Summary cards showing selected slots, hours, and computed cost before submission. |
| `TrackingLogForm` | Caregiver's daily care log entry form — notes, task checklist, proof-of-work image upload, and vitals. |
| `DisputeForm` | Guided dispute submission form — category selection, description, supporting evidence. |
| `RefundPreviewModal` | Shows itemised refund breakdown before a cancellation is confirmed. |

### Feature Components (`src/features/`)

| Component | Path | Description |
|---|---|---|
| `AvailabilityCalendar` | `features/booking/components/` | Full-page availability picker with weekly grid and slot selection |
| `ReservationTimer` | `features/booking/components/` | Countdown timer for agreement acceptance window |
| `UnifiedChatWidget` | `features/chat/components/` | Floating chat widget with FAQ mode, live agent mode, and room-based messaging |
| `QAChatWidget` | `features/chat/components/` | FAQ-only chat interface for unauthenticated visitors |
| `IncomingCallHandler` | `features/chat/components/video/` | Full-screen incoming call overlay with accept/reject |
| `VideoCallProvider` | `features/video/` | Stream Video SDK context — manages active call state |

### UI Primitives (`src/components/ui/`)

| Component | Description |
|---|---|
| `JourneyStepper` | Horizontal/vertical step indicator for multi-phase flows (booking, onboarding) |
| `TrustScoreBadge` | Visual trust score display for caregiver profiles (0–100 scale) |
| `TimetableCalendar` | Weekly grid for caregiver availability — drag-to-select time slots |
| `CareCalendar` | Monthly calendar view of scheduled care sessions |
| `ActivityTimeline` | Chronological event feed with icons, timestamps, and descriptions |
| `DashboardWidgets` | Stat cards (total bookings, earnings, active sessions, reviews) |
| `ModernCharts` | Recharts wrappers — line, bar, pie, area charts for analytics |
| `NotificationDropdown` | Full notification panel with read/unread, type icons, timestamps |
| `FloatingChatButton` | Persistent chat launcher button (bottom-right corner) |
| `DiscoveryCallButton` | CTA button for scheduling a discovery/consultation call |

### Layout Components (`src/components/layout/`)

| Component | Description |
|---|---|
| `Navbar` | Responsive navigation bar — public links, auth state, notification bell, avatar dropdown |
| `Footer` | Site footer with links, social icons, and newsletter signup |
| `DashboardLayout` | Role-aware dashboard shell — sidebar navigation, top bar, main content area |
| `AdminLayout` | Admin panel chrome — collapsible sidebar, breadcrumbs, admin user menu |

---

## 🔒 Authentication & Authorization

### Auth Mechanism

CareConnect uses a **dual-token, cookie-first** authentication strategy:

1. **Primary:** httpOnly cookies — the backend sets `accessToken` and `refreshToken` as `SameSite=Strict` httpOnly cookies. All requests include `credentials: 'include'` to send these automatically.
2. **Secondary:** `localStorage` Bearer token — stored under `AUTH_CONFIG.TOKEN_KEY`. Used as the `Authorization: Bearer` header for environments that cannot read httpOnly cookies directly (e.g., dev tools inspection). Legacy key names are automatically migrated.

### Token Refresh

When a request receives a `401 Unauthorized` response:

1. The client checks if a refresh is already in-flight (deduplication via `isRefreshing` flag).
2. Calls `POST /auth/refresh-token` with `credentials: 'include'` — prefers the httpOnly cookie.
3. Falls back to sending `{ refreshToken }` in the body (legacy support).
4. On success, retries the original request once with the new token.
5. On failure, dispatches `careconnect:session-expired` event → `AuthProvider` clears state and redirects to `/login`.

### Route Protection

#### `DashboardRouteGuard`

Wraps all `/dashboard/*` routes via the segment `layout.tsx`. On mount it:

1. Checks a 60-second in-memory session cache to avoid redundant `/auth/me` calls on navigation.
2. On cache miss, calls `GET /auth/me` to validate the session server-side.
3. Enforces role-based routing: `/dashboard/caregiver/*` rejects non-caregiver users; `/dashboard/careseeker/*` rejects non-careseeker users.
4. Blocks unverified, pending, rejected, or inactive accounts with descriptive UI — no silent redirect loops.

#### `AuthPageGuard`

Wraps login/register pages — redirects authenticated users to their role-appropriate dashboard.

#### Admin Auth

Admin routes use a separate authentication flow (`/admin/login`) with its own guard in `AdminLayout`. The `isAdmin` flag in session-expired events ensures admin users are redirected to `/admin/login` rather than the regular `/login`.

### Account Status Flow

```
/dev/null/account-states.txt#L1-12
register → email_unverified
               ↓  (verify email)
         pending_approval
               ↓  (admin approves)
             active  ←──────── normal operation
               │
               ├── rejected   → blocked with re-register CTA
               └── inactive   → blocked with support CTA
```

---

## 🌐 State Management

### Global Context Providers

| Context | File | Manages |
|---|---|---|
| `AuthContext` | `context/AuthContext.tsx` | Current user, login/logout, session state, session-expired handler |
| `SocketContext` | `context/SocketContext.tsx` | Socket.IO instance, connection status, event subscription helpers |
| `LanguageContext` | `context/LanguageContext.tsx` | Active locale, locale switching, i18next initialisation |

### Server State — TanStack React Query v5

All server-derived data (bookings, profiles, notifications, payments) lives in the React Query cache. Key configuration:

- **Stale time:** `30s` for frequently updated data (notifications), `5min` for mostly-static data (caregiver profiles)
- **Retry:** 2 retries with exponential backoff for network errors; no retry on `4xx` responses
- **Cache invalidation:** Mutations call `queryClient.invalidateQueries` to trigger refetch of affected data
- **Optimistic updates:** Used for read/unread notification toggles and tracking log approvals

### Client State

Transient UI state (modal open/closed, form dirty state, selected slots) is managed with `useState` and `useReducer` at the component level. No global client state store (no Redux, no Zustand) — React Query covers all async state.

### Data Flow Diagram

```
/dev/null/data-flow.txt#L1-20
User Action
    │
    ▼
React Component
    ├── useQuery / useMutation (React Query)
    │       │
    │       ▼
    │   Service Layer (booking.service.ts etc.)
    │       │
    │       ▼
    │   apiClient.post/get/patch
    │       │
    │       ▼
    │   Backend REST API
    │
    └── Socket Event (SocketContext)
            │
            ▼
        Event Handler
            │
            ▼
        queryClient.invalidateQueries OR direct state update
```

---

## 🎯 Role-Based Access

### Roles

| Role | Value | Description |
|---|---|---|
| Care Seeker | `careseeker` | Books caregivers, reviews tracking logs, manages payments |
| Caregiver | `caregiver` | Receives bookings, submits daily tracking, manages availability |
| Admin | `admin` | Full platform oversight, user management, dispute resolution |

### What Each Role Can Do

#### Care Seeker
- Search and browse caregiver profiles
- Book caregivers and go through the full payment flow
- Accept/reject the care agreement
- Review daily tracking logs submitted by the caregiver
- Raise disputes against active or completed bookings
- Access wallet and payment history
- Leave reviews and ratings
- Message caregivers via the chat system
- Video call caregivers

#### Caregiver
- Set and manage weekly availability
- Receive, accept, or decline booking requests
- Accept the care agreement
- Check in/out of active sessions
- Submit daily care tracking logs (notes, images, vitals)
- Upload verification documents
- Set service rates
- Apply to job postings
- Access earnings wallet and withdrawal
- Message care seekers
- Video call care seekers

#### Admin
- Full CRUD access to all users, bookings, payments
- Approve/reject caregiver registrations and documents
- Resolve disputes with binding outcomes
- Moderate reviews
- Monitor all chat conversations
- Publish platform-wide notices and notifications
- View analytics, maps, and activity logs
- Configure platform settings

---

## 🐛 Common Issues & Fixes

### 1. HMR Cache Error — "Cannot find module '_styled_jsx_...'"

**Symptom:** Hot Module Replacement fails on dev server start with a styled-jsx factory error.

**Fix:**
```/dev/null/fix.sh#L1-4
# Stop the dev server (Ctrl+C), then:
cd frontend
rm -rf .next
npm run dev
```

**Why it happens:** The `.next` build cache becomes stale after installing new packages, switching git branches, or after an interrupted HMR cycle.

---

### 2. Agreement `400` Error — "Agreement already accepted" or "Booking not in correct state"

**Symptom:** Clicking "Accept Agreement" returns a `400 Bad Request`.

**Cause:** The agreement endpoint enforces state machine rules — it rejects duplicate acceptance calls and accepts only when the booking is in `confirmed` or `pending_agreement` status.

**Fix:**
- Ensure the booking status is `confirmed` before attempting to accept.
- Check that the currently logged-in user hasn't already accepted (both `agreementAcceptedBySeeker` and `agreementAcceptedByCaregiver` flags in the booking object are checked).
- `AgreementViewer` reads these flags and hides the accept button if already signed — check for stale React Query cache by refreshing the booking query.

---

### 3. Socket.IO Disconnection / Reconnection Loop

**Symptom:** WebSocket repeatedly connects and disconnects; notifications arrive delayed.

**Diagnosis:**
- Open browser DevTools → Network → WS tab — look for rapid disconnect/connect cycles.
- Check console for `[SocketContext] disconnected` logs.

**Common causes & fixes:**

| Cause | Fix |
|---|---|
| Expired auth token not refreshed before socket connection | Ensure `AuthProvider` completes login before `SocketProvider` mounts |
| Backend CORS blocking WebSocket upgrade | Add frontend origin to backend `CORS_ORIGIN` env var |
| Missing `credentials: 'include'` on socket options | Confirm `SocketProvider` initialises socket with `withCredentials: true` |
| Load balancer stripping `Upgrade` header | Configure sticky sessions / WebSocket passthrough on your load balancer |

---

### 4. Images Not Loading from Backend Uploads

**Symptom:** Caregiver profile photos or document thumbnails show as broken images.

**Fix:** The `next.config.mjs` must allow the backend host. In development:
```/dev/null/next.config.mjs#L1-10
images: {
  unoptimized: true,
  remotePatterns: [
    { protocol: "http", hostname: "localhost", port: "5000", pathname: "/uploads/**" },
    { protocol: "http", hostname: "127.0.0.1", port: "5000", pathname: "/uploads/**" },
    { protocol: "https", hostname: "**.googleusercontent.com" },
  ],
}
```

For production, add your CDN / storage hostname to `remotePatterns`.

---

### 5. Google OAuth Redirect Mismatch

**Symptom:** OAuth callback returns `redirect_uri_mismatch` from Google.

**Fix:** In [Google Cloud Console](https://console.cloud.google.com), add all callback URLs:
- Development: `http://localhost:3000/auth/callback`
- Production: `https://yourdomain.com/auth/callback`

Ensure `NEXT_PUBLIC_APP_URL` matches the registered redirect URI exactly.

---

### 6. `NEXT_PUBLIC_API_URL` is `undefined` at Runtime

**Symptom:** All API calls fail with "Unable to connect to server".

**Fix:** `NEXT_PUBLIC_*` variables must be present at **build time** — they are inlined by the compiler. Ensure the `.env.local` file exists and the variable is set **before** running `npm run build` or `npm run dev`. Restarting the dev server picks up new env variables.

---

## 🚀 Deployment

### Production Build

```/dev/null/deploy.sh#L1-6
# 1. Set production environment variables on your host
# 2. Build the optimised production bundle
npm run build

# 3. Start the Next.js production server
npm run start   # Listens on port 3000 by default
```

### Environment Setup for Production

Ensure all required `NEXT_PUBLIC_*` variables are set as environment variables on your hosting platform (Vercel, Railway, AWS, etc.) **before** triggering a build. These values are baked into the client bundle at compile time.

### Vercel Deployment

```/dev/null/vercel-config.txt#L1-8
1. Connect your Git repository to Vercel
2. Set Framework Preset: Next.js
3. Set Root Directory: frontend/
4. Add all NEXT_PUBLIC_* variables in Project Settings → Environment Variables
5. Deploy — Vercel handles build and serve automatically
6. Configure custom domain and SSL in Vercel dashboard
```

### Docker Deployment

```/dev/null/Dockerfile#L1-20
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### Reverse Proxy (nginx)

```/dev/null/nginx.conf#L1-18
server {
  listen 80;
  server_name careconnect.yourdomain.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  location /socket.io {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

> **Important:** Ensure WebSocket upgrade headers are forwarded to the backend server on the `/socket.io` path.

---

## 📈 Performance

### Code Splitting

Next.js App Router automatically splits code at the route segment boundary. Each `page.tsx` is a separate JS chunk — users only download code for the pages they visit.

Dynamic imports are used for heavy components that are not needed on initial render:

```/dev/null/dynamic-import.tsx#L1-10
import dynamic from "next/dynamic";

// Load map only when the map page is rendered
const CaregiverMap = dynamic(() => import("@/features/map/components/CaregiverMap"), {
  ssr: false,           // Leaflet requires browser APIs
  loading: () => <MapSkeleton />,
});

// Load Stripe Elements only on the payment page
const PaymentForm = dynamic(() => import("@/features/payment/components/PaymentForm"));
```

### Image Optimization

- `next/image` is used for all caregiver profile photos with `unoptimized: true` in `next.config.mjs` (avoids Google OAuth avatar fetch failures from the Next.js image optimizer server).
- Responsive `sizes` prop is provided for all listing images.
- `priority` prop set for above-the-fold hero images.

### Font Loading Strategy

- **Hubot Sans & Inter** — `preload: true`, `display: swap` — loaded on first paint (brand font + primary UI)
- **IBM Plex Sans & IBM Plex Mono** — `preload: false`, `display: swap` — loaded on demand (forms, code blocks)

### React Query Caching

- Caregiver profile data: `staleTime: 5 * 60 * 1000` (5 minutes) — profiles change infrequently
- Booking data: `staleTime: 30_000` (30 seconds) — status can change via WebSocket anyway
- Notifications: `staleTime: 0` — always fresh, supplemented by Socket.IO push

### Lazy Loading

- Leaflet map cluster layers are loaded client-side only (`ssr: false`) to prevent server-side rendering errors from browser-only APIs.
- Recharts and the Stream Video SDK are dynamically imported to keep the initial page bundle lean.
- `framer-motion` animations use `AnimatePresence` with `mode="wait"` to avoid layout thrashing during page transitions.

### Bundle Analysis

To inspect the production bundle:

```/dev/null/analyze.sh#L1-4
# Install analyser (once)
npm install --save-dev @next/bundle-analyzer

ANALYZE=true npm run build
```

---

<div align="center">

**CareConnect Frontend** — Built with ❤️ for families and caregivers

*For backend documentation, see [`../Backend/README.md`](../Backend/README.md)*

</div>
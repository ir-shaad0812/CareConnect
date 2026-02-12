// ============================================
// COMPONENTS BARREL EXPORT
// Central re-export hub — import from "@/components"
// ============================================

// ── Layout ────────────────────────────────────────────────────────────
export { default as Navbar } from "./layout/Navbar";
export { default as Footer } from "./layout/Footer";
export { default as AdminLayout } from "./layout/AdminLayout";
export { DashboardLayout } from "./layout/DashboardLayout";

// ── UI (primitives & widgets) ─────────────────────────────────────────
export * from "./ui";

// ── Feature: Auth ─────────────────────────────────────────────────────
export { default as LoginForm } from "./features/auth/LoginForm";
export { default as RegisterForm } from "./features/auth/RegisterForm";
export { default as RegisterStepper } from "./features/auth/RegisterStepper";

// ── Feature: Chat ─────────────────────────────────────────────────────
export * from "@/modules/chat/components";

// ── Feature: Search ───────────────────────────────────────────────────
export * from "./features/search";

// ── Feature: Discovery ────────────────────────────────────────────────
export * from "./features/discovery";

// ── Feature: Payments ─────────────────────────────────────────────────
export * from "./features/payments";

// ── Feature: Video ────────────────────────────────────────────────────
export * from "@/modules/chat/components/video";

// ── Feature: AI Match ─────────────────────────────────────────────────
export { default as CaregiverMatchCard } from "./ai-match/CaregiverMatchCard";

// ── Maps ──────────────────────────────────────────────────────────────
export * from "@/modules/property/components/legacy";

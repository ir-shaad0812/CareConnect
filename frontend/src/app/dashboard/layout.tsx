// ============================================
// DASHBOARD SEGMENT LAYOUT
// Provides metadata + shared template for all /dashboard/* routes.
// Individual pages handle their own DashboardLayout wrapping
// because the component requires auth-derived props (user, onLogout).
// ============================================

import type { Metadata } from "next";
import { DashboardRouteGuard } from "@/modules/auth/components";

export const metadata: Metadata = {
  title: {
    template: "%s | CareConnect Dashboard",
    default: "Dashboard | CareConnect",
  },
  description: "Manage your care bookings, payments, reviews, and more.",
  robots: { index: false, follow: false }, // Dashboard pages are private
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardRouteGuard>{children}</DashboardRouteGuard>;
}

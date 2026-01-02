// ============================================
// ADMIN SEGMENT LAYOUT
// Provides metadata + shared template for all /admin/* routes.
// Individual pages handle their own AdminLayout wrapping
// because the component manages its own auth state internally.
// ============================================

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | CareConnect Admin",
    default: "Admin Panel | CareConnect",
  },
  description: "CareConnect administration panel — manage users, bookings, and platform settings.",
  robots: { index: false, follow: false }, // Admin pages are private
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

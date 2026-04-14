import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { BackToTop } from "@/components/ui";
import { TawkToWidget } from "@/components/features/support/TawkToWidget";
import { validateFrontendEnv } from "@/lib/validate-env";

// Validate required environment variables at server startup.
// Throws in production if critical vars are missing; warns in development.
validateFrontendEnv();

export const metadata: Metadata = {
  title: "CareConnect - Trusted Care Services",
  description: "Your trusted platform for finding and providing care services",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
          <TawkToWidget />
        </Providers>
        <BackToTop />
      </body>
    </html>
  );
}

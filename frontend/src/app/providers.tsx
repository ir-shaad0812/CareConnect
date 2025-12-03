"use client";

import { ReactNode, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { getQueryClient } from "@/lib/queryClient";
import { AuthProvider, LanguageProvider, SocketProvider } from "@/context";
import { UnifiedChatWidget } from "@/modules/chat/components/UnifiedChatWidget";
import { careConnectFAQ } from "@/data/faq.data";
import { VideoCallProvider, IncomingCallHandler } from "@/modules/chat/components/video";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdminStatusWatcher } from "@/components/features/auth/AdminStatusWatcher";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  // Suppress unhandledrejection errors from browser extensions (e.g. MetaMask)
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message ?? "";
      const stack = e.reason?.stack ?? "";
      if (
        msg.includes("MetaMask") ||
        stack.includes("chrome-extension://") ||
        stack.includes("moz-extension://")
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <SocketProvider>
              <AdminStatusWatcher />
              {isAdminRoute ? (
                children
              ) : (
                <VideoCallProvider>
                  {children}
                  <UnifiedChatWidget
                    faqData={careConnectFAQ}
                    showFAQ={true}
                    position="bottom-right"
                    accentColor="teal"
                  />
                  <IncomingCallHandler />
                </VideoCallProvider>
              )}
            </SocketProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

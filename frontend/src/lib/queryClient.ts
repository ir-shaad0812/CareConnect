import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data stays fresh for 2 minutes — no refetch during this window
        staleTime: 2 * 60 * 1000,
        // Cache kept for 5 minutes after last subscriber unmounts
        gcTime: 5 * 60 * 1000,
        // Don't refetch when window regains focus (we do proactive token refresh already)
        refetchOnWindowFocus: false,
        // Retry once on failure, then show error
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new client
    return makeQueryClient();
  }
  // Browser: reuse the same client across renders
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

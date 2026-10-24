import { QueryClient } from '@tanstack/query-core';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      refetchInterval: 15_000,
      // Cached rows stay fresh between polls, but returning to the app or
      // reconnecting should check the server immediately.
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
    },
  },
});

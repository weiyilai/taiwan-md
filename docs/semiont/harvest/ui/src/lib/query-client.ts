import { QueryClient } from '@tanstack/solid-query';

/**
 * Singleton query client shared across all islands. Each island that needs
 * data wraps itself in QueryClientProvider so multiple `client:load` islands
 * can reuse the same cache within one page load.
 */
let _client: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (_client) return _client;
  _client = new QueryClient({
    defaultOptions: {
      queries: {
        // Sane defaults; individual queries override polling intervals.
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 2_000,
      },
    },
  });
  return _client;
}

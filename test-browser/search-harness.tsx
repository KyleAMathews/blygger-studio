/** Mount the real shared hook with its real Studio client. Only user controls
 * and public hook results are exposed; paging, SDK and query state stay real. */
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useSearch, type SearchFilters } from '../src/ui/search.tsx';
import type {} from './search-types.ts';
function SearchHarness() {
  const [filters, setFilters] = useState<SearchFilters>();
  const result = useSearch(filters, 0);
  const previous = useRef({ query: null as string | null, loading: false });
  const completed = useRef(new Map<string | null, number>());
  useEffect(() => {
    const query = filters?.q ?? null;
    if (previous.current.query === query && previous.current.loading && !result.loading)
      completed.current.set(query, (completed.current.get(query) ?? 0) + 1);
    previous.current = { query, loading: result.loading };
    window.searchOracle = {
      change: query => setFilters(query === null ? undefined : { q: query }),
      more: result.loadMore,
      snapshot: { query, hits: result.hits.map(hit => hit.id), hasMore: result.hasMore, loading: result.loading,
        error: result.error instanceof Error ? result.error.message : result.error ? String(result.error) : null,
        completed: completed.current.get(query) ?? 0 },
    };
  });
  return <output aria-label="hook state">{result.hits.length}</output>;
}
createRoot(document.getElementById('search-oracle-root')!).render(<SearchHarness />);

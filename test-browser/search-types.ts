export interface SearchHookSnapshot {
  query: string | null;
  hits: string[];
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  completed: number;
}
declare global {
  interface Window {
    searchOracle: { change(query: string | null): void; more(): void; snapshot: SearchHookSnapshot };
  }
}

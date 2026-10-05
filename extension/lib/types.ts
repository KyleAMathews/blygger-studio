/** The one network seam: the extension passes `fetch`, the Worker tests pass the real Worker. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

import type { FetchLike } from './types.ts';

/** Every request ends within `ms`; a slow blyg reads as a plain message, not a hung panel. */
export function withTimeout(fetchFn: FetchLike, ms = 20_000): FetchLike {
  return async (input, init) => {
    const timeout = AbortSignal.timeout(ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    try {
      return await fetchFn(input, { ...init, signal });
    } catch (error) {
      if (timeout.aborted && !init?.signal?.aborted) throw new Error(`${new URL(input).origin} did not answer in time.`);
      throw error;
    }
  };
}

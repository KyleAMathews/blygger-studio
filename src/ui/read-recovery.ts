import { ReadSupersededError } from '../../sdk/dist/browser.js';

/** Keep a live Studio read active when an individual SDK attempt is stale. */
export function recoverStudioReads(fetcher: typeof fetch): typeof fetch {
  return async (input, init) => {
    for (;;) {
      try { return await fetcher(input, init); }
      catch (error) {
        if (!(error instanceof ReadSupersededError)) throw error;
        new Request(input, init).signal.throwIfAborted();
      }
    }
  };
}

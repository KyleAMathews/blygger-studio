import { BasicIndex } from '@tanstack/react-db';
import { QueryClient, focusManager } from '@tanstack/query-core';

export const collectionRefreshOptions = {
  autoIndex: 'eager',
  defaultIndexType: BasicIndex,
  refetchOnWindowFocus: 'always',
  refetchOnReconnect: 'always',
} as const;

/** Live collections opt in; ordinary queries never inherit a polling timer. */
export const collectionPollingOptions = {
  ...collectionRefreshOptions,
  refetchInterval: 15_000,
};

/**
 * Reading's page and summary scan every held entry on each read (studio#180:
 * ~16,000 D1 rows a load), and new entries arrive only on the import cron.
 * They poll slowly; the owner's own writes refresh them directly.
 */
export const READING_POLL_MS = 300_000;
export const readingPollingOptions = {
  ...collectionRefreshOptions,
  refetchInterval: READING_POLL_MS,
};

/** No input for this long and polling stops until the next one (studio#180). */
export const IDLE_AFTER_MS = 300_000;

/**
 * Polling runs only for someone using the Studio: the page visible, its window
 * focused, and some input in the last IDLE_AFTER_MS. Query Core's own check is
 * visibility alone, so a tab left open in front of an awake screen polled all
 * day and spent a free plan's D1 reads in two hours (studio#180). Returning
 * counts as focus, so refetchOnWindowFocus reloads at once.
 */
export function watchAttention(target: Window & typeof globalThis, idleAfter = IDLE_AFTER_MS) {
  let idle = false, timer: ReturnType<typeof setTimeout> | undefined;
  return (setFocused: (focused?: boolean) => void) => {
    const attending = () => !idle && target.document.visibilityState !== 'hidden' && target.document.hasFocus();
    const report = () => setFocused(attending());
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => { idle = true; report(); }, idleAfter); };
    const active = () => {
      arm();
      if (idle) { idle = false; report(); }
    };
    const inputs = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'] as const;
    for (const name of inputs) target.addEventListener(name, active, { capture: true, passive: true });
    target.addEventListener('focus', report);
    target.addEventListener('blur', report);
    target.document.addEventListener('visibilitychange', report);
    arm();
    return () => {
      clearTimeout(timer);
      for (const name of inputs) target.removeEventListener(name, active, { capture: true });
      target.removeEventListener('focus', report);
      target.removeEventListener('blur', report);
      target.document.removeEventListener('visibilitychange', report);
    };
  };
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function' && typeof window.document?.addEventListener === 'function') {
  focusManager.setEventListener(watchAttention(window));
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

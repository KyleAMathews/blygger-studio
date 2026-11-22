/** Witness key delivery without predicting any editor value, caret or focus. */
import type { Page } from '@playwright/test';

export async function typeLinkTargetWithKeys(page: Page, text: string) {
  const recording = await page.evaluateHandle(() => {
    const events: { type: string; key: string }[] = [];
    const record = (event: KeyboardEvent) => {
      if (event.isTrusted) events.push({ type: event.type, key: event.key });
    };
    document.addEventListener('keydown', record, true);
    document.addEventListener('keyup', record, true);
    return { stop() {
      document.removeEventListener('keydown', record, true);
      document.removeEventListener('keyup', record, true);
      return events;
    } };
  });
  let failed = false, failure: unknown;
  try {
    // Match the historical ASCII URL path. No locator focus repair or native
    // undo boundary is inserted between the individual character key presses.
    await page.keyboard.type(text);
  } catch (error) { failed = true; failure = error; }
  let receipt: { type: string; key: string }[] | undefined;
  const cleanup: unknown[] = [];
  try { receipt = await recording.evaluate(value => value.stop()); } catch (error) { cleanup.push(error); }
  try { await recording.dispose(); } catch (error) { cleanup.push(error); }
  if (cleanup.length) throw new AggregateError([...(failed ? [failure] : []), ...cleanup], 'Per-character key delivery cleanup failed', { cause: failure });
  if (failed) throw failure;
  const expected = Array.from(text).flatMap(key => [{ type: 'keydown', key }, { type: 'keyup', key }]);
  if (JSON.stringify(receipt) !== JSON.stringify(expected)) {
    throw new Error('Per-character key delivery premise failed: ' + JSON.stringify({ received: receipt, expected }));
  }
}

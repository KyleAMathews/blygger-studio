/** Commit the native event boundary bypassed by macOS Playwright key injection. */
import type { Browser, Page } from '@playwright/test';
import { browserEngine } from './browser-engine-oracle.ts';

// WebKit's macOS embedder uses AppKit run-loop undo grouping. A sterile native
// window event can advance that loop, but its completion is asynchronous. A
// separate native editor witnesses the boundary before the next app action.
// See the receiving evidence/negative control in webkit-undo-research.md. Other
// hosts need no boundary. No SUT or expected editor model runs in this context.
export async function nativeHostBoundary(browser: Browser, required = true) {
  const context = required && process.platform === 'darwin' && browserEngine() === 'webkit'
    ? await browser.newContext({ serviceWorkers: 'block' }) : undefined;
  return {
    async commit(primary: Page) {
      if (!context) return;
      // This synchronous host query orders the preceding RegisterEditCommand
      // IPC before the reference edits. It supplies no expected source value.
      await primary.evaluate(() => document.queryCommandEnabled('undo'));
      const receipts: unknown[] = [];
      const maxAttempts = 12;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let reference: Page | undefined, blank: Page | undefined, failure: unknown;
        let receipt: { inserted: boolean; beforeUndo: string; undone: boolean; value: string } | undefined;
        try {
          reference = await context.newPage();
          await reference.setContent('<textarea>0x0</textarea>');
          const box = reference.locator('textarea');
          const first = await box.evaluate((el: HTMLTextAreaElement) => {
            el.focus(); el.setSelectionRange(1, 2);
            const inserted = document.execCommand('insertText', false, 'A');
            document.queryCommandEnabled('undo');
            return { inserted, value: el.value };
          });
          if (!first.inserted || first.value !== '0A0') throw new Error('Native reference setup failed: ' + JSON.stringify(first));
          blank = await context.newPage();
          await blank.close(); blank = undefined;
          receipt = await box.evaluate((el: HTMLTextAreaElement) => {
            el.setSelectionRange(1, 2);
            const inserted = document.execCommand('insertText', false, 'B');
            document.queryCommandEnabled('undo');
            const beforeUndo = el.value;
            const undone = document.execCommand('undo');
            return { inserted, beforeUndo, undone, value: el.value };
          });
          receipts.push(receipt);
          if (!receipt.inserted || receipt.beforeUndo !== '0B0' || !receipt.undone || !['0A0', '0x0'].includes(receipt.value)) {
            throw new Error('Unexpected native boundary receipt: ' + JSON.stringify(receipt));
          }
        } catch (error) { failure = error; throw error; }
        finally {
          const cleaned = await Promise.allSettled([blank?.close(), reference?.close()]);
          const errors = cleaned.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map(r => r.reason);
          if (errors.length) throw new AggregateError([...(failure ? [failure] : []), ...errors], 'Native boundary reference cleanup failed', { cause: failure });
        }
        // Undoing only B acknowledges an actual native boundary. Undoing both
        // edits rejects this attempt; retrying waits on evidence, never a timer.
        if (receipt?.value === '0A0') return;
      }
      throw new Error('WebKit native host did not acknowledge an event boundary after ' + maxAttempts + ' attempts: ' + JSON.stringify({ platform: process.platform, engine: browserEngine(), receipts }));
    },
    async close() { await context?.close(); },
  };
}

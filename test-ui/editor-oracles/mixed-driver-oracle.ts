/** Freely interleaved actions received by the real React editor. */
import { applicationDriver } from './application-driver-oracle.ts';
import { browserDocument, captureBrowserCalls } from './browser-driver-oracle.ts';
import { nativeHostBoundary } from './native-host-oracle.ts';
import { mixedInputAction, shortcutKey, type MixedInput, type MixedPlan } from './mixed-model-oracle.ts';
import type { Observe } from './document-oracle.ts';
import type { Page, Locator } from '@playwright/test';
import { formattingDiagnosticStart, formattingDiagnosticEnd } from './diagnostic-oracle.ts';
export async function mixedDriver(p: MixedPlan, observe: Observe,
  finish?: (page: Page, box: Locator, itemId: string) => Promise<void>) {
  const { browser } = await browserDocument();
  // Prepare the native receiving boundary whenever a generated intent can use it;
  // the independently resolved action still gates unsupported history commands.
  const native = await nativeHostBoundary(browser, p.h.native && p.actions.some(a => a.kind === 'undo' || a.kind === 'redo'));
  let failure: unknown;
  try {
    await applicationDriver(p.h.mobile, observe, async ({ context, page }) => {
      if (!p.h.native) await context.addInitScript(() => { document.execCommand = () => false; });
      const seedSpan = formattingDiagnosticStart('mixed.seed');
      const response = await context.request.post('/api/items', { data: { contentMd: 'oracle seed', kind: 'fragment' } });
      if (!response.ok()) throw new Error('Mixed-action item setup failed: ' + response.status());
      const id = (await response.json()).id;
      formattingDiagnosticEnd(seedSpan);
      const navigationSpan = formattingDiagnosticStart('mixed.navigation');
      await page.goto('/studio/edit/' + id);
      formattingDiagnosticEnd(navigationSpan);
      const readySpan = formattingDiagnosticStart('mixed.ready');
      const box = page.locator('#md-input'); await box.waitFor({ state: 'visible' });
      if (p.h.mobile) await page.getByRole('group', { name: 'pane', exact: true }).getByRole('button', { name: 'draft', exact: true }).click();
      formattingDiagnosticEnd(readySpan);
      const initializeSpan = formattingDiagnosticStart('mixed.initialize');
      await box.fill(p.text); await box.focus(); await native.commit(page);
      // The original resolver starts with the whole document selected. Establish
      // that public input explicitly instead of depending on fill's caret choice.
      await box.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, el.value.length));
      formattingDiagnosticEnd(initializeSpan);
      const inputs: MixedInput[] = [];
      for (const index of p.actions.keys()) {
        const focusSpan = formattingDiagnosticStart('mixed.focus');
        await box.focus();
        formattingDiagnosticEnd(focusSpan);
        const inputSpan = formattingDiagnosticStart('mixed.input');
        const before = await box.evaluate((el: HTMLTextAreaElement) => ({ value: el.value, selection: [el.selectionStart, el.selectionEnd] }));
        formattingDiagnosticEnd(inputSpan);
        const resolveSpan = formattingDiagnosticStart('mixed.resolve');
        const action = mixedInputAction(p, index, before, inputs);
        formattingDiagnosticEnd(resolveSpan);
        const deliverySpan = formattingDiagnosticStart('mixed.delivery');
        const delivered = await box.evaluate((el: HTMLTextAreaElement, range) => {
          el.setSelectionRange(range[0]!, range[1]!);
          return { value: el.value, selection: [el.selectionStart, el.selectionEnd] };
        }, action.range);
        formattingDiagnosticEnd(deliverySpan);
        // Record both the untouched pre-selection state and actual range delivery
        // before invoking production. Neither is the command's expected answer.
        const input: MixedInput = { ...before, action, delivered };
        inputs.push(input); observe('input' + index, input);
        const key = shortcutKey(action);
        if (key) {
          const keyListenerSpan = formattingDiagnosticStart('mixed.key-listener');
          const before = await box.evaluate((el: HTMLTextAreaElement, requested) => {
            const scope = window as typeof window & { __mixedOracleKey?: KeyboardEvent }; scope.__mixedOracleKey = undefined;
            // Retain the native event itself. A microtask queued by this target
            // listener can run before React's ancestor listener consumes Tab.
            // A modifier keydown precedes Enter in Shift+Enter, so ignore it.
            const onKey = (event: KeyboardEvent) => { if (event.key !== requested) return; el.removeEventListener('keydown', onKey); scope.__mixedOracleKey = event; };
            el.addEventListener('keydown', onKey);
            return { focused: document.activeElement === el, selection: [el.selectionStart, el.selectionEnd] };
          }, key === 'Enter' || key === 'Shift+Enter' ? 'Enter' : 'Tab');
          formattingDiagnosticEnd(keyListenerSpan);
          const nativeCommandSpan = formattingDiagnosticStart('mixed.native-command');
          await page.keyboard.press(key);
          formattingDiagnosticEnd(nativeCommandSpan);
          const keyReceiptSpan = formattingDiagnosticStart('mixed.key-receipt');
          const event = await box.evaluate((el: HTMLTextAreaElement) => {
            const event = (window as typeof window & { __mixedOracleKey?: KeyboardEvent }).__mixedOracleKey;
            return event && { key: event.key, shiftKey: event.shiftKey, altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey,
              trusted: event.isTrusted, target: event.target === el, defaultPrevented: event.defaultPrevented };
          });
          formattingDiagnosticEnd(keyReceiptSpan);
          if (!event || event.key !== (key === 'Enter' || key === 'Shift+Enter' ? 'Enter' : 'Tab') || event.shiftKey !== key.startsWith('Shift+') || !event.trusted || !event.target) throw new Error('Mixed native key receiving premise failed');
          observe('key' + index, { requested: key, before, event });
        } else {
          const nativeCommandSpan = formattingDiagnosticStart('mixed.native-command');
          switch (action.kind) {
          case 'bold': case 'italic': case 'link': await page.keyboard.press('ControlOrMeta+' + ({ bold: 'b', italic: 'i', link: 'k' }[action.kind])); break;
          case 'undo': await page.keyboard.press('ControlOrMeta+z'); break;
          case 'redo': await page.keyboard.press('ControlOrMeta+Shift+z'); break;
          case 'type': await page.keyboard.insertText(action.text); break;
          case 'paste': await box.evaluate((el: HTMLTextAreaElement) => {
            const data = new DataTransfer(); data.setData('text/plain', 'https://example.com/p?utm_source=x#part?');
            const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data });
            Object.defineProperty(event, 'clipboardData', { value: data }); el.dispatchEvent(event);
          }); break;
          case 'break': case 'code': case 'formula': case 'indent': case 'outdent': {
            const button = page.locator(`.ed-tools [data-action="md-${action.kind}"]`);
            if (action.activation === 'click') await button.click();
            else { await button.focus(); await page.keyboard.press(action.activation); }
            break;
          }
          case 'select': break;
          }
          formattingDiagnosticEnd(nativeCommandSpan);
        }
        const stepSpan = formattingDiagnosticStart('mixed.step');
        observe('step' + index, await box.evaluate((el: HTMLTextAreaElement) => ({ value: el.value, selection: [el.selectionStart, el.selectionEnd], focused: document.activeElement === el })));
        formattingDiagnosticEnd(stepSpan);
        const packetSpan = formattingDiagnosticStart('mixed.packet');
        await captureBrowserCalls(page);
        formattingDiagnosticEnd(packetSpan);
        const nativeCommitSpan = formattingDiagnosticStart('mixed.native-commit');
        await native.commit(page);
        formattingDiagnosticEnd(nativeCommitSpan);
      }
      const suffixSpan = formattingDiagnosticStart('mixed.suffix');
      await finish?.(page, box, id);
      formattingDiagnosticEnd(suffixSpan);
    });
  } catch (error) { failure = error; throw error; }
  finally {
    const nativeCloseSpan = formattingDiagnosticStart('mixed.native-close');
    try { await native.close(); formattingDiagnosticEnd(nativeCloseSpan); }
    catch (error) { throw new AggregateError([...(failure ? [failure] : []), error], 'Mixed native-host cleanup failed', { cause: failure }); }
  }
}

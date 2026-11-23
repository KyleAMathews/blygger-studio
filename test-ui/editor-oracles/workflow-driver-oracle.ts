/** Real app receiving driver: OS clipboard, fallback sheets and paste events. */
import type { Locator } from '@playwright/test';
import { applicationDriver } from './application-driver-oracle.ts';
import { captureBrowserCalls } from './browser-driver-oracle.ts';
import { rawText, recognized } from './link-model-oracle.ts';
import type { workflowPlan, WorkflowHostInput } from './workflow-model-oracle.ts';
import type { Observe } from './document-oracle.ts';

export async function workflowDriver(p: ReturnType<typeof workflowPlan>, observe: Observe) {
  await applicationDriver(p.h.mobile, observe, async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    let id: string | undefined;
    if (p.h.surface === 'editor') {
      const response = await context.request.post('/api/items', { data: { contentMd: p.text, kind: 'fragment' } });
      if (!response.ok()) throw new Error('Workflow item setup failed: ' + response.status());
      id = (await response.json()).id;
    }
    await page.goto(id ? '/studio/edit/' + id : '/studio');
    let box: Locator = page.locator(id ? '#md-input' : '#composer-text');
    await box.waitFor({ state: 'visible' });
    if (id && p.h.mobile) await page.getByRole('group', { name: 'pane', exact: true }).getByRole('button', { name: 'draft', exact: true }).click();
    if (!id) await box.fill(p.text);
    for (const [index, action] of p.actions.entries()) {
      await box.focus();
      await box.evaluate((el: HTMLTextAreaElement, range) => el.setSelectionRange(range[0]!, range[1]!), action.range);
      const raw = rawText(action.raw), input: WorkflowHostInput = {};
      let defaultAllowed: boolean | undefined, clipboardControls: number | undefined, sheet: { reason: string } | null = null;
      if (['clipboard', 'denied', 'cancel', 'invalidTyped'].includes(action.kind)) {
        const forcedInvalid = action.kind === 'cancel' || action.kind === 'invalidTyped';
        await page.evaluate(async text => { await navigator.clipboard.writeText(text); }, forcedInvalid ? 'not a URL' : raw);
        // Observe the actual provider input consumed by production. The wrapper
        // preserves successful native reads; denial alone is a controlled premise.
        await page.evaluate(denied => {
          const original = navigator.clipboard.readText;
          (window as any).__oracleClipboardOriginal = original;
          (window as any).__oracleReadOutcome = undefined;
          navigator.clipboard.readText = async () => {
            try {
              if (denied) throw new DOMException('Controlled denied host', 'NotAllowedError');
              const text = await original.call(navigator.clipboard);
              (window as any).__oracleReadOutcome = { clipboard: text }; return text;
            } catch (error) { (window as any).__oracleReadOutcome = { denied: true }; throw error; }
          };
        }, action.kind === 'denied');
        try {
          clipboardControls = await page.locator('[data-action="link-clipboard"]').count();
          const trigger = page.locator('[data-action="link-clipboard"]').filter({ visible: true });
          if (action.activation === 'click') await trigger.click();
          else { await trigger.focus(); await page.keyboard.press(action.activation); }
          await page.waitForFunction(() => (window as any).__oracleReadOutcome !== undefined);
          Object.assign(input, await page.evaluate(() => (window as any).__oracleReadOutcome));
          if (input.denied || !recognized(input.clipboard ?? '')) {
            const dialog = page.getByRole('dialog', { name: 'link from clipboard', exact: true });
            await dialog.waitFor({ state: 'visible' });
            const body = await dialog.textContent();
            sheet = { reason: body?.includes('would not let the studio read the clipboard') ? 'denied' : body?.includes('does not hold a URL') ? 'notUrl' : 'unknown' };
            if (action.kind === 'cancel') await dialog.getByRole('button', { name: 'cancel', exact: true }).click();
            else {
              const field = dialog.getByRole('textbox', { name: 'URL', exact: true });
              await field.fill(action.kind === 'invalidTyped' ? 'not a url' : rawText(action.typed));
              input.typed = await field.inputValue(); // input element normalization, before production consumes it
              await dialog.getByRole('button', { name: 'insert link', exact: true }).click();
            }
            await dialog.waitFor({ state: 'hidden' });
          }
          // Actual provider completion precedes this rendering turn. A frame
          // alone is not treated as evidence that a clipboard promise finished.
          await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => done())));
        } finally {
          await page.evaluate(() => { navigator.clipboard.readText = (window as any).__oracleClipboardOriginal; });
        }
      } else if (action.kind === 'paste' || action.kind === 'files') {
        defaultAllowed = await box.evaluate((el: HTMLTextAreaElement, payload) => {
          const data = new DataTransfer(); data.setData('text/plain', payload.raw);
          if (payload.files) data.items.add(new File(['text'], 'x.txt', { type: 'text/plain' }));
          const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data });
          Object.defineProperty(event, 'clipboardData', { value: data }); return el.dispatchEvent(event);
        }, { raw, files: action.kind === 'files' });
      } else if (action.kind === 'nativePaste') {
        input.clipboard = await page.evaluate(async text => { await navigator.clipboard.writeText(text); return await navigator.clipboard.readText(); }, raw);
        await box.evaluate((el: HTMLTextAreaElement) => {
          const receipt: any = { input: false };
          (window as any).__oracleNativePaste = receipt;
          el.addEventListener('input', () => { receipt.input = true; }, { capture: true, once: true });
          el.addEventListener('paste', event => {
            receipt.text = event.clipboardData?.getData('text/plain') ?? '';
            // Native dispatch can run a microtask checkpoint between capture
            // and React's bubble handler. Retain the event until its actual
            // defaultPrevented flag changes, rather than copying it too early.
            receipt.event = event;
          }, { capture: true, once: true });
        });
        await page.keyboard.press('ControlOrMeta+v');
        await page.waitForFunction(() => { const r = (window as any).__oracleNativePaste; return r.event && (r.event.defaultPrevented || r.input); });
        input.clipboard = await page.evaluate(() => (window as any).__oracleNativePaste.text);
        defaultAllowed = await page.evaluate(() => !(window as any).__oracleNativePaste.event.defaultPrevented);
      } else if (action.transition) {
        await page.locator('#composer-full').click(); box = page.locator('#md-input');
        await box.waitFor({ state: 'visible' });
        if (p.h.mobile) await page.getByRole('group', { name: 'pane', exact: true }).getByRole('button', { name: 'draft', exact: true }).click();
      }
      observe('host' + index, input);
      // Toasts use a nonmodal dialog role too. This checkpoint owns blocking
      // fallback sheets; keep raw dialog counts in the snapshot as diagnostics.
      const dialogs = await page.locator('.sheet[role="dialog"]').count();
      const snapshot = await box.evaluate((el: HTMLTextAreaElement) => {
        // Keep every toast in the deterministic receipt. Animation styles are
        // retained in diagnostic captures, not sampled into compared traces.
        const toasts = [...document.querySelectorAll('.toast')];
        return { value: el.value, selection: [el.selectionStart, el.selectionEnd], toast: toasts[0]?.textContent ?? '', toastCount: toasts.length, toastDetails: toasts.map(node => ({ text: node.textContent })), mountedDialogs: document.querySelectorAll('[role="dialog"]').length };
      });
      await captureBrowserCalls(page);
      observe('step' + index, { ...snapshot, dialogs, sheet, ...(clipboardControls === undefined ? {} : { clipboardControls }), ...(defaultAllowed === undefined ? {} : { defaultAllowed }) });
    }
  });
}

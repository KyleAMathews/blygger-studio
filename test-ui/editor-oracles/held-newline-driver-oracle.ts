/** Native input into the real regions-example receiver, followed by immediate Save. */
import { applicationDriver, deferred, hostEvent } from './application-driver-oracle.ts';
import { mixedInputAction, type MixedInput } from './mixed-model-oracle.ts';
import type { HeldNewlinePlan } from './held-newline-model-oracle.ts';
import type { Observe } from './document-oracle.ts';
import { appendFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function heldNewlineDriver(p: HeldNewlinePlan, observe: Observe) {
  // Raw receiving evidence stays outside the judged trace: no fields are
  // normalized or discarded, and no expected source is supplied by the sink.
  const evidence = process.env.FORMATTING_ORACLE_RECEIVING_EVIDENCE;
  if (!evidence) throw new Error('Held newline receiving evidence directory is missing');
  const file = join(mkdtempSync(join(evidence, 'held-newline-')), 'trace.jsonl');
  writeFileSync(file, JSON.stringify({ plan: p }) + '\n', { flag: 'wx' });
  const judged = observe;
  observe = (checkpoint, value) => {
    appendFileSync(file, JSON.stringify({ checkpoint, value }) + '\n');
    judged(checkpoint, value);
  };
  await applicationDriver(p.h.mobile, observe, async ({ context, page }) => {
    const settingsResponse = await context.request.get('/api/settings');
    if (!settingsResponse.ok()) throw new Error('Held newline settings setup failed: ' + settingsResponse.status());
    const settings = await settingsResponse.json();
    const enabled = await context.request.patch('/api/settings', { data: { extensions: ['regions-example'] } });
    if (!enabled.ok()) throw new Error('Held newline extension setup failed: ' + enabled.status());
    let failure: unknown;
    try {
      const created = await context.request.post('/api/items', { data: { contentMd: p.full, kind: 'fragment' } });
      if (!created.ok()) throw new Error('Held newline item setup failed: ' + created.status());
      const id = (await created.json()).id;
      await page.goto('/studio/edit/' + id);
      const box = page.locator('#md-input'), notice = page.locator('[data-held-out]');
      await box.waitFor({ state: 'visible' });
      if (p.h.mobile) await page.getByRole('group', { name: 'pane', exact: true }).getByRole('button', { name: 'draft', exact: true }).click();
      // Observe initial receiving before any text manipulation. Filling the
      // textarea here would itself change the hidden region's anchor.
      observe('opened', { value: await box.inputValue(), notice: await notice.getAttribute('data-held-out') });
      if (p.h.mode !== 'hidden') {
        await notice.getByRole('button', { name: 'show', exact: true }).click();
        // Showing schedules its caret restoration for the next frame. Finish
        // that host action before delivering a new selection/key; never poll
        // for an oracle-desired range or move a post-key checkpoint.
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
      }
      await box.focus();
      await box.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, el.value.length));
      const before = await box.evaluate((el: HTMLTextAreaElement) => ({ value: el.value, selection: [el.selectionStart, el.selectionEnd] }));
      const action = mixedInputAction(p.mixed, 0, before, []);
      const delivered = await box.evaluate((el: HTMLTextAreaElement, range) => {
        el.setSelectionRange(range[0]!, range[1]!);
        return { value: el.value, selection: [el.selectionStart, el.selectionEnd] };
      }, action.range);
      const input: MixedInput = { ...before, action, delivered };
      observe('input0', input);
      const requested = 'text' in p.h ? p.h.text : p.h.key;
      const keyBefore = await box.evaluate((el: HTMLTextAreaElement, requested) => {
        const host = window as typeof window & { __heldKey?: KeyboardEvent; __heldInputs?: object[] };
        host.__heldKey = undefined; host.__heldInputs = [];
        const key = (event: KeyboardEvent) => {
          if (event.key !== (requested === 'Enter' || requested === 'Shift+Enter' ? 'Enter' : requested[0])) return;
          el.removeEventListener('keydown', key); host.__heldKey = event;
        };
        el.addEventListener('keydown', key);
        // Bubble runs after the compatibility helper's input capture and
        // before React's root listener restores a read-only region.
        el.addEventListener('input', event => {
          const input = event as InputEvent;
          host.__heldInputs!.push({ trusted: input.isTrusted, target: input.target === el, inputType: input.inputType, data: input.data, composing: input.isComposing,
            value: el.value, selection: [el.selectionStart, el.selectionEnd] });
        });
        return { focused: document.activeElement === el, selection: [el.selectionStart, el.selectionEnd] };
      }, requested);
      if ('text' in p.h) await page.keyboard.type(p.h.text);
      else await page.keyboard.press(p.h.key);
      const receipt = await box.evaluate((el: HTMLTextAreaElement) => {
        const host = window as typeof window & { __heldKey?: KeyboardEvent; __heldInputs?: object[] };
        const event = host.__heldKey;
        return { event: event && { key: event.key, shiftKey: event.shiftKey, altKey: event.altKey,
          ctrlKey: event.ctrlKey, metaKey: event.metaKey, trusted: event.isTrusted,
          target: event.target === el, defaultPrevented: event.defaultPrevented }, inputs: host.__heldInputs };
      });
      observe('key0', { requested, before: keyBefore, event: receipt.event });
      observe('nativeInputs', receipt.inputs);
      const step = await box.evaluate((el: HTMLTextAreaElement) => ({ value: el.value,
        selection: [el.selectionStart, el.selectionEnd], focused: document.activeElement === el }));
      appendFileSync(file, JSON.stringify({ event: 'native-step-before-premise', value: step }) + '\n');
      observe('step0', step);
      observe('region', { notice: await page.locator('[data-held-out]').evaluateAll(nodes => nodes[0]?.getAttribute('data-held-out') ?? null),
        messages: await page.locator('.toast-message').allTextContents() });

      const save = page.locator('#save-draft-btn');
      if (!await save.isEnabled()) throw new Error('Held newline Save is already busy');
      const settled = deferred<{ trusted: boolean; states: boolean[]; errors: string[] }>();
      await page.exposeFunction('heldSaveSettled', (receipt: { trusted: boolean; states: boolean[]; errors: string[] }) => settled.resolve(receipt));
      await save.evaluate((el: HTMLButtonElement) => {
        let armed = false, pending = false, trusted = false;
        const states: boolean[] = [];
        const observer = new MutationObserver(records => {
          if (!armed) return;
          for (const [index] of records.entries()) {
            const disabled = (index + 1 < records.length ? records[index + 1]!.oldValue : el.getAttribute('disabled')) !== null;
            states.push(disabled); pending ||= disabled;
            if (pending && !disabled) {
              observer.disconnect();
              void (window as typeof window & { heldSaveSettled: (receipt: object) => Promise<void> }).heldSaveSettled({
                trusted, states: [...states], errors: [...document.querySelectorAll('.error-banner')].map(banner => banner.textContent ?? ''),
              });
              break;
            }
          }
        });
        observer.observe(el, { attributes: true, attributeFilter: ['disabled'], attributeOldValue: true });
        el.addEventListener('click', event => { trusted = event.isTrusted; armed = true; }, { once: true, capture: true });
      });
      await save.click();
      const boundary = await hostEvent(settled.promise, 'held newline clicked Save completed');
      const inspected = await context.request.get('/api/items/' + id);
      const stored = await inspected.json();
      observe('saved', { source: stored.contentMd, status: inspected.status(), boundary });
    } catch (error) { failure = error; throw error; }
    finally {
      try {
        const restored = await context.request.patch('/api/settings', { data: { extensions: settings.extensions } });
        if (!restored.ok()) throw new Error('Held newline settings cleanup failed: ' + restored.status());
      } catch (error) { throw new AggregateError([...(failure ? [failure] : []), error], 'Held newline receiving cleanup failed', { cause: failure }); }
    }
  });
}

/** Actual native input delivery and Save on each React editing surface. */
import { applicationDriver, deferred, hostEvent } from './application-driver-oracle.ts';
import { captureBrowserCalls } from './browser-driver-oracle.ts';
import { openNavigationCard } from './navigation-acquisition-oracle.ts';
import { mixedInputAction, shortcutKey, type MixedInput } from './mixed-model-oracle.ts';
import type { newlineHistoryPlan } from './newline-history-model-oracle.ts';
import type { Observe } from './document-oracle.ts';
import { appendFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type ItemResponse = { status: number; body: Record<string, unknown> };
export type NewlineSaveRaw = {
  itemId: string; stored: ItemResponse;
  creates: (ItemResponse & { request: unknown })[];
  boundary: { trusted: boolean; states: boolean[]; errors: string[] };
};

export async function newlineHistoryDriver(p: ReturnType<typeof newlineHistoryPlan>, observe: Observe, staleSave = false,
  corruptSave?: (raw: NewlineSaveRaw) => NewlineSaveRaw, delayedDuplicate = false) {
  // Literal responses, including server IDs and timestamps, are retained before
  // deriving the approved same-item observations. A calibration can alter that
  // derivation's input; both the actual and injected inputs remain in evidence.
  const evidence = process.env.FORMATTING_ORACLE_RECEIVING_EVIDENCE;
  if (!evidence) throw new Error('Native newline receiving evidence directory is missing');
  const file = join(mkdtempSync(join(evidence, 'native-newline-')), 'trace.jsonl');
  writeFileSync(file, JSON.stringify({ plan: p, staleSave }) + '\n', { flag: 'wx' });
  const raw = (event: string, value: unknown) => appendFileSync(file, JSON.stringify({ event, value }) + '\n');
  const judged = observe;
  observe = (checkpoint, value) => {
    appendFileSync(file, JSON.stringify({ checkpoint, value }) + '\n');
    judged(checkpoint, value);
  };
  await applicationDriver(p.h.mobile, observe, async ({ context, page, drain }) => {
    const created: Promise<NewlineSaveRaw['creates'][number]>[] = [];
    // Admission belongs to the action boundary; a response can arrive later.
    // Keep every admitted request in request order, including failed responses.
    const captureCreate = (request: import('@playwright/test').Request) => {
      if (new URL(request.url()).pathname !== '/api/items' || request.method() !== 'POST') return;
      const sent = { url: request.url(), method: request.method(), request: request.postDataJSON() };
      raw('create-admitted', sent);
      const result = request.response().then(async response => {
        const receipt = response ? { ...sent, status: response.status(), body: await response.json() }
          : { ...sent, status: 0, body: {}, failure: request.failure() };
        raw('create', receipt); return receipt;
      });
      created.push(result); drain.push(result); void result.catch(() => undefined);
    };
    const captureWrite = (response: import('@playwright/test').Response) => {
      if (/^\/api\/items\/[^/]+$/.test(new URL(response.url()).pathname) && response.request().method() === 'PATCH') {
        const result = response.json().then(body => raw('item-write', { status: response.status(), body,
          url: response.url(), method: response.request().method(), request: response.request().postDataJSON() }));
        drain.push(result); void result.catch(() => undefined);
      }
    };
    page.on('request', captureCreate); page.on('response', captureWrite);
    const duplicateHeld = deferred<void>(), releaseDuplicate = deferred<void>();
    if (delayedDuplicate) {
      if (p.h.surface !== 'composer') throw new Error('Delayed create control requires composer');
      await page.route('**/api/items', route => {
        const routed = (async () => {
          if (route.request().headers()['x-oracle-delayed-create'] !== '1') { await route.continue(); return; }
          const response = await route.fetch();
          raw('duplicate-response-held', { status: response.status(), body: await response.json() });
          duplicateHeld.resolve();
          await releaseDuplicate.promise;
          await route.fulfill({ response });
        })();
        drain.push(routed); return routed;
      });
    }
    try {
    let id: string | undefined;
    if (p.h.surface !== 'composer') {
      const response = await context.request.post('/api/items', { data: { contentMd: 'oracle seed', kind: 'fragment' } });
      if (!response.ok()) throw new Error('Native newline item setup failed: ' + response.status());
      const body = await response.json();
      raw('seed', { method: 'POST', url: response.url(), request: { contentMd: 'oracle seed', kind: 'fragment' }, status: response.status(), body }); id = body.id;
    }
    await page.goto(p.h.surface === 'editor' ? '/studio/edit/' + id : '/studio');
    let quickCard: import('@playwright/test').Locator | undefined;
    if (p.h.surface === 'quick') {
      const card = await openNavigationCard({ context, page, drain, id: id!, history: p.h });
      quickCard = card;
      await card.locator('[data-action="quick-edit"]').click();
    }
    const box = p.h.surface === 'composer' ? page.locator('#composer-text')
      : p.h.surface === 'editor' ? page.locator('#md-input') : page.getByRole('textbox', { name: 'quick edit' });
    await box.waitFor({ state: 'visible' });
    let remountReceipt: { sameNode: boolean } | undefined;
    if ('remount' in p.h) {
      if (!quickCard) throw new Error('Quick remount requires the real quick editor');
      const previous = await box.elementHandle();
      if (!previous) throw new Error('Quick editor initial node missing');
      try {
        await quickCard.getByRole('button', { name: 'done', exact: true }).click();
        await box.waitFor({ state: 'hidden' });
        await quickCard.locator('[data-action="quick-edit"]').click();
        await box.waitFor({ state: 'visible' });
        const same = await box.evaluate((el, old) => el === old, previous);
        remountReceipt = { sameNode: same }; raw('quick-remount', remountReceipt);
        if (same) throw new Error('Quick editor did not remount');
      } finally { await previous.dispose(); }
    }

    if (p.h.surface === 'editor' && p.h.mobile) await page.getByRole('group', { name: 'pane', exact: true }).getByRole('button', { name: 'draft', exact: true }).click();
    await box.fill(p.mixed.text); await box.focus();
    await box.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, el.value.length));
    const inputs: MixedInput[] = [];
    for (const index of p.mixed.actions.keys()) {
      await box.focus();
      const before = await box.evaluate((el: HTMLTextAreaElement) => ({ value: el.value, selection: [el.selectionStart, el.selectionEnd] }));
      const action = mixedInputAction(p.mixed, index, before, inputs);
      const delivered = await box.evaluate((el: HTMLTextAreaElement, range) => {
        el.setSelectionRange(range[0]!, range[1]!);
        return { value: el.value, selection: [el.selectionStart, el.selectionEnd] };
      }, action.range);
      const input: MixedInput = { ...before, action, delivered };
      // Retain native input receipts separately from the source model.
      // They establish trusted delivery, without a physical keyboard/IME claim.
      await box.evaluate((el: HTMLTextAreaElement) => {
        const host = window as typeof window & { __newlineBeforeInputs?: object[]; __newlineTextInputs?: object[]; __newlineTextInputListener?: (event: Event) => void; __newlineBeforeInputListener?: (event: InputEvent) => void };
        if (host.__newlineBeforeInputListener) el.removeEventListener('beforeinput', host.__newlineBeforeInputListener, true);
        if (host.__newlineTextInputListener) el.removeEventListener('input', host.__newlineTextInputListener, true);
        host.__newlineBeforeInputs = []; host.__newlineTextInputs = [];
        const receive = (event: InputEvent) => {
          host.__newlineBeforeInputs!.push({ trusted: event.isTrusted, target: event.target === el,
            inputType: event.inputType, isComposing: event.isComposing, cancelable: event.cancelable });
        };
        host.__newlineBeforeInputListener = receive;
        el.addEventListener('beforeinput', receive, true);
        const textInput = (event: Event) => host.__newlineTextInputs!.push({ trusted: event.isTrusted,
          target: event.target === el, inputType: (event as InputEvent).inputType, isComposing: (event as InputEvent).isComposing });
        host.__newlineTextInputListener = textInput;
        el.addEventListener('input', textInput, true);
      });

      inputs.push(input); observe('input' + index, input);
      const key = shortcutKey(action);
      if (key) {
        const before = await box.evaluate((el: HTMLTextAreaElement) => {
          const host = window as typeof window & { __newlineHistoryKey?: KeyboardEvent };
          host.__newlineHistoryKey = undefined;
          const receive = (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return;
            el.removeEventListener('keydown', receive); host.__newlineHistoryKey = event;
          };
          el.addEventListener('keydown', receive);
          return { focused: document.activeElement === el, selection: [el.selectionStart, el.selectionEnd] };
        });
        await page.keyboard.press(key);
        const event = await box.evaluate((el: HTMLTextAreaElement) => {
          const event = (window as typeof window & { __newlineHistoryKey?: KeyboardEvent }).__newlineHistoryKey;
          return event && { key: event.key, shiftKey: event.shiftKey, altKey: event.altKey, ctrlKey: event.ctrlKey,
            metaKey: event.metaKey, trusted: event.isTrusted, target: event.target === el, defaultPrevented: event.defaultPrevented };
        });
        observe('key' + index, { requested: key, before, event });
      } else if (action.kind === 'type') {
        if (index === 0 && 'textDelivery' in p.h) await page.keyboard.type(action.text);
        else await page.keyboard.insertText(action.text);
      }
      else if (action.kind !== 'select') throw new Error('Unexpected native newline history action: ' + action.kind);
      const delivery = await box.evaluate((el: HTMLTextAreaElement) => {
        const host = window as typeof window & { __newlineBeforeInputs?: object[]; __newlineTextInputs?: object[]; __newlineTextInputListener?: (event: Event) => void; __newlineBeforeInputListener?: (event: InputEvent) => void };
        if (host.__newlineBeforeInputListener) el.removeEventListener('beforeinput', host.__newlineBeforeInputListener, true);
        if (host.__newlineTextInputListener) el.removeEventListener('input', host.__newlineTextInputListener, true);
        host.__newlineBeforeInputListener = undefined; host.__newlineTextInputListener = undefined;
        return { beforeinput: host.__newlineBeforeInputs ?? [], inputs: host.__newlineTextInputs ?? [] };
      });
      raw('native-input', { index, receipt: delivery });
      const step = { ...await box.evaluate((el: HTMLTextAreaElement) => ({ value: el.value,
        selection: [el.selectionStart, el.selectionEnd], focused: document.activeElement === el })),
        delivery: { ...delivery, ...(index === 0 && remountReceipt ? { remount: remountReceipt } : {}) } };
      raw('native-step-before-premise', { index, step });
      if (index === 0 && 'begin' in p.h) {
        const offered = delivery.beforeinput as { trusted?: boolean; target?: boolean; inputType?: string; isComposing?: boolean; cancelable?: boolean }[];
        const committed = delivery.inputs as { trusted?: boolean; target?: boolean; inputType?: string }[];
        const typed = 'textDelivery' in p.h
          ? offered.some(event => event.trusted && event.target && event.inputType === 'insertText' && !event.isComposing && event.cancelable)
          : offered.some(event => event.trusted && event.target && event.inputType === 'insertText')
            || committed.some(event => event.trusted && event.target && (event.inputType === 'insertText' || event.inputType === 'insertCompositionText'));
        if (!typed) throw new Error('Native text driver premise missing: trusted text delivery at the intended textarea');
      }
      observe('step' + index, step);
      await captureBrowserCalls(page);
    }
    // A calibration persists this exact public source through another writer.
    // The editor's own revision stays stale, so its real Save must report the
    // conflict even though a subsequent GET already holds the correct text.
    const staleSetup: { read: ItemResponse; request: unknown; write: ItemResponse }[] = [];
    const staleWrites: Promise<ItemResponse & { request: unknown }>[] = [];
    if (staleSave) {
      if (!id || p.h.surface !== 'editor') throw new Error('Stale Save control requires the full editor');
      const endpoint = '/api/items/' + id;
      const source = await box.inputValue();
      for (let attempt = 0; attempt < 6; attempt++) {
        const read = await context.request.get(endpoint);
        const before = await read.json();
        if (!read.ok()) throw new Error('Stale Save control read failed: ' + read.status());
        const request = { expectedRevision: before.revision, contentMd: source };
        const write = await context.request.patch(endpoint, { data: request });
        const after = await write.json();
        const receipt = { read: { status: read.status(), body: before }, request, write: { status: write.status(), body: after } };
        raw('stale-setup', receipt); staleSetup.push(receipt);
        if (write.ok()) break;
        if (write.status() !== 409 || attempt === 5) throw new Error('Stale Save control write failed: ' + write.status());
      }
      page.on('response', response => {
        if (new URL(response.url()).pathname !== endpoint || response.request().method() !== 'PATCH') return;
        const receipt = response.json().then(body => {
          const value = { request: response.request().postDataJSON(), status: response.status(), body };
          raw('stale-save', value); return value;
        });
        staleWrites.push(receipt); drain.push(receipt); void receipt.catch(() => undefined);
      });
    }
    // Observe the actual clicked action's busy lifetime. An arbitrary item
    // response could belong to a prior autosave, rather than this Save.
    const save = p.h.surface === 'quick' ? page.locator('.quick-edit').getByRole('button', { name: 'save draft', exact: true }) : page.locator('#save-draft-btn');
    if (!await save.isEnabled()) throw new Error('Native newline Save is already busy');
    const settled = deferred<{ trusted: boolean; states: boolean[]; errors: string[] }>();
    await page.exposeFunction('newlineSaveSettled', (receipt: { trusted: boolean; states: boolean[]; errors: string[] }) => settled.resolve(receipt));
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
            const errors = [...document.querySelectorAll('.error-banner')].map(banner => banner.textContent ?? '');
            void (window as typeof window & { newlineSaveSettled: (receipt: object) => Promise<void> }).newlineSaveSettled({ trusted, states: [...states], errors });
            break;
          }
        }
      });
      observer.observe(el, { attributes: true, attributeFilter: ['disabled'], attributeOldValue: true });
      el.addEventListener('click', event => { trusted = event.isTrusted; armed = true; }, { once: true, capture: true });
    });
    if (delayedDuplicate) await save.evaluate((el: HTMLButtonElement, contentMd) => {
      el.addEventListener('click', () => {
        const host = window as typeof window & { __duplicateCreate?: Promise<void> };
        host.__duplicateCreate = fetch('/api/items', { method: 'POST',
          headers: { 'content-type': 'application/json', 'x-oracle-delayed-create': '1' },
          body: JSON.stringify({ contentMd, kind: 'fragment' }) }).then(async response => { await response.text(); });
        void host.__duplicateCreate.catch(() => undefined);
      }, { once: true, capture: true });
    }, await box.inputValue());
    await save.click();
    const boundary = await hostEvent(settled.promise, 'clicked native newline Save action completed');
    page.off('request', captureCreate);
    const admitted = [...created];
    raw('create-admission-cut', { count: admitted.length, boundary });
    if (delayedDuplicate) {
      try { await hostEvent(duplicateHeld.promise, 'duplicate create response held across Save completion'); }
      finally { releaseDuplicate.resolve(); }
    }
    const creates = await hostEvent(Promise.all(admitted), 'admitted create responses completed');
    if (delayedDuplicate) await page.evaluate(() => (window as typeof window & { __duplicateCreate?: Promise<void> }).__duplicateCreate);
    const itemId = id ?? creates[0]?.body.id;
    if (typeof itemId !== 'string' || !itemId) throw new Error('Composer Save completed without a created item identity');
    const inspected = await context.request.get('/api/items/' + itemId);
    const stored = await inspected.json();
    const conflict = staleSave ? { setup: staleSetup, writes: await Promise.all(staleWrites) } : undefined;
    const literal: NewlineSaveRaw = { itemId, stored: { status: inspected.status(), body: stored }, creates, boundary };
    raw('saved', { ...literal, read: { method: 'GET', url: inspected.url() }, ...(conflict ? { conflict } : {}) });
    const received = corruptSave ? corruptSave(literal) : literal;
    if (corruptSave) raw('injected-save', received);
    const hasId = (id: unknown) => typeof id === 'string' && id.length > 0;
    observe('saved', {
      source: received.stored.body.contentMd, ok: received.stored.status >= 200 && received.stored.status < 300,
      status: received.stored.status,
      identity: { requestedPresent: hasId(received.itemId), returnedPresent: hasId(received.stored.body.id),
        matchesRequested: received.stored.body.id === received.itemId },
      creates: received.creates.map(create => ({ status: create.status, hasIdentity: hasId(create.body.id),
        matchesSavedItem: create.body.id === received.stored.body.id })),
      boundary: received.boundary,
      ...(conflict ? { conflict: { setup: conflict.setup.map(entry => ({ readStatus: entry.read.status, writeStatus: entry.write.status })),
        writes: conflict.writes.map(entry => ({ status: entry.status })) } } : {}),
    });
    page.off('response', captureWrite);
    } finally {
      page.off('request', captureCreate); page.off('response', captureWrite);
      releaseDuplicate.resolve();
    }
  });
}

/** Actual React and native browser receivers; no expected formatter output. */
import type { Locator, Page } from '@playwright/test';
import { applicationDriver } from './application-driver-oracle.ts';
import { browserRun, captureBrowserCalls } from './browser-driver-oracle.ts';
import type { Observe } from './document-oracle.ts';
import type { pickerInteractionPlan, readonlyInteractionPlan, scrollInteractionPlan, toolbarInteractionPlan, traversalInteractionPlan } from './interaction-model-oracle.ts';

async function openEditor(context: import('@playwright/test').BrowserContext, page: Page, text: string, mobile: boolean): Promise<Locator> {
  const made = await context.request.post('/api/items', { data: { contentMd: 'interaction seed', kind: 'fragment' } });
  if (!made.ok()) throw new Error('Interaction item setup failed: ' + made.status());
  await page.goto('/studio/edit/' + (await made.json()).id);
  const box = page.locator('#md-input'); await box.waitFor({ state: 'visible' });
  if (mobile) await page.getByRole('group', { name: 'pane', exact: true }).getByRole('button', { name: 'draft', exact: true }).click();
  await box.fill(text); await box.focus(); return box;
}
const snapshot = (box: Locator) => box.evaluate((el: HTMLTextAreaElement) => ({ value: el.value, selection: [el.selectionStart, el.selectionEnd], focused: document.activeElement === el }));

export async function toolbarInteractionDriver(p: ReturnType<typeof toolbarInteractionPlan>, observe: Observe) {
  await applicationDriver(p.h.mobile, observe, async ({ context, page }) => {
    const box = await openEditor(context, page, p.text, p.h.mobile);
    await box.evaluate((el: HTMLTextAreaElement, range) => el.setSelectionRange(range[0]!, range[1]!), [p.from, p.to]);
    const button = page.locator(`.ed-tools [data-action="md-${p.h.tool}"]`);
    if (p.h.activation === 'click') await button.click();
    else { await button.focus(); await page.keyboard.press(p.h.activation); }
    observe('delivered', await snapshot(box)); await captureBrowserCalls(page);
  });
}

export async function pickerInteractionDriver(p: ReturnType<typeof pickerInteractionPlan>, observe: Observe) {
  await applicationDriver(p.h.mobile, observe, async ({ context, page }) => {
    // Provider premise only: actual HandlePicker receives a normal valid contact
    // list and consumes the native key. Contact persistence is not judged here.
    await context.route('**/api/contacts', route => route.fulfill({ json: { contacts: [{ id: 'oracle-alice', handle: p.handle, name: 'Alice', url: 'https://alice.example/', ids: [], created: '2026-11-18T00:00:00Z', updated: '2026-11-18T00:00:00Z' }] } }));
    const box = await openEditor(context, page, p.text, p.h.mobile);
    await box.evaluate((el: HTMLTextAreaElement) => { el.setSelectionRange(el.value.length, el.value.length); el.dispatchEvent(new Event('selectionchange')); });
    await page.getByRole('complementary', { name: 'mention picker' }).getByRole('button', { name: /alice/ }).waitFor({ state: 'visible' });
    // Sample the actual delegated formatter entry, independently of whether
    // React delivers it at capture or bubble. The wrapper forwards unchanged.
    await box.evaluate((el: HTMLTextAreaElement) => {
      const sut = (window as any).__oracleSut, original = sut.onFormatKey;
      (window as any).__oraclePickerEntries = [];
      (window as any).__oraclePickerOriginal = original;
      sut.onFormatKey = function(event: any) {
        if (event.currentTarget === el && (event.key === 'Tab' || event.key === 'Enter')) {
          (window as any).__oraclePickerEntries.push({ value: el.value, selection: [el.selectionStart, el.selectionEnd], prevented: event.defaultPrevented, nativePrevented: event.nativeEvent.defaultPrevented });
        }
        return original.apply(this, arguments);
      };
    });
    try {
      await page.keyboard.press(p.h.key);
      const input = await page.evaluate(() => (window as any).__oraclePickerEntries[0] ?? null);
      observe('gateInput', input);
      if (!input?.prevented || !input?.nativePrevented) throw new Error('Missing host premise: actual formatter entry did not receive a picker-consumed key');
      observe('delivered', await snapshot(box)); await captureBrowserCalls(page);
    } finally {
      await page.evaluate(() => { (window as any).__oracleSut.onFormatKey = (window as any).__oraclePickerOriginal; });
    }
  });
}

export async function readonlyInteractionDriver(p: ReturnType<typeof readonlyInteractionPlan>, observe: Observe) {
  await applicationDriver(p.h.mobile, observe, async ({ context, page }) => {
    const box = await openEditor(context, page, p.text, p.h.mobile);
    await box.evaluate((el: HTMLTextAreaElement, range) => {
      el.readOnly = true; el.setSelectionRange(range[0]!, range[1]!);
      (window as any).__oracleReadonlyEvent = undefined;
      el.addEventListener('keydown', event => { (window as any).__oracleReadonlyEvent = event; });
    }, [p.from, p.to]);
    await page.keyboard.press(p.h.key);
    observe('delivered', { ...(await snapshot(box)), prevented: await page.evaluate(() => (window as any).__oracleReadonlyEvent?.defaultPrevented ?? null) });
    await captureBrowserCalls(page);
  });
}

export async function traversalInteractionDriver(p: ReturnType<typeof traversalInteractionPlan>, observe: Observe) {
  await applicationDriver(p.h.mobile, observe, async ({ context, page }) => {
    const box = await openEditor(context, page, p.text, p.h.mobile);
    // Run the same native focus action once with only the formatter bypassed.
    // Its destination is a host input, not a pinned production toolbar element.
    await box.evaluate((el: HTMLTextAreaElement) => {
      const sut = (window as any).__oracleSut, original = sut.onFormatKey;
      const state = { control: true, event: null as KeyboardEvent | null, ids: new WeakMap<Element, number>(), next: 0 };
      (window as any).__oracleTraversal = state;
      (window as any).__oracleTraversalOriginal = original;
      sut.onFormatKey = function(event: any) {
        if (event.currentTarget === el && event.key === 'Tab') {
          state.event = event.nativeEvent;
          if (state.control) return;
        }
        return original.apply(this, arguments);
      };
      (window as any).__oracleTraversalReceipt = () => {
        const recipient = document.activeElement;
        let id: number | null = null;
        if (recipient && recipient !== document.body && recipient !== document.documentElement) {
          if (!state.ids.has(recipient)) state.ids.set(recipient, state.next++);
          id = state.ids.get(recipient)!;
        }
        const position = recipient ? el.compareDocumentPosition(recipient) : 0;
        return { value: el.value, selection: [el.selectionStart, el.selectionEnd], focused: recipient === el,
          prevented: state.event?.defaultPrevented ?? null, recipient: id,
          direction: recipient === el ? 'same' : position & Node.DOCUMENT_POSITION_FOLLOWING ? 'after' : position & Node.DOCUMENT_POSITION_PRECEDING ? 'before' : 'outside' };
      };
    });
    await box.evaluate((el: HTMLTextAreaElement, range) => el.setSelectionRange(range[0]!, range[1]!), [p.from, p.to]);
    try {
      await page.keyboard.press(p.h.reverse ? 'Shift+Tab' : 'Tab');
      const control = await page.evaluate(() => (window as any).__oracleTraversalReceipt());
      observe('nativeTraversalInput', control);
      if (control.prevented !== false || control.focused || control.recipient === null) throw new Error('Missing host premise: native traversal control has no unprevented focused recipient');
      await box.focus();
      await box.evaluate((el: HTMLTextAreaElement, range) => {
        el.setSelectionRange(range[0]!, range[1]!);
        (window as any).__oracleTraversal.control = false;
        (window as any).__oracleTraversal.event = null;
      }, [p.from, p.to]);
      await page.keyboard.press(p.h.reverse ? 'Shift+Tab' : 'Tab');
      observe('delivered', await page.evaluate(() => (window as any).__oracleTraversalReceipt())); await captureBrowserCalls(page);
    } finally {
      await page.evaluate(() => { (window as any).__oracleSut.onFormatKey = (window as any).__oracleTraversalOriginal; });
    }
  });
}

export async function scrollInteractionDriver(p: ReturnType<typeof scrollInteractionPlan>, observe: Observe) {
  observe('delivered', await browserRun((sut, p) => {
    document.body.innerHTML = '<button>before</button><textarea style="display:block;margin-top:3000px"></textarea><div style="height:3000px"></div>';
    const el = document.querySelector('textarea')!;
    el.value = p.initial;
    document.querySelector('button')!.focus(); window.scrollTo(0, p.h.offset);
    const outsideViewport = el.getBoundingClientRect().top > innerHeight;
    const actualOffset = window.scrollY;
    const originalFocus = HTMLElement.prototype.focus, originalCommand = document.execCommand.bind(document);
    const scrolls: { before: number[]; after: number[] }[] = [];
    HTMLElement.prototype.focus = function(options) {
      const before = [window.scrollX, window.scrollY]; originalFocus.call(this, options);
      if (this === el) scrolls.push({ before, after: [window.scrollX, window.scrollY] });
    };
    const nativeCommands: { name: string; result: boolean }[] = [];
    document.execCommand = (name, ui, insert) => {
      const result = p.h.native ? originalCommand(name, ui, insert) : false;
      nativeCommands.push({ name, result }); return result;
    };
    const errors: { name: string; message: string }[] = [];
    try { sut.applyEdit(el, p.edit); }
    catch (error) { errors.push({ name: (error as Error).name, message: (error as Error).message }); }
    finally { document.execCommand = originalCommand; HTMLElement.prototype.focus = originalFocus; }
    return { value: el.value, selection: [el.selectionStart, el.selectionEnd], focused: document.activeElement === el,
      outsideViewport, actualOffset, scrolls: scrolls.map(s => s.after.map((n, i) => n - s.before[i]!)), nativeCommands, errors };
  }, p));
}

/** Factual keyboard.type delivery, independent of the editor's resulting document. */
import type { Locator, Page } from '@playwright/test';

export type StructuralInputEvent = { type: string; key: string | null; data: string | null; inputType: string | null; trusted: boolean; target: boolean; defaultPrevented: boolean };
export type StructuralTypingReceipt = { method: 'keyboard.type'; text: string; events: StructuralInputEvent[]; initialTarget: boolean; failures: string[] };

export async function typeStructuralTextWithKeys(page: Page, box: Locator, text: string): Promise<StructuralTypingReceipt> {
  const initialTarget = await box.evaluate(el => document.activeElement === el);
  const recording = await box.evaluateHandle(el => {
    const events: Event[] = [];
    const record = (event: Event) => { events.push(event); };
    const types = ['keydown', 'keyup', 'beforeinput', 'input'];
    for (const type of types) document.addEventListener(type, record, true);
    return { stop() {
      for (const type of types) document.removeEventListener(type, record, true);
      // Retain the same dispatched events until after React's listeners ran,
      // so defaultPrevented records the final state, not capture-phase state.
      return events.map(event => ({ type: event.type,
        key: event instanceof KeyboardEvent ? event.key : null,
        data: event instanceof InputEvent ? event.data : null,
        inputType: event instanceof InputEvent ? event.inputType : null,
        trusted: event.isTrusted, target: event.target === el, defaultPrevented: event.defaultPrevented }));
    } };
  });
  const failures: string[] = [];
  const note = (phase: string, error: unknown) => failures.push(phase + ': ' + (error instanceof Error ? error.message : String(error)));
  try {
    // Keep the actual per-code-point Playwright path. No focus repair or native
    // history boundary belongs between characters, including LF and Unicode.
    await page.keyboard.type(text);
  } catch (error) { note('keyboard.type', error); }
  let events: StructuralInputEvent[] = [];
  try { events = await recording.evaluate(value => value.stop()); } catch (error) { note('stop recording', error); }
  try { await recording.dispose(); } catch (error) { note('dispose recording', error); }
  // Validation waits until the public editor checkpoint has also been recorded.
  return { method: 'keyboard.type', text, events, initialTarget, failures };
}

export function structuralTypingProblem(receipt: unknown, text: string): string | undefined {
  if (!receipt || typeof receipt !== 'object') return 'missing structural keyboard.type receipt';
  const value = receipt as Partial<StructuralTypingReceipt>;
  if (value.method !== 'keyboard.type' || value.text !== text || !Array.isArray(value.events) || typeof value.initialTarget !== 'boolean' || !Array.isArray(value.failures)) return 'wrong structural typing method, input or event list';
  if (value.failures.length) return 'structural typing or recording failed: ' + JSON.stringify(value.failures);
  if (value.events.some(event => !event || typeof event !== 'object' || typeof event.trusted !== 'boolean' || typeof event.target !== 'boolean' || typeof event.defaultPrevented !== 'boolean' || !['keydown', 'keyup', 'beforeinput', 'input'].includes(event.type))) return 'malformed or unknown structural delivery event';
  // Playwright's installed Keyboard.type presses US-layout characters, aliases
  // LF/CR to Enter, and uses insertText per code point for unsupported Unicode.
  const characters = Array.from(text);
  const expectedKeys = characters.flatMap(char => {
    const key = char === '\n' || char === '\r' ? 'Enter' : /^[\x20-\x7e]$/.test(char) ? char : undefined;
    return key ? [{ type: 'keydown', key }, { type: 'keyup', key }] : [];
  });
  const keys = value.events.filter(event => event.trusted && (event.type === 'keydown' || event.type === 'keyup')).map(event => ({ type: event.type, key: event.key }));
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) return 'structural ASCII/Enter key sequence differs';
  // Input/default handling and retargeting belong to the editor's product
  // judgment. A focus-stealing handler may prevent later input events despite
  // valid key delivery. Keep every raw event and initialTarget for diagnosis.
  // Unsupported Unicode has no required physical-key event; a pure-Unicode
  // call cannot distinguish type from bulk insertText using these events alone.
}

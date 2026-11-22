/** Real DOM driver, shared by the application and keyboard oracles. */
import { browserRun } from './browser-driver-oracle.ts';
import { mods, type Handler } from './keyboard-model-oracle.ts';
import type { Edit } from './document-oracle.ts';

type Input = { initial: string; selection: [number, number]; native: boolean; edit?: Edit; handler?: Handler; modifiers?: ReturnType<typeof mods> };
export function textareaDriver(input: Input) {
  return browserRun((sut, input) => {
    document.body.innerHTML = '<textarea></textarea><button>Next</button>';
    const element = document.querySelector('textarea')!;
    element.value = input.initial;
    element.setSelectionRange(...input.selection);
    element.readOnly = input.handler?.readOnly ?? false;
    if (input.handler) Object.defineProperty(navigator, 'platform', { configurable: true, value: input.handler.platform.name });
    element.focus();
    const effects: unknown[] = [];
    const focus = element.focus.bind(element), select = element.setSelectionRange.bind(element), replace = element.setRangeText.bind(element), dispatch = element.dispatchEvent.bind(element);
    const command = document.execCommand.bind(document);
    let nativeResult: boolean | null = null;
    element.focus = options => { effects.push(['focus', options?.preventScroll === true]); focus(options); };
    element.setSelectionRange = (a, b, direction) => { effects.push(['select', a, b]); select(a, b, direction); };
    element.setRangeText = (insert: string, from: number = element.selectionStart, to: number = element.selectionEnd, mode?: SelectionMode) => { effects.push(['fallback', insert, from, to]); replace(insert, from, to, mode); };
    element.dispatchEvent = event => { effects.push(['event', event.type, event.bubbles]); return dispatch(event); };
    document.execCommand = (name, ui, insert) => {
      effects.push(['command', name, !!ui, insert ?? '', element.selectionStart, element.selectionEnd]);
      nativeResult = input.native ? command(name, ui, insert) : false;
      return nativeResult;
    };
    let prevented = 0;
    // Real DOM KeyboardEvent, adapted only at React's currentTarget/nativeEvent
    // boundary. The app receiving oracle exercises the actual React listener.
    const event = input.handler && new KeyboardEvent('keydown', { key: input.handler.key, ...input.modifiers, bubbles: true, cancelable: true, isComposing: input.handler.composing });
    if (event && input.handler?.prevented) event.preventDefault();
    if (event) element.addEventListener('keydown', native => sut.onFormatKey({
      key: native.key, metaKey: native.metaKey, ctrlKey: native.ctrlKey, altKey: native.altKey, shiftKey: native.shiftKey,
      currentTarget: element, defaultPrevented: native.defaultPrevented, nativeEvent: native,
      preventDefault: () => { prevented++; native.preventDefault(); },
    } as any));
    const errors: { name: string; message: string }[] = [];
    const onError = (event: ErrorEvent) => { errors.push({ name: event.error?.name ?? 'Error', message: event.message }); event.preventDefault(); };
    window.addEventListener('error', onError);
    try {
      if (event) dispatch(event);
      else sut.applyEdit(element, input.edit!);
    } catch (error) { errors.push({ name: (error as Error).name, message: (error as Error).message }); }
    finally { document.execCommand = command; window.removeEventListener('error', onError); }
    // dispatching the input event itself is driver setup, not a production effect.
    const delivered = effects;
    return { prevented, nativeResult, errors, value: element.value, selection: [element.selectionStart, element.selectionEnd], effects: delivered, focused: document.activeElement === element };
  }, input);
}

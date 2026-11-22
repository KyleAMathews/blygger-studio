/** Textarea host contract and independent transaction expectation; no production imports. */
import { type Edit } from './document-oracle.ts';


export function transaction(initial: string, edit: Edit, native: boolean | null) {
  const effects: unknown[] = [
    ['focus', true], ['select', edit.from, edit.to],
  ];
  if (native !== null) effects.push(['command', edit.insert || edit.from === edit.to ? 'insertText' : 'delete', false, edit.insert, edit.from, edit.to]);
  if (!native) effects.push(['fallback', edit.insert, edit.from, edit.to], ['event', 'input', true]);
  effects.push(['select', edit.start, edit.end], ['event', 'selectionchange', false]);
  // The host normalizes inserted line endings, then clamps its selection API.
  // Use a character walk to model textarea newline normalization.
  let inserted = '';
  for (let i = 0;i < edit.insert.length;i++) {
    const c = edit.insert[i]!;
    inserted += c === '\r' ? '\n' : c;
    if (c === '\r' && edit.insert[i + 1] === '\n') i++;
  }
  const value = initial.slice(0, edit.from) + inserted + initial.slice(edit.to);
  return { value, selection: [Math.min(value.length, edit.start), Math.min(value.length, edit.end)], effects };
}

// Native delivery and direct bubbling fallback are both legal. The model does
// not repeat production's host-safety classifier: exact source is owed either way.
export function nativeChoices(_initial: string, _edit: Edit, enabled: boolean): (boolean | null)[] {
  return enabled ? [true, false, null] : [false, null];
}

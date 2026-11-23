/** Complete receiving continuity and independent per-command membership checks. */
import { differs, type Observation } from '@tanstack/oracles';
import { traceValue } from './document-oracle.ts';
import { matchesState, shortcutKey, publicState, type MixedExpected, type MixedInput, type MixedPlan } from './mixed-model-oracle.ts';
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
export const mixedCheckpoints = (p: MixedPlan) => p.actions.flatMap((intent, index) => ['input' + index, ...(shortcutKey(intent) ? ['key' + index] : []), 'step' + index]);
export function checkMixedPrefix(p: MixedPlan, trace: readonly Observation[], expected: MixedExpected, law: string) {
  for (const [index, step] of expected.steps.entries()) {
    const checkpoint = 'input' + index, input = traceValue(trace, checkpoint) as MixedInput | undefined;
    const before = publicState(input), previous = index === 0
      ? { value: p.text, selection: [0, p.text.length] } : publicState(traceValue(trace, 'step' + (index - 1)));
    const continuity = differs(checkpoint, law, before, previous, checkpoint + '.continuity');
    if (continuity) return continuity;
    const membership = differs(checkpoint, law, step.inputAllowed, true, checkpoint + '.allowed');
    if (membership) return membership;
    const actionAllowed = step.actions.some(action => same(action, input?.action));
    const action = differs(checkpoint, law, actionAllowed, true, checkpoint + '.action');
    if (action) return action;
    const delivered = differs(checkpoint, law, publicState(input?.delivered), { value: before!.value, selection: input!.action!.range }, checkpoint + '.delivered');
    if (delivered) return delivered;
    const key = shortcutKey(input!.action!);
    if (key) {
      const deliveredKey = differs('key' + index, law, traceValue(trace, 'key' + index), {
        requested: key, before: { focused: true, selection: input!.action!.range },
        event: { key: key === 'Enter' || key === 'Shift+Enter' ? 'Enter' : 'Tab', shiftKey: key.startsWith('Shift+'), altKey: false, ctrlKey: false, metaKey: false, trusted: true, target: true, defaultPrevented: input!.action!.kind === 'newline' ? false : step.changed },
      }, 'key' + index + '.receiving');
      if (deliveredKey) return deliveredKey;
    }
    const output = traceValue(trace, 'step' + index);
    if (!matchesState(step.allowed, output)) return differs('step' + index, law,
      { action: input?.action, state: output }, { action: input?.action, permitted: step.allowed }, 'step' + index + '.state');
  }
}

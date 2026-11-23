/** Input-event persistence model, independent of Draft and the router. */
import fc from 'fast-check';
import { type Sample, apply } from './document-oracle.ts';
import { emphasisEdit, row } from './inline-model-oracle.ts';

export const navigationArbitrary = fc.record({
  body: fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 'α', '😀'), minLength: 1, maxLength: 32 }),
  commands: fc.array(fc.constantFrom('bold' as const, 'italic' as const), { minLength: 2, maxLength: 6 }),
  schedule: fc.constantFrom('original' as const, 'pending' as const),
  departure: fc.constantFrom('stay' as const, 'leave' as const, 'spa' as const, 'spa-reject' as const), mobile: fc.boolean(),
});
export type Navigation = Sample<typeof navigationArbitrary>;
export const navigationCases: Record<string, Navigation> = {};
for (const mobile of [false, true]) for (const departure of ['stay', 'leave', 'spa', 'spa-reject'] as const) {
  for (const schedule of ['original', 'pending'] as const) {
    navigationCases[`${schedule}-${departure}-${mobile ? 'mobile' : 'desktop'}`] = {
      body: 'Keys1234', commands: ['italic', 'italic'], schedule, departure, mobile,
    };
  }
}
export const navigationStates = (h: Navigation) => [h.schedule, h.departure, h.mobile ? 'mobile' : 'desktop',
  ...(h.schedule === 'original' ? ['sameTextButDirty'] : ['uncommittedLatestSave']),
  ...(h.departure === 'spa-reject' ? ['rejectedDeparture', 'retryAfterSaveFailure'] : [])];

export function navigationPlan(h: Navigation) {
  // Original reconstructs I/I exactly; generated commands vary the neighboring
  // pending-save histories. The save event is an input index, not SUT state.
  return { h, commands: h.schedule === 'original' ? ['italic', 'italic'] as const : h.commands,
    acknowledgeAfter: h.schedule === 'pending' ? 0 : null };
}
export function navigationModel(p: ReturnType<typeof navigationPlan>) {
  let stars = 0, storedStars = 0, savedEvent = -1;
  const formats = p.commands.map((command, index) => {
    stars += command === 'bold' ? stars >= 2 ? -2 : 2 : stars % 2 ? -1 : 1;
    if (index === p.acknowledgeAfter) { storedStars = stars; savedEvent = index; }
    return { value: '*'.repeat(stars) + p.h.body + '*'.repeat(stars), selection: [stars, stars + p.h.body.length], focused: true };
  });
  const current = formats.at(-1)!.value, stored = '*'.repeat(storedStars) + p.h.body + '*'.repeat(storedStars);
  // Dirty is an unacknowledged editing event, even when I/I restores the same
  // text. Equality of strings cannot decide whether a warning is owed.
  const dirty = savedEvent < p.commands.length - 1;
  const departing = p.h.departure !== 'stay';
  const inApp = p.h.departure === 'spa' || p.h.departure === 'spa-reject';
  const destination = inApp ? current : stored;
  const selectedStars = inApp ? stars : storedStars;
  const change = emphasisEdit({ text: destination, from: 0, to: destination.length,
    h: { kind: 'bold', row: row({ body: p.h.body, left: selectedStars, right: selectedStars }), outsideLeft: 0, outsideRight: 0, before: '', after: '' } });
  return { formats, current, stored, dirty,
    pending: { value: current, stored },
    blocked: { inEditor: true, value: current, stored },
    failed: { inEditor: true, value: current, stored, errorShown: true },
    departure: { dialogs: inApp ? [] : [{ type: 'beforeunload', decision: p.h.departure }], inEditor: !departing,
      value: departing ? null : current, stored: inApp ? current : stored, departedBeforeRelease: false,
      ...(p.h.departure === 'spa-reject' ? { departedBeforeRetry: false } : {}) },
    quickLoaded: { value: destination },
    quickBold: { value: apply(destination, change), selection: [change.start, change.end], focused: true },
    saved: { value: current }, errors: [] };
}

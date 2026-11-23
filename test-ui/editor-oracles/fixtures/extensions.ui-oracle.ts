/** Fixed browser-only compilation profile for disposable formatting hosts. */
import { extension as inspect } from '../../../extensions/inspect/ui/index.tsx';
import { extension as readingTime } from '../../../extensions/reading-time/ui/index.tsx';
import { extension as regions } from '../../../extensions/regions-example/ui/index.tsx';
// Unconfigured pages use the real example unchanged. These raw layouts have
// the same protected union, so expected source never depends on this adapter.
const regionsProfile: typeof regions = { ...regions, editorRegions: context => {
  const found = regions.editorRegions!(context);
  const layout = (window as typeof window & { __heldOracleLayout?: string }).__heldOracleLayout;
  if (!layout || layout === 'ordinary' || !found.length) return found;
  const region = found[0]!, end = region.end;
  const middle = region.start + Math.floor((end - region.start) / 2);
  switch (layout) {
    case 'empty': return [...found, { start: end + 2, end: end + 2, label: 'empty annotation' }];
    case 'reversed': return [...found, { start: end + 3, end: end + 1, label: 'reversed annotation' }];
    case 'outside': return [...found, { start: -9, end: -1, label: 'before document' },
      { start: context.text.length + 1, end: context.text.length + 9, label: 'after document' }];
    case 'overlap': return [{ ...region, end: middle + 1 }, { start: middle, end, label: 'annotation' }, ...found.slice(1)];
    case 'touching': return [{ ...region, end: middle }, { start: middle, end, label: 'annotation' }, ...found.slice(1)];
    default: throw new Error('Unknown held oracle raw layout: ' + layout);
  }
} };
export const compiledExtensions = [inspect, readingTime, regionsProfile];

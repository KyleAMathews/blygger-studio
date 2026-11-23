// The picker source slot (docs/extensions.md). The template to copy for a tab of your own in the
// `[[` picker: this one lists your drafts, which the Studio's own search leaves out of links
// (a draft has no public page yet), matched by every word of the query. The Studio lists the
// results, moves through them and inserts the one picked.
import { BlyggerApi, unwrap } from '../../../src/ui/extension-api.ts';
import type { PickerResult, StudioExtension } from '../../../src/ui/extension-api.ts';

const firstLine = (text: string) => text.replace(/^#+\s*/, '').split('\n').find((line) => line.trim())?.trim() ?? '';

export const extension: StudioExtension = {
  name: 'picker-example',
  label: 'Drafts in the picker example',
  description: 'A “drafts” tab in the [[ picker, listing your drafts by every word of the query. For trying picker sources.',
  pickerSource: {
    label: 'drafts',
    async search({ client, query, signal }) {
      const { items } = (await unwrap(BlyggerApi.listItems({ client, query: { status: 'draft', limit: 100 }, signal }))) as { items: { id: string; kind: string; contentMd: string; updated: string }[] };
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      return items
        .filter((item) => words.every((word) => item.contentMd.toLowerCase().includes(word)))
        .map((item): PickerResult => ({ id: item.id, label: firstLine(item.contentMd).slice(0, 80), excerpt: firstLine(item.contentMd) || '(empty draft)', meta: `${item.kind} · draft` }));
    },
  },
};

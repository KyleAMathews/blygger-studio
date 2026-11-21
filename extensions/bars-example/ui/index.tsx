// The editor bar slot (docs/extensions.md, "Editor bars"). The template to copy for controls
// of your own in the composer and the full editor: a button that inserts at the caret, and,
// with held-out regions on (try it with regions-example), their show/hide control, which this
// bar replaces (docs/extensions.md, "Replaceable controls"): it renders that control only when
// context.bar.owns says it won the claim. It also says where the Studio put it.
import type { StudioExtension } from '../../../src/ui/extension-api.ts';

export const extension: StudioExtension = {
  name: 'bars-example',
  label: 'Editor bar example',
  description: 'Adds a bar above the editor’s text box: insert a mark at the cursor, and show or hide held-out text. For trying editor bars.',
  editorBar: {
    label: 'Example bar',
    row: 'above',
    blocks: 2,
    replaces: ['regionToggle'],
    component: ({ context }) => (
      <span data-bar-place={context.bar.place}>
        <button type="button" className="act" data-action="bar-insert" onClick={() => context.insert('※')}>
          insert ※
        </button>
        {context.regions && context.bar.owns.includes('regionToggle') ? (
          <button type="button" className="link-btn" data-action="bar-regions" onClick={() => (context.regions!.hidden ? context.regions!.show() : context.regions!.hide())}>
            {context.regions.hidden ? `show ${context.regions.labels.join(', ')}` : `hide ${context.regions.labels.join(', ')}`}
          </button>
        ) : null}
      </span>
    ),
  },
};

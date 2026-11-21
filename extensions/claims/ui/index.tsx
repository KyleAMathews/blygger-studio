/*
 * claims: forecasts anyone can check.
 *
 * - Editor bar: "+ claim" opens a form that asks plain questions (what will
 *   happen, how sure, by when, how anyone will check) and inserts a `claim`
 *   block, the format blyggi.com and blyg-claims read and score. With a claim
 *   in the post, the bar shows it in a few words and opens it for editing.
 * - Reading byline: a badge on entries with a claim (how sure, when it's due,
 *   pinned or not), opening a sheet with the claim. On your own: pin it, and
 *   resolve it (append a `resolution` block, publish, pin). On others':
 *   "forecast this too" opens a draft with a copy of the claim.
 * - A Claims page (under More): your claims by what needs doing, with your
 *   score, computed on each claim as first pinned.
 *
 * Browser only, no network requests of its own. It reads claims from entries'
 * HTML, and your own items through the SDK for their pins. It writes only
 * through the editor bar, and, when you press pin or publish resolution,
 * through updateItem, publishItem and pinItem on that one item.
 * Source: https://github.com/miguelito4/blyg-claims (extension/).
 */
import { toast } from '../../../src/ui/extension-api.ts';
import type { EditorBarContext, StudioExtension } from '../../../src/ui/extension-api.ts';
import { fromClaim, sureOf, type Draft } from './core/compose.ts';
import { fenced, findClaim, placeNew } from './blocks.ts';
import { ClaimSheet } from './claim-sheet.tsx';
import { ClaimBadge, claimActions } from './reading.tsx';
import { ClaimsPage } from './page.tsx';
import './claims.css';

const date = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

function ClaimBar({ context }: { context: EditorBarContext }) {
  const found = findClaim(context.shown);

  const open = () => {
    const text = context.shown;
    const selection = context.selection();
    const selected = text.slice(selection.start, selection.end).replace(/\s+/g, ' ').trim();
    const start: Draft = found ? fromClaim(found.claim) : { shape: 'binary', statement: selected, resolvesBy: '', probability: 0.6 };
    context.openSheet((close) => (
      <ClaimSheet
        start={start}
        editing={!!found}
        close={close}
        onDone={(claim) => {
          if (found) {
            context.replace(found.start, found.end, fenced(claim));
          } else {
            const place = placeNew(text, selection, claim, !selected);
            context.replace(place.start, place.end, place.insert);
          }
          close();
          toast(found ? 'Claim updated.' : 'Claim added. When you publish, pin that version so it counts.');
        }}
      />
    ));
  };

  return (
    <span className="claims-bar">
      <button type="button" className="act" data-action="claims-open" onClick={open} title={found ? 'Open the claim in this post' : 'Add a checkable forecast to this post'}>
        {found ? 'edit claim' : '+ claim'}
      </button>
      {found ? (
        <span className="claims-summary" title={String(found.claim.claim ?? '')}>
          <b>{sureOf(found.claim)}</b> · by {date(found.claim.resolves_by)}
        </span>
      ) : null}
    </span>
  );
}

export const extension: StudioExtension = {
  name: 'claims',
  label: 'Claims',
  description: 'Forecasts anyone can check: a claim bar in the editor, a badge on posts with a claim, pinning and resolving from the post, and a Claims page with your score.',
  editorBar: { label: 'Claims', row: 'above', blocks: 2, component: ClaimBar },
  entryByline: ClaimBadge,
  entryActions: claimActions,
  page: { title: 'Claims', component: ClaimsPage },
};

// The Claims page: every claim on your blyg, grouped by what needs doing, with
// your score so far. Scores use the earliest pinned version of each claim, the
// same rule any reader of your public files applies, so this page and your
// public track record agree.

import { useEffect, useState } from 'react';
import { BlyggerApi, Button, Sheet, toast, unwrap } from '../../../src/ui/extension-api.ts';
import type { PageContext } from '../../../src/ui/extension-api.ts';
import { sureOf } from './core/compose.ts';
import { parseContent } from './core/parse.ts';
import { describeOutcome } from './core/resolve.ts';
import { brierWords, scoreClaim, summarize, type Scored } from './core/score.ts';
import { date, ResolveForm, statusOf, type Found, type OwnItem, type Status } from './reading.tsx';

interface Row extends Found {
  id: string;
  kind: 'fragment' | 'thread';
  item: OwnItem;
  /** The claim as first pinned, when it differs from the text now. */
  changed: boolean;
  status: Status;
}

const GROUPS: [string, Status[]][] = [
  ['Due', ['due']],
  ['Open', ['open']],
  ['Resolved', ['resolved', 'void']],
  ['On the record', ['record']],
];
const SAME = ['claim', 'shape', 'probability', 'pick', 'outcomes', 'size', 'range', 'confidence', 'resolves_by', 'check', 'voids_if'] as const;

async function loadRows(context: PageContext): Promise<{ rows: Row[]; scored: Scored[] }> {
  const rows: Row[] = [];
  let cursor: string | undefined;
  do {
    const page = await unwrap(BlyggerApi.listItems({ client: context.client, query: { status: 'public', limit: 100, ...(cursor ? { cursor } : {}) } }));
    for (const it of page.items) {
      const parsed = parseContent(it.contentMd);
      const claim = parsed.claims[0]?.value;
      if (!claim) continue;
      const found: Found = { claim, resolution: parsed.resolutions[0]?.value ?? null };
      rows.push({
        ...found,
        id: it.id,
        kind: it.kind,
        item: { version: it.version, revision: it.revision, status: it.status, dirty: it.dirty, pins: it.pins.map((p) => p.version) },
        changed: false,
        status: statusOf(found),
      });
    }
    cursor = page.page.nextCursor ?? undefined;
  } while (cursor);

  // Resolved claims are scored on the claim as first pinned.
  const scored: Scored[] = [];
  for (const row of rows) {
    if (row.status !== 'resolved' || !row.resolution) continue;
    let claim = row.claim;
    for (const v of [...row.item.pins].sort((a, b) => a - b)) {
      const version = await unwrap(BlyggerApi.getVersion({ client: context.client, path: { id: row.id, v } }));
      const pinned = parseContent(version.contentMd).claims[0]?.value;
      if (pinned) {
        row.changed = SAME.some((k) => JSON.stringify(pinned[k]) !== JSON.stringify(row.claim[k]));
        claim = pinned;
        break;
      }
    }
    scored.push(scoreClaim(claim, row.resolution));
  }
  rows.sort((a, b) => a.claim.resolves_by.localeCompare(b.claim.resolves_by));
  return { rows, scored };
}

export function ClaimsPage({ context }: { context: PageContext }) {
  const [data, setData] = useState<{ rows: Row[]; scored: Scored[] } | null>(null);
  const [error, setError] = useState<string>();
  const [resolving, setResolving] = useState<Row | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    loadRows(context).then(
      (d) => live && setData(d),
      (e: unknown) => {
        if (!live) return;
        setError(e instanceof Error ? e.message : String(e));
        context.showError(e);
      },
    );
    return () => {
      live = false;
    };
  }, [tick]);
  const reload = () => setTick((t) => t + 1);

  const pin = (row: Row) =>
    context.run(async () => {
      await unwrap(BlyggerApi.pinItem({ client: context.client, path: { id: row.id, version: row.item.version }, body: { expectedRevision: row.item.revision } }));
      toast(`Pinned version ${row.item.version}.`);
      reload();
    });

  if (error) return <p className="claims-stop claims-note">Could not read your claims: {error}</p>;
  if (!data) return <p className="hint">Reading your claims…</p>;
  const { rows, scored } = data;
  const sum = summarize(scored);
  const count = (s: Status[]) => rows.filter((r) => s.includes(r.status)).length;

  return (
    <div className="claims-page" data-extension-page="claims">
      <div className="claims-stats">
        <div>
          <b>{rows.length}</b>
          <span>claims</span>
        </div>
        <div data-tone={count(['due']) ? 'due' : undefined}>
          <b>{count(['due'])}</b>
          <span>due</span>
        </div>
        <div>
          <b>{count(['open'])}</b>
          <span>open</span>
        </div>
        <div>
          <b>{count(['resolved', 'void'])}</b>
          <span>resolved</span>
        </div>
        <div>
          <b>{sum.brier === null ? '—' : sum.brier.toFixed(3)}</b>
          <span>{sum.brier === null ? 'Brier: nothing scored yet' : `Brier, ${brierWords(sum.brier)}`}</span>
        </div>
      </div>
      {sum.brier !== null ? <p className="hint">Brier score over {sum.forecasts} forecasts: lower is better, and always saying 50% scores 0.250.{sum.rankings ? ` Rankings: ${Math.round((sum.rankingAccuracy ?? 0) * 100)}% of places right.` : ''}{sum.ranges ? ` Ranges: ${Math.round((sum.rangeHits ?? 0) * 100)}% landed inside.` : ''}</p> : null}
      {rows.some((r) => !r.item.pins.length && r.status !== 'record') ? <p className="claims-warn claims-note">◇ marks claims that are not pinned yet. Until they are, they can change without a trace, so readers won't count them.</p> : null}
      {!rows.length ? <p className="hint">No claims yet. Use “+ claim” in the composer to make one.</p> : null}

      {GROUPS.map(([title, statuses]) => {
        const list = rows.filter((r) => statuses.includes(r.status));
        if (!list.length) return null;
        return (
          <section key={title} className="claims-section">
            <h2>
              {title} <span className="n">{list.length}</span>
            </h2>
            <ul className="claims-list">
              {list.map((row) => (
                <li key={row.id} data-status={row.status}>
                  <div className="claims-line">
                    <span className="claims-mark" data-pinned={String(row.item.pins.length > 0)} title={row.item.pins.length ? `Pinned: version ${row.item.pins.join(', ')}` : 'Not pinned'}>
                      {row.item.pins.length ? '◆' : '◇'}
                    </span>
                    <button type="button" className="link-btn claims-title" onClick={() => void context.navigate({ to: '/edit/$id', params: { id: row.id } })}>
                      {row.claim.claim ?? '(no statement)'}
                    </button>
                  </div>
                  <div className="claims-meta">
                    <b>{sureOf(row.claim)}</b>
                    <span>{row.status === 'record' ? 'recorded for' : 'by'} {date(row.claim.resolves_by)}</span>
                    {row.resolution ? <span className="claims-outcome">{describeOutcome(row.resolution)}</span> : null}
                    {row.changed ? <span className="claims-changed">edited after pinning; the pinned claim is scored</span> : null}
                  </div>
                  <div className="claims-actions">
                    {row.status === 'due' || row.status === 'open' ? (
                      <Button className={`btn btn-compact ${row.status === 'due' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setResolving(row)}>
                        {row.status === 'due' ? 'Resolve' : 'Resolve early'}
                      </Button>
                    ) : null}
                    {!row.item.pins.length ? (
                      <Button className="btn btn-ghost btn-compact" onClick={() => void pin(row)}>
                        Pin version {row.item.version}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {resolving ? (
        <Sheet open onClose={() => setResolving(null)} title="Resolve claim" description={resolving.claim.claim}>
          <div className="claims-form" data-extension-sheet="claims-resolve">
            <ResolveForm context={{ client: context.client, id: resolving.id, showError: context.showError }} found={resolving} item={resolving.item} close={() => setResolving(null)} onDone={reload} />
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

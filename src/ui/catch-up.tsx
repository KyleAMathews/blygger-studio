/*
 * Catch up (the `catch-up` helper, src/helpers/catch-up.ts): a sheet that lays
 * an entry's nested quotes out oldest first, each card only that post's own
 * words. The same operation an agent calls (blygger-spec docs/helpers-plan.md).
 * After Burrow 0.23.0's Catch up (Aneesh Sathe). "summarize" asks the
 * catch-up-summary helper, a text model's few sentences, kept per set of
 * versions and marked as generated.
 */
import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { BlyggerApi, unwrap } from '../../sdk/dist/browser.js';
import { client } from './data.ts';
import { Button, Failure, Html, useSettings } from './components.tsx';
import { customSheet, Sheet } from './sheets.tsx';
import { formatDateIn } from '../dates.ts';

type CatchUp = Awaited<ReturnType<typeof load>>;
const load = (sub: string, remoteId: string) => unwrap(BlyggerApi.catchUp({ client, body: { sub, remoteId } }));
type Summary = Awaited<ReturnType<typeof summarize>>;
const summarize = (sub: string, remoteId: string) => unwrap(BlyggerApi.summarizeCatchUp({ client, body: { sub, remoteId } }));

/** The summary control: asked for, never automatic, since it spends the AI budget. */
function CatchUpSummary({ sub, remoteId }: { sub: string; remoteId: string }) {
  const [summary, setSummary] = useState<Summary>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  if (summary)
    return (
      <div className="catch-up-summary">
        <p className="assistant-said" data-generated="helper">{summary.summary}</p>
        <p className="hint">Summary by {summary.model}, generated{summary.cached ? ', kept from before' : ''}.</p>
      </div>
    );
  return (
    <div className="catch-up-summary">
      {error ? <Failure error={error} /> : null}
      <Button
        className="btn btn-ghost"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(undefined);
          summarize(sub, remoteId).then(setSummary, setError).finally(() => setBusy(false));
        }}
      >
        {busy ? 'summarizing…' : 'summarize'}
      </Button>
    </div>
  );
}

/** Whether an entry has anything to catch up on: a quote in its body. */
export const hasQuotes = (html: string) => html.includes('blyg-transclusion');

function CatchUpCards({ sub, remoteId, done }: { sub: string; remoteId: string; done: () => void }) {
  const settings = useSettings();
  const [result, setResult] = useState<CatchUp>();
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    let live = true;
    load(sub, remoteId).then((r) => live && setResult(r), (e) => live && setError(e));
    return () => {
      live = false;
    };
  }, [sub, remoteId]);
  if (error) return <Failure error={error} />;
  if (!result) return <p className="hint">Laying the conversation out…</p>;
  return (
    <>
      <p className="hint">
        {result.cards.length} posts, oldest first{result.ordered === 'depth' ? ' (by depth: some times are unknown here)' : ''}. Each shows only its own words.
      </p>
      {result.cards.length > 1 ? <CatchUpSummary sub={sub} remoteId={remoteId} /> : null}
      <ol className="catch-up" aria-label="the conversation, oldest first">
        {result.cards.map((card) => (
          <li key={`${card.origin}|${card.id}|${card.version}`} className="catch-up-card">
            <p className="catch-up-meta">
              {card.sub ? (
                <Link to="/reading/$sub/$id" params={{ sub: card.sub, id: card.id }} onClick={done}>{card.source}</Link>
              ) : (
                <span>{card.source}</span>
              )}
              {card.version ? ` · v${card.version}` : ''}
              {card.at ? ` · ${formatDateIn(card.at, settings?.timezone || 'UTC')}` : ''}
              {card.partial ? ' · excerpt' : ''}
              {card.label ? ` · “${card.label}”` : ''}
            </p>
            {card.html.trim() ? <div className="content catch-up-body"><Html html={card.html} /></div> : <p className="hint">Only quotes, no words of its own.</p>}
          </li>
        ))}
      </ol>
    </>
  );
}

export function openCatchUp(sub: string, remoteId: string) {
  return customSheet((done) => (
    <Sheet open onClose={done} title="Catch up" description="The conversation this entry carries, oldest first." className="sheet-catch-up">
      <CatchUpCards sub={sub} remoteId={remoteId} done={done} />
    </Sheet>
  ));
}

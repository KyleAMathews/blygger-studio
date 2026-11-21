// The reading view: a badge at the end of each byline whose entry carries a
// claim, and a sheet that shows the claim and, for your own, pins it and
// resolves it. Claims are read from the entry's HTML, so the badge costs no
// request; only your own entries are looked up, for their pins.

import { useEffect, useState } from 'react';
import { BlyggerApi, Button, Sheet, toast, unwrap } from '../../../src/ui/extension-api.ts';
import type { EntryAction, EntryContext } from '../../../src/ui/extension-api.ts';
import { fromHtml } from './blocks.ts';
import { describeCheck, sureOf, toMarkdown } from './core/compose.ts';
import { appendResolution, checkAnswer, describeOutcome, toResolution, type Answer } from './core/resolve.ts';
import { shapeOf } from './core/shapes.ts';
import type { ClaimBlock, ResolutionBlock } from './core/types.ts';

export type Status = 'open' | 'due' | 'resolved' | 'void' | 'record';
export interface Found {
  claim: ClaimBlock;
  resolution: ResolutionBlock | null;
}
/** What resolving needs: the item and the owner's client. An entry's context is one; so is the Claims page. */
export interface Target {
  client: EntryContext['client'];
  id: string;
  showError(error: unknown): void;
}
export interface OwnItem {
  version: number;
  revision: number;
  status: string;
  dirty: boolean;
  pins: number[];
}

const today = () => new Date().toISOString().slice(0, 10);
export const date = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function readClaim(context: EntryContext): Found | null {
  if (context.entry.withdrawn) return null;
  return fromHtml(context.entry.contentHtml);
}

export function statusOf({ claim, resolution }: Found): Status {
  if (resolution) return resolution.outcome === 'void' ? 'void' : 'resolved';
  if (shapeOf(claim as Record<string, unknown>) === 'record') return 'record';
  return claim.resolves_by <= today() ? 'due' : 'open';
}

const isOwn = (context: EntryContext) => context.entry.source === 'own' && !context.imported;

export async function loadOwn(context: Target): Promise<OwnItem> {
  const item = await unwrap(BlyggerApi.getItem({ client: context.client, path: { id: context.id } }));
  return { version: item.version, revision: item.revision, status: item.status, dirty: item.dirty, pins: item.pins.map((p) => p.version) };
}

/** Your own item's pins, fetched once per byline; null while loading or for someone else's entry. */
function useOwn(context: EntryContext, enabled: boolean): [OwnItem | null, () => void] {
  const [item, setItem] = useState<OwnItem | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadOwn(context).then(
      (i) => live && setItem(i),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [enabled, context.id, tick]);
  return [item, () => setTick((t) => t + 1)];
}

const LABEL: Record<Status, string> = { open: 'open', due: 'due', resolved: 'resolved', void: 'void', record: 'on record' };

export function ClaimBadge({ context }: { context: EntryContext }) {
  const found = readClaim(context);
  const own = isOwn(context);
  const [item, reload] = useOwn(context, !!found && own);
  if (!found) return null;
  const status = statusOf(found);
  const pinned = own ? (item ? item.pins.length > 0 : null) : context.entry.imported?.pinnedVersionRetained != null;
  const text =
    status === 'resolved' || status === 'void'
      ? `${describeOutcome(found.resolution!)}`
      : status === 'record'
        ? 'on record'
        : `${sureOf(found.claim)} · ${status === 'due' ? 'due now' : `by ${date(found.claim.resolves_by)}`}`;
  return (
    <button
      type="button"
      className="claims-badge"
      data-status={status}
      data-pinned={pinned === null ? undefined : String(pinned)}
      title={`Claim, ${LABEL[status]}${pinned === false ? ', not pinned' : pinned ? ', pinned' : ''}`}
      onClick={() => context.openSheet((close) => <ClaimView context={context} found={found} close={close} onChange={reload} />)}
    >
      <span aria-hidden="true">{pinned === null ? '·' : pinned ? '◆' : '◇'}</span> {text}
    </button>
  );
}

export function claimActions(context: EntryContext): EntryAction[] {
  const found = readClaim(context);
  if (!found) return [];
  const status = statusOf(found);
  const rows: EntryAction[] = [{ icon: '◆', label: 'claim', description: `${sureOf(found.claim)} · ${LABEL[status]}`, onSelect: () => context.openSheet((close) => <ClaimView context={context} found={found} close={close} />) }];
  if (isOwn(context) && (status === 'open' || status === 'due')) {
    rows.push({ icon: '✓', label: 'resolve claim', description: 'say how it turned out', onSelect: () => context.openSheet((close) => <ClaimView context={context} found={found} close={close} startResolving />) });
  }
  return rows;
}

function ClaimView({ context, found, close, startResolving, onChange }: { context: EntryContext; found: Found; close: () => void; startResolving?: boolean; onChange?: () => void }) {
  const own = isOwn(context);
  const status = statusOf(found);
  const [item, setItem] = useState<OwnItem | null>(null);
  const [resolving, setResolving] = useState(!!startResolving);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (own) loadOwn(context).then(setItem, (e: unknown) => setError(message(e)));
  }, []);
  const { claim, resolution } = found;
  const criteria = typeof claim.criteria === 'string' && claim.criteria.trim() ? claim.criteria : claim.check ? describeCheck(claim.check) : 'The author decides.';

  const pin = async () => {
    if (!item) return;
    setBusy(true);
    setError(undefined);
    try {
      await unwrap(BlyggerApi.pinItem({ client: context.client, path: { id: context.id, version: item.version }, body: { expectedRevision: item.revision } }));
      setItem(await loadOwn(context));
      onChange?.();
      toast(`Pinned version ${item.version}.`);
    } catch (e) {
      setError(message(e));
      context.showError(e);
    } finally {
      setBusy(false);
    }
  };

  const forecastToo = () => {
    close();
    // A fork records where the forecast came from (forked_from), so readers can group
    // every forecast on the same claim. The draft copy is the fallback where Studio
    // offers no fork for this entry.
    if (context.actions.fork) return context.actions.fork();
    const copy: ClaimBlock = { ...claim };
    const md = `${context.url ? `Forecasting this too: ${context.url}\n\n` : ''}${toMarkdown(copy)}`;
    void context.run(() => context.openDraft({ kind: 'fragment', contentMd: md }));
  };

  return (
    <Sheet open onClose={close} title={resolving ? 'Resolve claim' : 'Claim'} description={found.claim.claim}>
      <div className="claims-form claims-view" data-extension-sheet="claims-view">
        {resolving && item ? (
          <ResolveForm context={context} found={found} item={item} close={close} onDone={onChange} />
        ) : (
          <>
            <dl className="claims-facts">
              <div>
                <dt>How sure</dt>
                <dd className="claims-big">{sureOf(claim)}</dd>
              </div>
              <div>
                <dt>{status === 'record' ? 'Recorded for' : 'Known by'}</dt>
                <dd>{date(claim.resolves_by)}</dd>
              </div>
              <div>
                <dt>Checked by</dt>
                <dd>{criteria}</dd>
              </div>
              {resolution ? (
                <div>
                  <dt>Outcome</dt>
                  <dd>
                    <b>{describeOutcome(resolution)}</b>
                    {resolution.evidence?.length ? (
                      <>
                        {' · '}
                        {resolution.evidence.filter((u) => /^https?:\/\//.test(u)).map((u) => (
                          <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                            evidence
                          </a>
                        ))}
                      </>
                    ) : null}
                  </dd>
                </div>
              ) : null}
            </dl>

            {own ? (
              item ? (
                item.pins.length ? (
                  <p className="claims-ok">Pinned (version {item.pins.join(', ')}). The earliest pinned version with this claim is the one that counts.</p>
                ) : (
                  <div className="claims-warn claims-note">
                    Not pinned yet, so you can still change it and nobody could tell. Pin it to make it count.
                    {item.status === 'public' ? (
                      <Button className="btn btn-primary btn-compact" disabled={busy} onClick={() => void pin()}>
                        Pin version {item.version}
                      </Button>
                    ) : (
                      <span> Publish it first.</span>
                    )}
                  </div>
                )
              ) : (
                <p className="hint">…</p>
              )
            ) : context.entry.imported?.pinnedVersionRetained != null ? (
              <p className="claims-ok">Pinned by its author.</p>
            ) : (
              <p className="claims-warn claims-note">Not pinned by its author yet.</p>
            )}
            {error ? <p className="claims-stop claims-note">{error}</p> : null}

            <div className="sheet-actions">
              {own && (status === 'open' || status === 'due') ? (
                <Button className={`btn ${status === 'due' ? 'btn-primary' : 'btn-ghost'}`} disabled={!item} onClick={() => setResolving(true)}>
                  {status === 'due' ? 'Resolve' : 'Resolve early'}
                </Button>
              ) : null}
              {!own && status !== 'resolved' && status !== 'void' ? (
                <Button className="btn btn-ghost" onClick={forecastToo}>
                  Forecast this too
                </Button>
              ) : null}
              <Button className="btn btn-ghost" onClick={close}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

export function ResolveForm({ context, found, item, close, onDone }: { context: Target; found: Found; item: OwnItem; close: () => void; onDone?: () => void }) {
  const { claim } = found;
  const shape = shapeOf(claim as Record<string, unknown>);
  const [choice, setChoice] = useState<'yes' | 'no' | 'void' | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [value, setValue] = useState('');
  const [evidence, setEvidence] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const answer: Answer | null =
    choice === 'void' ? { kind: 'void', note } : shape === 'binary' ? (choice ? { kind: 'binary', outcome: choice === 'yes' } : null) : shape === 'choice' ? (labels.length ? { kind: 'choice', labels } : null) : shape === 'quantity' ? (value.trim() ? { kind: 'quantity', value: Number(value) } : null) : null;
  const problems = answer ? checkAnswer(claim, answer, evidence) : ['Choose what happened.'];

  const toggle = (label: string) => {
    setChoice(null);
    if (claim.pick === 'one') return setLabels(labels[0] === label ? [] : [label]);
    setLabels(labels.includes(label) ? labels.filter((l) => l !== label) : [...labels, label]);
  };

  const publish = async () => {
    setTried(true);
    if (problems.length || !answer) return;
    setBusy(true);
    setError(undefined);
    try {
      const r = toResolution(answer, evidence, today(), note);
      const now = await unwrap(BlyggerApi.getItem({ client: context.client, path: { id: context.id } }));
      if (now.dirty) throw new Error('This post has unpublished edits. Publish or discard them first, so they are not published with your resolution.');
      let revision = now.revision;
      // A claim resolved without ever being pinned: pin it as it stands first, so the claim keeps its own date.
      if (!now.pins.length && now.status === 'public') {
        revision = (await unwrap(BlyggerApi.pinItem({ client: context.client, path: { id: context.id, version: now.version }, body: { expectedRevision: revision } }))).revision;
      }
      const updated = await unwrap(BlyggerApi.updateItem({ client: context.client, path: { id: context.id }, body: { contentMd: appendResolution(now.contentMd, r), expectedRevision: revision } }));
      const published = await unwrap(BlyggerApi.publishItem({ client: context.client, path: { id: context.id }, body: { expectedRevision: updated.revision, note: `Resolved: ${describeOutcome(r)}` } }));
      await unwrap(BlyggerApi.pinItem({ client: context.client, path: { id: context.id, version: published.version }, body: { expectedRevision: published.revision } }));
      toast(`Resolved: ${describeOutcome(r)}. Published and pinned as version ${published.version}.`);
      onDone?.();
      close();
    } catch (e) {
      setError(message(e));
      context.showError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {shape === 'binary' ? (
        <div className="claims-group" role="group" aria-label="What happened">
          <span className="claims-label">What happened?</span>
          <div className="segmented claims-wrap">
            {(['yes', 'no', 'void'] as const).map((v) => (
              <button key={v} type="button" className="seg" aria-pressed={choice === v} onClick={() => setChoice(v)}>
                {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : "Can't tell"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {shape === 'choice' ? (
        <div className="claims-group" role="group" aria-label="What happened">
          <span className="claims-label">{claim.pick === 'one' ? 'What happened?' : claim.pick === 'order' ? `The top ${claim.size}, in order: tap them in order` : `The ${claim.size} that made it`}</span>
          <div className="segmented claims-wrap">
            {(claim.outcomes ?? []).map((o) => {
              const at = labels.indexOf(o.label);
              return (
                <button key={o.label} type="button" className="seg" aria-pressed={at >= 0} onClick={() => toggle(o.label)}>
                  {at >= 0 && claim.pick === 'order' ? `${at + 1}. ` : ''}
                  {o.label}
                </button>
              );
            })}
            <button type="button" className="seg seg-dashed" aria-pressed={choice === 'void'} onClick={() => (setLabels([]), setChoice('void'))}>
              Can't tell
            </button>
          </div>
        </div>
      ) : null}
      {shape === 'quantity' ? (
        <div className="claims-row">
          <label className="claims-inline">
            The real number <input type="number" step="any" className="claims-num" value={value} onChange={(e) => (setChoice(null), setValue(e.target.value))} /> {claim.unit ?? ''}
          </label>
          <button type="button" className="link-btn" onClick={() => setChoice('void')}>
            can't tell
          </button>
        </div>
      ) : null}

      {choice === 'void' ? (
        <label className="field">
          <span>Why can't it be decided?</span>
          <input type="text" value={note} placeholder={claim.voids_if ? `e.g. ${claim.voids_if}` : 'e.g. the source stopped publishing'} onChange={(e) => setNote(e.target.value)} />
          {claim.voids_if ? <p className="hint">You wrote that it is cancelled if: {claim.voids_if}</p> : null}
        </label>
      ) : (
        <label className="field">
          <span>Evidence</span>
          <input type="url" value={evidence} placeholder="a link that shows the outcome" onChange={(e) => setEvidence(e.target.value)} />
        </label>
      )}
      {claim.check && 'evidence' in claim.check && claim.check.evidence ? <p className="hint">You said to look at: {claim.check.evidence}</p> : null}

      {tried && problems.length ? (
        <ul className="claims-mistakes" aria-live="polite">
          {problems.map((p) => (
            <li key={p} className="claims-stop">
              {p}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="claims-stop claims-note">{error}</p> : null}
      <p className="hint">Your answer is added to the post as a new version, published and pinned. The claim stays exactly as you wrote it{item.pins.length ? '' : `, and version ${item.version} is pinned first so the claim keeps its own date`}.</p>
      <div className="sheet-actions">
        <Button className="btn btn-primary" disabled={busy} onClick={() => void publish()}>
          {busy ? 'Publishing…' : 'Publish resolution'}
        </Button>
        <Button className="btn btn-ghost" onClick={close}>
          Cancel
        </Button>
      </div>
    </>
  );
}

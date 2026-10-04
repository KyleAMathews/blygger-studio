import { readingPage } from '../paging.ts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { Link, useNavigate } from '@tanstack/react-router';
import type {
  CreateItemData,
  ListReadingResponses,
} from '../../sdk/dist/browser.js';
import { BlyggerApi, unwrap } from '../../sdk/dist/browser.js';
import type { Reading } from './data.ts';
import {
  readingView,
  subscriptions,
  hoppers,
  signals,
  client,
  changed,
  queryClient,
  refreshReading,
} from './data.ts';
import { Button, Failure, mount, usePoll, useSettings } from './components.tsx';
import { prompt } from './sheets.tsx';
import { displayUrl } from '../importer/util.ts';
import { formatDateIn } from '../dates.ts';
import { AddFeedForm } from './catalog.tsx';
import { diffText, type DiffOp } from '../word-diff.ts';

function Copy({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);
  return (
    <>
      <Button
        className="entry-copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          } catch {
            setFallback(true);
          }
        }}
      >
        {copied ? 'copied' : label}
      </Button>
      {fallback ? (
        <input
          className="copy-fallback"
          aria-label="copy text"
          readOnly
          value={text}
          ref={(element) => element?.select()}
        />
      ) : null}
    </>
  );
}
function Body({ html, url, l0 }: { html: string; url?: string; l0: boolean }) {
  const [expanded, setExpanded] = useState(false),
    [overflow, setOverflow] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const content = useMemo(() => {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const first = parsed.body.firstElementChild;
    let title: string | undefined;
    if (
      first &&
      (/^H[1-6]$/.test(first.tagName) ||
        (l0 &&
          first.tagName === 'P' &&
          first.children.length === 1 &&
          first.firstElementChild?.tagName === 'A'))
    ) {
      title = first.textContent || undefined;
      first.remove();
    }
    return { title, html: parsed.body.innerHTML };
  }, [html, l0]);
  useEffect(() => {
    const element = body.current;
    if (!element) return;
    const measure = () =>
      setOverflow(element.scrollHeight > element.clientHeight + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [content.html]);
  return (
    <>
      {content.title ? (
        <p className="entry-title">
          {url ? (
            <a href={url} target="_blank" rel="noreferrer">
              {content.title}
            </a>
          ) : (
            content.title
          )}
        </p>
      ) : null}
      <div
        ref={body}
        className={`content ${expanded ? '' : 'clamped'}`}
        dangerouslySetInnerHTML={{ __html: content.html }}
      />
      {overflow && !expanded ? (
        <Button className="link expand-btn" onClick={() => setExpanded(true)}>
          more
        </Button>
      ) : null}
    </>
  );
}
function canLink(entry: Reading) {
  return (
    !entry.l0 &&
    (entry.own
      ? !entry.withdrawn
      : !entry.withdrawn || entry.imported?.pinnedVersionRetained != null)
  );
}

function selectedTextInEntry(key: string) {
  const selected = window.getSelection();
  const start = selected?.anchorNode?.parentElement?.closest('.content');
  const end = selected?.focusNode?.parentElement?.closest('.content');
  if (
    !selected?.toString().trim() ||
    start !== end ||
    start?.closest('[data-key]')?.getAttribute('data-key') !== key
  ) {
    throw new Error('Select text in this entry to quote first.');
  }
  return selected.toString();
}

export function ReadingPage({ sub, offset }: { sub: string; offset: number }) {
  const [error, setError] = useState<unknown>();
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const navigate = useNavigate();
  const settings = useSettings();
  const entries = useLiveQuery(readingView(sub, offset));
  const sources =
    useLiveQuery({ query: (q) => q.from({ source: subscriptions }) }).data ??
    [];
  const buckets =
    useLiveQuery({ query: (q) => q.from({ hopper: hoppers }) }).data ?? [];
  const votes =
    useLiveQuery({ query: (q) => q.from({ signal: signals }) }).data ?? [];
  const refresh = useMemo(
    () => () => refreshReading(sub, offset),
    [sub, offset],
  );
  usePoll(`reading:${sub}:${offset}`, refresh);
  usePoll('subscriptions', subscriptions.utils.refetch);
  usePoll('hoppers', hoppers.utils.refetch);
  usePoll('signals', signals.utils.refetch);
  const metadata = queryClient
    .getQueriesData<ListReadingResponses[200]>({ queryKey: ['reading', sub] })
    .map(([, value]) => value)
    .find((value) => value?.offset === offset);
  const run = async (action: () => Promise<unknown>) => {
    setError(undefined);
    try {
      await action();
    } catch (error) {
      setError(error);
    }
  };
  const openDraft = async (body: CreateItemData['body']) => {
    const created = await unwrap(BlyggerApi.createItem({ client, body }));
    await changed('items');
    await navigate({ to: '/edit/$id', params: { id: created.id } });
  };
  const selectedSource = sources.find((source) => source.id === sub);
  const sourceName =
    sub === 'all'
      ? 'all'
      : sub === 'own'
        ? 'my blyg'
        : selectedSource?.title || selectedSource?.origin || 'all';
  const date = (iso: string) => formatDateIn(iso, settings?.timezone || 'UTC');

  return (
    <>
      <Failure error={error} />
      <Button
        className="sources-toggle"
        aria-expanded={sourcesOpen}
        aria-controls="reading-sidebar"
        onClick={() => setSourcesOpen((value) => !value)}
      >
        sources · <span className="current-source">{sourceName}</span>
      </Button>
      <div className="reading-layout">
        <aside
          id="reading-sidebar"
          className={`reading-sidebar ${sourcesOpen ? 'open' : ''}`}
        >
          <div className="add-feed">
            <AddFeedForm />
          </div>
          <h2>sources</h2>
          <ul>
            {[
              ['all', 'all'],
              ['own', 'my blyg'],
              ...sources.map((source) => [
                source.id,
                source.title || source.origin,
              ]),
            ].map(([id, label]) => (
              <li key={id}>
                <Link
                  to="/reading"
                  search={{ sub: id, offset: 0 }}
                  className={sub === id ? 'current' : ''}
                  onClick={() => setSourcesOpen(false)}
                >
                  <span className="feed-name">{label}</span>
                  <span className="feed-count">
                    {id === 'all'
                      ? metadata?.counts.all
                      : id === 'own'
                        ? metadata?.counts.own
                        : (metadata?.counts.subscriptions[id] ?? 0)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="manage">
            <Link to="/subs">manage feeds</Link>
          </p>
        </aside>
        <section className="reading-main">
          {entries.isLoading ? <p>Loading reading…</p> : null}
          {entries.data?.map((entry) => {
            const imported = entry.imported;
            const id = entry.own?.id || imported!.remoteId;
            const url = entry.own
              ? !entry.withdrawn
                ? `${location.origin}${mount}/${
                    entry.kind === 'thread' ? 't' : 'f'
                  }/${id}/`
                : undefined
              : imported?.sourceUrl || undefined;
            const source = imported
              ? {
                  subscription_id: imported.subscriptionId,
                  remote_id: imported.remoteId,
                }
              : undefined;
            const signal = votes.find(
              (vote) =>
                vote.subscription_id === imported?.subscriptionId &&
                vote.remote_id === imported.remoteId,
            );
            return (
              <article
                className="reading-entry"
                key={entry.key}
                data-key={entry.key}
              >
                <p className="byline">
                  <span className="kind-chip">{entry.kind}</span>
                  {entry.l0 ? (
                    <span className="l0-chip">legacy rss</span>
                  ) : null}
                  {imported?.subscriptionTitle || 'you'} ·{' '}
                  {date(entry.displayAt)}
                  {canLink(entry) ? (
                    <Copy text={`[[${id}]]`} label="copy [[id]]" />
                  ) : null}
                  {url ? (
                    <>
                      <Copy text={url} label="copy url" />
                      <a
                        className="entry-open"
                        href={url}
                        title={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {displayUrl(url)} ↗
                      </a>
                    </>
                  ) : null}
                </p>
                {entry.withdrawn ? (
                  <p className="withdrawn">
                    withdrawn
                    {imported?.pinnedVersionRetained != null
                      ? ` · retained pinned v${imported.pinnedVersionRetained}`
                      : ''}
                  </p>
                ) : null}
                <Body html={entry.contentHtml} url={url} l0={entry.l0} />
                <div className="entry-actions">
                  {entry.own ? (
                    <Link to="/edit/$id" params={{ id }}>
                      edit
                    </Link>
                  ) : null}
                  {canLink(entry) ? (
                    <Button
                      className="stub-btn"
                      data-action="link-post"
                      onClick={() =>
                        void run(() =>
                          openDraft({
                            content_md: `[[${id}]]\n\n`,
                            kind: 'fragment',
                          }),
                        )
                      }
                    >
                      link post ↗
                    </Button>
                  ) : null}
                  {imported && source ? (
                    <>
                      <Button
                        className="stub-btn"
                        data-action="stub"
                        data-sub={imported.subscriptionId}
                        data-remote={imported.remoteId}
                        onClick={() =>
                          void run(() =>
                            openDraft({ mode: 'response', source }),
                          )
                        }
                      >
                        stub ↗
                      </Button>
                      {!entry.l0 && canLink(entry) ? (
                        <>
                          <Button
                            className="stub-btn"
                            data-action="quote-selection"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() =>
                              void run(async () => {
                                await openDraft({
                                  mode: 'response',
                                  source,
                                  selection: selectedTextInEntry(entry.key),
                                });
                              })
                            }
                          >
                            quote selection
                          </Button>
                          <Link
                            to="/fork"
                            search={{ id, sub: imported.subscriptionId }}
                          >
                            fork
                          </Link>
                        </>
                      ) : null}
                      <select
                        aria-label="add to hopper"
                        value=""
                        onChange={(event) => {
                          const selected = event.target.value;
                          if (selected)
                            void run(async () => {
                              let hopperId = selected;
                              if (selected === '__new__') {
                                const name = await prompt({
                                  title: 'Name the new hopper:',
                                });
                                if (!name?.trim()) return;
                                const hopper = await unwrap(
                                  BlyggerApi.createHopper({
                                    client,
                                    body: { name },
                                  }),
                                );
                                hopperId = hopper.id;
                              }
                              await unwrap(
                                BlyggerApi.addHopperItem({
                                  client,
                                  path: {
                                    id: hopperId,
                                    sub: imported.subscriptionId,
                                    remoteId: id,
                                  },
                                }),
                              );
                              await changed('hoppers', 'hopper');
                            });
                        }}
                      >
                        <option value="">+ add to hopper…</option>
                        {buckets.map((bucket) => (
                          <option key={bucket.id} value={bucket.id}>
                            {bucket.name}
                          </option>
                        ))}
                        <option value="__new__">new hopper…</option>
                      </select>
                      {([1, -1] as const).map((thumb) => (
                        <Button
                          key={thumb}
                          className={signal?.thumb === thumb ? 'active' : ''}
                          aria-pressed={signal?.thumb === thumb}
                          onClick={() =>
                            void run(async () => {
                              const path = {
                                sub: imported.subscriptionId,
                                remoteId: id,
                              };
                              if (signal?.thumb === thumb)
                                await unwrap(
                                  BlyggerApi.deleteSignal({ client, path }),
                                );
                              else
                                await unwrap(
                                  BlyggerApi.setSignal({
                                    client,
                                    path,
                                    body: { thumb },
                                  }),
                                );
                              await changed('signals');
                            })
                          }
                        >
                          {thumb === 1 ? '👍' : '👎'}
                        </Button>
                      ))}
                    </>
                  ) : null}
                </div>
                {imported && !entry.l0 ? (
                  <History sub={imported.subscriptionId} id={id} />
                ) : null}
              </article>
            );
          })}
          {!entries.isLoading && !entries.data?.length ? (
            <p>No items yet.</p>
          ) : null}
          <div className="reading-pager">
            <Button
              disabled={offset === 0}
              onClick={() =>
                void navigate({
                  to: '/reading',
                  search: { sub, offset: offset - 25 },
                })
              }
            >
              newer
            </Button>
            <span className="pager-info">
              page {offset / 25 + 1} of{' '}
              {readingPage(String(offset / 25 + 1), metadata?.total ?? 0).pages}
            </span>
            <Button
              disabled={!metadata || offset + 25 >= metadata.total}
              onClick={() =>
                void navigate({
                  to: '/reading',
                  search: { sub, offset: offset + 25 },
                })
              }
            >
              older
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}

type ImportedHistory = Awaited<ReturnType<typeof loadHistory>>;
const loadHistory = (sub: string, id: string) =>
  unwrap(BlyggerApi.getImportedHistory({ client, path: { sub, id } }));
const loadVersion = (sub: string, id: string, v: number) =>
  unwrap(BlyggerApi.getImportedVersion({ client, path: { sub, id, v } }));
/**
 * An imported item's history (#40): its notes as a timeline, read from the
 * origin, and "see the change" only between versions the origin serves
 * publicly — adjacent pins, and the last pin against the current version.
 * Unpinned history is withheld at the source; nothing here offers it.
 */
function History({ sub, id }: { sub: string; id: string }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ImportedHistory>();
  const [diff, setDiff] = useState<{ from: number; to: number; ops: DiffOp[] }>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const settings = useSettings();
  const when = (iso: string) => (iso ? formatDateIn(iso, settings?.timezone || 'UTC') : '');
  const toggle = async () => {
    if (open) return setOpen(false);
    setOpen(true);
    if (history) return;
    setError(undefined);
    try {
      setHistory(await loadHistory(sub, id));
    } catch (e) {
      setError(e);
    }
  };
  const compare = async (from: number, to: number) => {
    setBusy(true);
    setError(undefined);
    try {
      const [a, b] = await Promise.all([loadVersion(sub, id, from), loadVersion(sub, id, to)]);
      setDiff({ from, to, ops: diffText(a.content_md, b.content_md) });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  // The versions whose text is public, in order: every pin, then the current
  // version unless the item is withdrawn.
  const publicVersions = history
    ? [
        ...new Set([
          ...history.changelog.filter((e) => e.pinned).map((e) => e.version),
          ...(history.withdrawn ? [] : [history.current]),
        ]),
      ].sort((a, b) => a - b)
    : [];
  const previousPublic = (v: number) => {
    const i = publicVersions.indexOf(v);
    return i > 0 ? publicVersions[i - 1] : undefined;
  };
  return (
    <div className="entry-history">
      <Button
        className="link"
        data-action="history"
        aria-expanded={open}
        onClick={() => void toggle()}
      >
        {open ? 'hide history' : 'history'}
      </Button>
      {open ? (
        <>
          <Failure error={error} />
          {history ? (
            <ol className="h-list">
              {history.changelog.map((e) => {
                const prev = previousPublic(e.version);
                return (
                  <li className="h-row" key={e.version}>
                    <strong>v{e.version}</strong>{' '}
                    <span className="h-hint">{when(e.at)}</span>{' '}
                    {e.note ?? <span className="h-hint">(no note)</span>}
                    {e.generated ? (
                      <span className="tc-chip" title="note drafted by the publisher's studio">
                        generated
                      </span>
                    ) : null}
                    {e.pinned ? <span className="tc-chip">📌 pinned</span> : null}
                    {prev !== undefined ? (
                      <Button
                        className="link"
                        data-action="see-change"
                        disabled={busy}
                        onClick={() => void compare(prev, e.version)}
                      >
                        see the change v{prev} → v{e.version}
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : !error ? (
            <p className="h-hint">Loading history from the origin…</p>
          ) : null}
          {diff ? (
            <div className="entry-diff" aria-label={`changes from v${diff.from} to v${diff.to}`}>
              <p className="h-hint">
                v{diff.from} → v{diff.to}, as published (markdown source)
              </p>
              <pre>
                {diff.ops.map((op, i) =>
                  op.op === 'eq' ? (
                    <span key={i}>{op.text}</span>
                  ) : op.op === 'del' ? (
                    <del key={i}>{op.text}</del>
                  ) : (
                    <ins key={i}>{op.text}</ins>
                  ),
                )}
              </pre>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

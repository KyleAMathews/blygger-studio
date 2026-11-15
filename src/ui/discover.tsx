/*
 * Discover (ROADMAP row 17): the blygs listed on blygger.com, new since last
 * time or all of them, each with its activity, a preview link and its
 * subscribe state. Subscribing, one or a ticked batch, is the OPML import's
 * paced walk (opml.ts), so the owner's write budget and the next poll's
 * backfill work the same way. Nothing here is published, and nothing reaches
 * the public blogroll unless the box is ticked.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { settings as settingsCollection, subscriptions } from './data.ts';
import { importFeeds } from './server-mutations.ts';
import { Button, Failure, mount, useSettings } from './components.tsx';
import { Sheet, toast } from './sheets.tsx';
import { subscribedKeys, type ImportSummary, type OpmlFeed, type RowStatus } from './opml.ts';
import { DIRECTORY_URL, activityLine, isNew, isSelf, isSubscribed, nextSeenAt, parseDirectory, type DirectoryBlyg } from './discover.ts';

type View = 'new' | 'all';

function statusBadge(status: RowStatus | undefined, subscribed: boolean) {
  switch (status?.state) {
    case 'working':
      return <span className="badge badge-pencil">adding…</span>;
    case 'added':
      return <span className="badge badge-ok">added</span>;
    case 'exists':
      return <span className="badge badge-line">subscribed</span>;
    case 'failed':
      return <span className="badge badge-alert">failed</span>;
    case 'stopped':
      return <span className="badge">not added</span>;
  }
  return subscribed ? <span className="badge badge-line">subscribed</span> : null;
}

const levelClass = { high: 'badge-ok', medium: 'badge-pencil', low: 'badge' } as const;

export function DiscoverSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useSettings();
  const current = useLiveQuery({ query: (q) => q.from({ source: subscriptions }) }).data ?? [];
  const keys = useMemo(() => subscribedKeys(current), [current]);
  const [blygs, setBlygs] = useState<DirectoryBlyg[]>();
  const [error, setError] = useState<unknown>();
  // The seen mark as it stood when this visit began: "new" stays put while the sheet is open.
  const [baseline, setBaseline] = useState<string>();
  const [view, setView] = useState<View>('new');
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [rows, setRows] = useState<Record<string, RowStatus>>({});
  const [blogroll, setBlogroll] = useState(false);
  const [running, setRunning] = useState(false);
  const stop = useRef(false);
  const visible = useRef(open);
  visible.current = open;
  const ownOrigin = `${location.origin}${mount}/`;

  useEffect(() => {
    if (!open || !settings || blygs) return;
    let gone = false;
    const seen = settings.discoverSeenAt;
    setBaseline(seen);
    (async () => {
      try {
        const res = await fetch(DIRECTORY_URL, { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(`blygger.com answered ${res.status}. Try again in a moment.`);
        const listed = parseDirectory(await res.json()).filter((b) => !isSelf(b, ownOrigin));
        if (gone) return;
        setBlygs(listed);
        if (!listed.some((b) => isNew(b, seen))) setView('all');
        const next = nextSeenAt(listed, seen);
        if (next !== seen) {
          await settingsCollection.update('settings', (row) => {
            row.discoverSeenAt = next;
          }).when('settled');
        }
      } catch (failure) {
        if (!gone) setError(failure instanceof TypeError ? new Error('Could not reach blygger.com.') : failure);
      }
    })();
    return () => {
      gone = true;
    };
  }, [open, settings, blygs, ownOrigin]);

  const close = () => {
    // A running batch keeps going behind the sheet; otherwise the next visit reads the directory afresh.
    if (!running) {
      setBlygs(undefined);
      setError(undefined);
      setPicked(new Set());
      setRows({});
      setView('new');
    }
    onClose();
  };

  const fresh = blygs?.filter((b) => baseline !== undefined && isNew(b, baseline)) ?? [];
  const shown = view === 'new' ? fresh : blygs ?? [];
  const followed = (b: DirectoryBlyg) => isSubscribed(b, keys) || rows[b.origin]?.state === 'added';
  const chosen = shown.filter((b) => picked.has(b.origin) && !followed(b));

  const subscribe = async (list: DirectoryBlyg[]) => {
    if (!list.length) return;
    stop.current = false;
    setError(undefined);
    setRunning(true);
    const feeds: OpmlFeed[] = list.map((b) => ({ title: b.title, xmlUrl: b.origin, htmlUrl: b.home }));
    let result: ImportSummary | undefined;
    try {
      result = await importFeeds({
        feeds,
        known: (feed) => list.some((b) => b.origin === feed.xmlUrl && isSubscribed(b, keys)),
        blogroll,
        onRow: (i, status) => setRows((prev) => ({ ...prev, [list[i].origin]: status })),
        onImported: (imported) => {
          result = imported;
        },
        shouldStop: () => stop.current,
      });
      setPicked((prev) => new Set([...prev].filter((origin) => !list.some((b) => b.origin === origin))));
      const told = `${result.added} subscribed${result.failed ? `, ${result.failed} failed` : ''}`;
      toast(visible.current ? told : `Discover: ${told}`);
    } catch (failure) {
      setError(failure);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title="discover blygs" className="opml-import discover">
      <Failure error={error} />
      {!blygs && !error ? <p className="sheet-body" role="status">Reading the directory at blygger.com…</p> : null}
      {blygs ? (
        <>
          <div className="segmented compact" role="group" aria-label="show">
            {(['new', 'all'] as const).map((v) => (
              <Button key={v} className={view === v ? 'seg is-active' : 'seg'} aria-pressed={view === v} data-view={v} onClick={() => setView(v)}>
                {v} <span className="n">{v === 'new' ? fresh.length : blygs.length}</span>
              </Button>
            ))}
          </div>
          <p className="opml-head">
            {view === 'new'
              ? baseline
                ? 'Listed on blygger.com since you last looked.'
                : 'Everything listed on blygger.com: you have not looked before.'
              : 'Every blyg listed on blygger.com, most active first.'}
          </p>
          {shown.length ? (
            <ul className="opml-list discover-list" aria-label="blygs listed on blygger.com">
              {shown.map((b) => {
                const isFollowed = followed(b);
                const status = rows[b.origin];
                return (
                  <li key={b.origin} className="opml-row" data-state={status?.state ?? (isFollowed ? 'exists' : 'pending')} data-origin={b.origin}>
                    <input
                      type="checkbox"
                      aria-label={`choose ${b.title}`}
                      checked={!isFollowed && picked.has(b.origin)}
                      disabled={isFollowed || running}
                      onChange={(event) => {
                        const next = new Set(picked);
                        if (event.target.checked) next.add(b.origin);
                        else next.delete(b.origin);
                        setPicked(next);
                      }}
                    />
                    <span className="opml-text">
                      <span className="opml-title">{b.title}</span>
                      <span className="opml-url">{new URL(b.home).host + new URL(b.home).pathname.replace(/\/$/, '')}</span>
                      <span className="discover-activity">
                        {b.activity.level ? <span className={`badge ${levelClass[b.activity.level]}`}>{b.activity.level}</span> : null}{' '}
                        {activityLine(b, Date.now())}
                      </span>
                      {status?.state === 'failed' ? <span className="opml-reason">{status.reason}</span> : null}
                    </span>
                    <a className="link-btn discover-preview" href={b.home} target="_blank" rel="noreferrer" aria-label={`preview ${b.title} in a new tab`}>
                      preview ↗
                    </a>
                    {statusBadge(status, isFollowed) ?? (
                      <Button className="btn btn-ghost discover-one" disabled={running} onClick={() => void subscribe([b])} aria-label={`subscribe to ${b.title}`}>
                        subscribe
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="sheet-body">
              Nothing new since you last looked.{' '}
              <Button className="link" onClick={() => setView('all')}>
                show all {blygs.length}
              </Button>
            </p>
          )}
          <label className="check">
            <input type="checkbox" checked={blogroll} disabled={running} onChange={(event) => setBlogroll(event.target.checked)} />
            <span>
              add new subscriptions to my blogroll
              <span className="hint">
                Lists them in your public <code>blogroll.opml</code>. You can change each one later.
              </span>
            </span>
          </label>
          <div className="sheet-actions">
            {running ? (
              <Button className="btn btn-ghost" onClick={() => { stop.current = true; }}>
                stop after this one
              </Button>
            ) : (
              <>
                <Button id="discover-subscribe" className="btn btn-primary" disabled={!chosen.length} onClick={() => void subscribe(chosen)}>
                  subscribe to {chosen.length} chosen
                </Button>
                <Button
                  className="btn btn-ghost"
                  disabled={!shown.some((b) => !followed(b))}
                  onClick={() => setPicked(new Set(shown.filter((b) => !followed(b)).map((b) => b.origin)))}
                >
                  choose all {shown.filter((b) => !followed(b)).length}
                </Button>
              </>
            )}
          </div>
          <p className="hint">
            Blygs are added one at a time, about one a second. Their posts arrive with the next
            scheduled poll, within a quarter of an hour.
          </p>
        </>
      ) : null}
    </Sheet>
  );
}

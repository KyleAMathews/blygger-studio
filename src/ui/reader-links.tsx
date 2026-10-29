/*
 * Browsing the thicket from inside the reader (0.49.0).
 *
 * An entry's body is stored HTML. Two kinds of thing in it lead to other blyg
 * items, and this module makes both open in the reader instead of leaving it:
 *
 *  - every baked quote (`blockquote.blyg-transclusion`), at any depth, names
 *    its source in `data-blyg-id` / `data-blyg-origin` (§10.2; an absent
 *    origin means the origin of the layer that baked it, so it is carried
 *    down the tree). Each layer gets a line saying whose it is, with a link
 *    that opens that item. The deep layers are where a stub stack lives;
 *  - every ordinary link is asked of the server (`classifyLinks`): the ones
 *    that name a blyg item open in the reader, the rest stay links.
 *
 * What opens: an item we hold opens at its own address, an item of a blyg we
 * do not subscribe to opens at /peek, fetched from its origin. Either way the
 * step is recorded on the trail (browse.ts) so back retraces it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { useNavigate } from '@tanstack/react-router';
import { BlyggerApi, unwrap } from '../../sdk/dist/browser.js';
import type { ListBrowseResponses } from '../../sdk/dist/browser.js';
import { client, subscriptions } from './data.ts';
import { Button, Failure, mount } from './components.tsx';
import { Sheet, confirm } from './sheets.tsx';
import { Back } from './icons.tsx';
import type { Via } from './browse.ts';
import { endTrail, follow, popTo, useTrail, viaWord } from './browse.ts';

/** The sub segment of an own item's address; see reading.tsx. */
export const OWN = '~own';
/** This blyg's own origin, in the spelling origins are compared in (trailing slash). */
export const ownOrigin = () => new URL(`${mount}/`, location.origin).href;
const withSlash = (origin: string) => (origin.endsWith('/') ? origin : `${origin}/`);

type Held = { id: string; origin: string; title: string; kind: string };
/** Where an item opens: its own address when we hold it, else the peek page. */
export function addressOf(origin: string, id: string, subs: readonly Held[]) {
  const o = withSlash(origin);
  if (o === ownOrigin()) return { to: '/reading/$sub/$id', params: { sub: OWN, id } } as const;
  const held = subs.find((s) => s.kind === 'blyg' && withSlash(s.origin) === o);
  if (held) return { to: '/reading/$sub/$id', params: { sub: held.id, id } } as const;
  return { to: '/peek', search: { origin: o, id } } as const;
}

export function useSubscriptionRows(): Held[] {
  return (useLiveQuery({ query: (q) => q.from({ source: subscriptions }) }).data ?? []) as Held[];
}

/** Open an item in the reader as a step down (or `start` when called with it). */
export function useOpenTarget() {
  const navigate = useNavigate();
  const subs = useSubscriptionRows();
  return (origin: string, id: string, via: Exclude<Via, 'start' | 'back'>) => {
    follow(via);
    void navigate(addressOf(origin, id, subs));
  };
}

/* ---------------- an entry's body ---------------- */

// Which links name blyg items, kept for the session so reopening an entry
// (or backing into it) does not ask again. The server caches across sessions.
const classified = new Map<string, { origin: string; id: string } | null>();

const hostOf = (origin: string) => {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
};

/**
 * The HTML of an entry with its links made followable. `origin` is the origin
 * the entry came from: the context a layer with no `data-blyg-origin` inherits.
 */
export function ReaderBody({
  html,
  origin,
  className,
  onClick,
}: {
  html: string;
  origin: string;
  className: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const open = useOpenTarget();
  const subs = useSubscriptionRows();
  const titleFor = useMemo(() => {
    const byOrigin = new Map(subs.filter((s) => s.kind === 'blyg').map((s) => [withSlash(s.origin), s.title]));
    return (o: string) => (withSlash(o) === ownOrigin() ? 'you' : byOrigin.get(withSlash(o)) ?? hostOf(o));
  }, [subs]);

  useEffect(() => {
    const root = box.current;
    if (!root) return;
    // 1. A line on every layer of every depth, naming whose it is.
    for (const layer of root.querySelectorAll<HTMLElement>('blockquote.blyg-transclusion')) {
      const id = layer.dataset.blygId;
      if (!id) continue;
      const parent = layer.parentElement?.closest<HTMLElement>('blockquote.blyg-transclusion');
      const layerOrigin = withSlash(layer.dataset.blygOrigin || parent?.dataset.readerOrigin || origin);
      layer.dataset.readerOrigin = layerOrigin;
      if (layer.querySelector(':scope > .layer-ref')) continue;
      const line = document.createElement('p');
      line.className = 'layer-ref';
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'reader-ref';
      a.dataset.readerOrigin = layerOrigin;
      a.dataset.readerId = id;
      a.dataset.readerVia = 'quote';
      a.textContent = `↳ ${layer.classList.contains('blyg-partial') ? 'excerpt of' : 'snapshot of'} v${layer.dataset.blygVersion ?? '?'} from ${titleFor(layerOrigin)} — open in reader`;
      line.append(a);
      layer.prepend(line);
    }
    // 2. Ordinary links: ask which of them lead to blyg items.
    const anchors = [...root.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')].filter((a) => !a.closest('.layer-ref'));
    // A link that is not (or not yet known to be) a blyg item leaves the
    // studio, so it opens in its own tab and the reading place is kept.
    for (const a of anchors) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    const apply = () => {
      for (const a of anchors) {
        const target = classified.get(a.href);
        if (!target) continue;
        a.classList.add('reader-ref');
        a.dataset.readerOrigin = target.origin;
        a.dataset.readerId = target.id;
        a.dataset.readerVia = 'link';
        a.title = 'opens in the reader';
      }
    };
    apply();
    const unknown = [...new Set(anchors.map((a) => a.href).filter((u) => !classified.has(u)))].slice(0, 40);
    if (!unknown.length) return;
    let live = true;
    unwrap(BlyggerApi.classifyLinks({ client, body: { urls: unknown } })).then(
      ({ links }) => {
        for (const l of links) classified.set(l.url, l.target);
        for (const u of unknown) if (!classified.has(u)) classified.set(u, null);
        if (live) apply();
      },
      () => {
        /* links stay plain links; try again the next time the entry opens */
      },
    );
    return () => {
      live = false;
    };
  }, [html, origin, titleFor]);

  return (
    <div
      ref={box}
      className={className}
      onClick={(event) => {
        const a = (event.target as Element).closest<HTMLAnchorElement>('a[data-reader-id]');
        if (a && event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
          event.preventDefault();
          open(a.dataset.readerOrigin!, a.dataset.readerId!, a.dataset.readerVia === 'quote' ? 'quote' : 'link');
          return;
        }
        onClick?.(event);
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ---------------- the trail: breadcrumb and history pane ---------------- */

/** Back at the feed: the walk is over. */
export function useEndTrail() {
  useEffect(() => endTrail(), []);
}

export function TrailBar({ back }: { back: () => void }) {
  const { stack } = useTrail();
  const navigate = useNavigate();
  const subs = useSubscriptionRows();
  const [open, setOpen] = useState(false);
  const jump = (index: number) => {
    const step = stack[index];
    if (!step) return;
    popTo(index);
    void navigate(addressOf(step.origin, step.id, subs));
  };
  return (
    <>
      <div className="article-head trail-bar">
        <Button className="act back-btn" onClick={back}>
          <Back />
          back
        </Button>
        {stack.length > 1 ? (
          <nav className="crumbs" aria-label="browsing path">
            {stack.map((step, i) => (
              <span key={`${i}:${step.origin}${step.id}`} className="crumb">
                {i ? <span aria-hidden="true"> › </span> : null}
                {i === stack.length - 1 ? (
                  <span aria-current="page">{step.title || step.id.slice(0, 8)}</span>
                ) : (
                  <button type="button" className="link-btn" onClick={() => jump(i)}>
                    {step.title || step.id.slice(0, 8)}
                  </button>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <span className="spacer" />
        )}
        <Button className="act" data-action="browsing-history" aria-expanded={open} onClick={() => setOpen(true)}>
          history
        </Button>
      </div>
      <HistoryPane open={open} onClose={() => setOpen(false)} />
    </>
  );
}

type BrowseRow = ListBrowseResponses[200]['items'][number];

/**
 * "Browsing history": a pane beside the reader (a bottom sheet on a phone)
 * with the walk in progress and the earlier ones from the private log. Each
 * walk is drawn as the tree it was — a step indented under the step it was
 * reached from — so a descent and the branches taken from it are both visible.
 */
function HistoryPane({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { stack, trail } = useTrail();
  const navigate = useNavigate();
  const subs = useSubscriptionRows();
  const [rows, setRows] = useState<BrowseRow[]>();
  const [error, setError] = useState<unknown>();
  const [stamp, setStamp] = useState(0);
  useEffect(() => {
    if (!open) return;
    let live = true;
    unwrap(BlyggerApi.listBrowse({ client, query: { limit: 100 } })).then(
      (page) => live && setRows(page.items),
      (failure) => live && setError(failure),
    );
    return () => {
      live = false;
    };
  }, [open, stamp, stack.length]);
  const walks = useMemo(() => {
    const byTrail = new Map<string, BrowseRow[]>();
    for (const row of rows ?? []) byTrail.set(row.trail, [...(byTrail.get(row.trail) ?? []), row].sort((a, b) => a.id - b.id));
    return [...byTrail.entries()];
  }, [rows]);
  const go = (origin: string, id: string) => {
    onClose();
    follow('link');
    void navigate(addressOf(origin, id, subs));
  };
  const clear = async () => {
    if (!(await confirm({ title: 'Clear browsing history?', body: 'The private log of what you opened by following links is deleted. Nothing public changes.', ok: 'clear', danger: true }))) return;
    await unwrap(BlyggerApi.clearBrowse({ client }));
    endTrail();
    setStamp((n) => n + 1);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Browsing history" className="trail-sheet" description="Where following links has taken you. Private to you.">
      <Failure error={error} />
      {stack.length ? (
        <>
          <h3 className="trail-h">This walk</h3>
          <ol className="trail-list" data-current>
            {stack.map((step, i) => (
              <li key={i} style={{ paddingLeft: `${Math.min(i, 8) * 12}px` }} aria-current={i === stack.length - 1 ? 'page' : undefined}>
                <button type="button" className="link-btn" onClick={() => { popTo(i); onClose(); void navigate(addressOf(step.origin, step.id, subs)); }}>
                  {step.title || step.id.slice(0, 8)}
                </button>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      <h3 className="trail-h">Earlier walks</h3>
      {walks.length ? (
        walks.map(([id, steps]) => {
          const depth = new Map<number, number>();
          return (
            <section key={id} className="trail-walk" data-trail={id}>
              <p className="trail-when">
                {new Date(steps[0].at).toLocaleString()} · {steps.filter((s) => s.via !== 'back').length} opened{id === trail ? ' · now' : ''}
              </p>
              <ul className="trail-list">
                {steps.map((s) => {
                  const d = s.parent_id != null && depth.has(s.parent_id) ? depth.get(s.parent_id)! + 1 : 0;
                  depth.set(s.id, s.via === 'back' ? Math.max(0, d - 1) : d);
                  return (
                    <li key={s.id} style={{ paddingLeft: `${Math.min(depth.get(s.id)!, 8) * 12}px` }} data-via={s.via}>
                      <span className="trail-via">{s.via === 'back' ? '↩' : '↳'}</span>{' '}
                      <button type="button" className="link-btn" onClick={() => go(s.origin, s.remote_id)}>
                        {s.title || s.remote_id.slice(0, 8)}
                      </button>{' '}
                      <span className="trail-note">{viaWord(s.via)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      ) : (
        <p className="hint">{rows ? 'Nothing yet. Follow a link or a quoted layer in an entry and the path appears here.' : 'loading…'}</p>
      )}
      <div className="sheet-actions">
        {walks.length ? (
          <Button className="btn btn-ghost" onClick={() => void clear()}>
            clear history
          </Button>
        ) : null}
        <Sheet.Close>close</Sheet.Close>
      </div>
    </Sheet>
  );
}

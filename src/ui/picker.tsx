import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { compiledExtensions } from '../../build/extensions.ui.ts';
import { client, listViews, preloadView } from './data.ts';
import { createItem } from './server-mutations.ts';
import { enabledExtensions, pickerSources, searchPickerSource } from './extensions.tsx';
import type { PickerResult } from './extension-api.ts';
import { Button, Failure, useSettings } from './components.tsx';
import { Toggle, ToggleGroup } from './buttons.tsx';
import { paletteTrigger, paletteInsert } from '../palette.ts';
import { setTextAt } from './caret.ts';
import './picker.css';
import { ago, canSearchText, SEARCH_PROMPT, store, stored, useSearch } from './search.tsx';

/**
 * The `[[` / `![[` picker (0.29). Typing either bracket form opens a panel at
 * the right (docked at the bottom on a phone) that searches everything the
 * form can name: own published items and imported blyg items, by every word
 * anywhere in their text, filtered by source and sorted newest or oldest first.
 *
 * Where the typing goes is the `picker_typing` setting (Settings → writing):
 * in `editor` mode the query is whatever follows the brackets and the keyboard
 * stays in the textarea, as before 0.29; in `panel` mode focus moves to the
 * panel's own search box. `auto`, the default, is the editor with a mouse and
 * the panel on a touch screen (Venkat, session 36, after trying both). In
 * panel mode on a phone the picker takes the whole screen: there is nothing
 * to type in the editor meanwhile, and a half-height dock under the keyboard
 * was the awkward part. Both modes share every other part.
 *
 * Extensions may add tabs beside the Studio's own search (`pickerSource`,
 * docs/extensions.md "Picker sources"): an extension finds results for the
 * query, and the picker lists them, moves through them and inserts the one
 * picked, in the form being typed, as it does its own. With no source enabled
 * there is no tab row.
 */
type Source = 'all' | 'mine' | 'imported';
type Sort = 'newest' | 'oldest';
type Focus = 'editor' | 'panel';
/** The Studio's own search, the first tab. */
const ITEMS = 'items';
const TAB_KEY = 'blyg.picker.tab';
// Touch without hover, the same test as the reading list's swipe hint (#36).
const touch = () => matchMedia('(hover: none) and (pointer: coarse)').matches;
const narrow = () => matchMedia('(max-width: 640px)').matches;

export function BracketPicker({
  input,
  text,
  change,
  allowTransclude = false,
}: {
  input: React.RefObject<HTMLTextAreaElement | null>;
  text: string;
  change: (text: string) => void;
  allowTransclude?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const [source, setSource] = useState<Source>(() => stored('blyg.picker.source', ['all', 'mine', 'imported'] as const, 'all'));
  const [sort, setSort] = useState<Sort>(() => stored('blyg.picker.sort', ['newest', 'oldest'] as const, 'newest'));
  const settings = useSettings();
  const setting = settings?.pickerTyping ?? 'auto';
  const [chosenTab, setChosenTab] = useState(() => {
    try {
      return localStorage.getItem(TAB_KEY) ?? ITEMS;
    } catch {
      return ITEMS;
    }
  });
  const focusMode: Focus = setting === 'auto' ? (touch() ? 'panel' : 'editor') : setting;
  const [sub, setSub] = useState('');
  const [subs, setSubs] = useState<{ id: string; title: string }[]>([]);
  const [panelQuery, setPanelQuery] = useState('');
  const [dismissed, setDismissed] = useState<string>();
  const search = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState(text.length);
  const routerNavigate = useNavigate();
  useEffect(() => {
    const element = input.current;
    const update = () => setCaret(element?.selectionStart ?? text.length);
    element?.addEventListener('selectionchange', update);
    element?.addEventListener('keyup', update);
    element?.addEventListener('click', update);
    update();
    return () => {
      element?.removeEventListener('selectionchange', update);
      element?.removeEventListener('keyup', update);
      element?.removeEventListener('click', update);
    };
  }, [input, text]);
  const trigger = paletteTrigger(text, caret, allowTransclude);
  // One trigger is one bracket being typed; Escape dismisses that one only.
  const triggerKey = trigger ? `${trigger.form}:${trigger.start}` : undefined;
  const open = !!trigger && dismissed !== triggerKey;
  useEffect(() => setPanelQuery(trigger?.query ?? ''), [trigger?.query]);
  const query = !open ? undefined : focusMode === 'panel' ? panelQuery : trigger.query;
  // The extensions' tabs for this form; the remembered tab if it is one of them, else the Studio's.
  const sources = open ? pickerSources(enabledExtensions(compiledExtensions, settings?.extensions), trigger.form) : [];
  const tabSource = sources.find((extension) => extension.name === chosenTab);
  const tab = tabSource ? tabSource.name : ITEMS;
  const chooseTab = (name: string) => {
    setChosenTab(name);
    try {
      localStorage.setItem(TAB_KEY, name);
    } catch { /* remembered until the page is left */ }
  };
  // Results are kept with the tab, form and query they answer, and listed only while those still
  // hold: a switched tab or a newer query never shows, or lets Enter pick, an older answer.
  const searchKey = tabSource && query !== undefined && trigger ? JSON.stringify([tabSource.name, trigger.form, query]) : undefined;
  const [found, setFound] = useState<{ key: string; results: PickerResult[]; error?: Error }>();
  const current = found && found.key === searchKey ? found : undefined;
  const sourceResults = current?.results ?? [];
  useEffect(() => {
    if (!tabSource || query === undefined || !trigger || !searchKey) return;
    const controller = new AbortController();
    // A short pause, so a source isn't asked once per keystroke.
    const timer = setTimeout(() => {
      searchPickerSource(tabSource, {
        client,
        openDraft: async (body) => {
          const created = await createItem(body);
          await routerNavigate({ to: '/edit/$id', params: { id: created.id } });
        },
        navigate: (location) => routerNavigate(location as never),
        run: async (action) => {
          await action();
        },
        query,
        form: trigger.form,
        signal: controller.signal,
      }).then(
        (results) => !controller.signal.aborted && setFound({ key: searchKey, results }),
        (error: Error) => !controller.signal.aborted && setFound({ key: searchKey, results: [], error }),
      );
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [tabSource?.name, query, trigger?.form]);

  // On a phone the panel docks over the bottom half: bring the text being
  // typed into the half that stays visible.
  const full = open && focusMode === 'panel' && narrow();
  useEffect(() => {
    if (open && !full && narrow()) input.current?.scrollIntoView({ block: 'start' });
  }, [open, triggerKey, full]);
  // Panel mode: the search box takes the keyboard when the panel opens.
  useEffect(() => {
    if (open && focusMode === 'panel') requestAnimationFrame(() => search.current?.focus());
  }, [open, triggerKey, focusMode]);
  useEffect(() => {
    if (!open || subs.length) return;
    preloadView(listViews.subscriptions)
      .then(() => setSubs(listViews.subscriptions.toArray.filter((s) => s.kind === 'blyg').map((s) => ({ id: s.id, title: s.title || new URL(s.origin).host }))))
      .catch(() => {});
  }, [open, subs.length]);

  const needsLongerTerm = !!query?.trim() && !canSearchText(query);
  const { hits, hasMore, loading, error, loadMore, cancel } = useSearch(
    query === undefined || needsLongerTerm || tab !== ITEMS ? undefined : { q: query, source, sort, ...(source === 'imported' && sub ? { sub } : {}) },
  );
  useEffect(() => setSelected(0), [query, source, sort, sub, tab]);
  // What the open tab lists: the Studio's hits, or the source's results.
  const listed: { id: string; label?: string }[] = tab === ITEMS ? hits : sourceResults;
  const backToEditor = (at: number) =>
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(at, at);
    });
  const pick = (hit: { id: string; label?: string }) => {
    if (!trigger) return;
    const next = paletteInsert(text, caret, trigger, hit.id, hit.label);
    cancel();
    // Caret placed now, not on the next frame: see setTextAt.
    if (input.current) setTextAt(input.current, change, next.text, next.caret);
    else change(next.text);
  };
  const dismiss = () => {
    cancel();
    setDismissed(triggerKey);
    backToEditor(caret);
  };
  // In editor mode a click on a filter must not strand the keyboard in the panel.
  const afterControl = () => {
    if (focusMode === 'editor') backToEditor(caret);
  };
  const navigate = (event: KeyboardEvent | React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      return;
    }
    if (!listed.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected((i) => Math.min(i + 1, listed.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    }
    if (event.key === 'Enter' && listed[selected]) {
      event.preventDefault();
      pick(listed[selected]);
    }
  };
  useEffect(() => {
    const element = input.current;
    if (!element || !open) return;
    element.addEventListener('keydown', navigate);
    return () => element.removeEventListener('keydown', navigate);
  });
  useEffect(() => {
    document.querySelector('.picker li.sel')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open || !trigger) return null;
  const head = {
    link: { name: 'link', code: '[[…]]', sub: 'cites without responding' },
    transclude: { name: 'quote', code: '![[…]]', sub: 'transcludes the item into this thread' },
    source: { name: 'source', code: '![[…]]', sub: 'feeds the item to the generator; its author is told' },
  }[trigger.form];
  return (
    <aside className={full ? 'picker picker-full' : 'picker'} role="complementary" aria-label={`${head.name} picker`}>
      <header className="picker-head">
        <div>
          <strong>{head.name}</strong> <code>{head.code}</code>
          <div className="picker-sub">{head.sub}</div>
        </div>
        <Button className="btn btn-ghost btn-mini" aria-label="close picker" onMouseDown={(e) => e.preventDefault()} onClick={dismiss}>
          ✕
        </Button>
      </header>
      {focusMode === 'panel' ? (
        <input
          ref={search}
          id="picker-search"
          type="search"
          className="picker-search"
          placeholder="search every word"
          aria-label="search items"
          value={panelQuery}
          onChange={(e) => setPanelQuery(e.target.value)}
          onKeyDown={navigate}
        />
      ) : (
        <p className="picker-query">
          {trigger.query ? (
            <>
              <q>{trigger.query}</q> · keep typing to narrow
            </>
          ) : (
            <>type after the brackets to search</>
          )}
        </p>
      )}
      {sources.length ? (
        <ToggleGroup aria-label="picker tab" className="picker-seg picker-tabs" value={[tab]}>
          {[ITEMS, ...sources.map((extension) => extension.name)].map((name) => (
            <Toggle
              key={name}
              value={name}
              data-picker-tab={name}
              onClick={() => {
                chooseTab(name);
                afterControl();
              }}
            >
              {name === ITEMS ? 'items' : sources.find((extension) => extension.name === name)!.pickerSource!.label}
            </Toggle>
          ))}
        </ToggleGroup>
      ) : null}
      {tab !== ITEMS ? (
        <>
          <Failure error={current?.error} />
          <div className="picker-count" aria-live="polite">
            {!current ? 'searching…' : `${sourceResults.length.toLocaleString()} result${sourceResults.length === 1 ? '' : 's'}`}
          </div>
          <ul role="listbox" aria-label={tabSource!.pickerSource!.label} className="picker-list" data-picker-source={tab}>
            {sourceResults.map((result, i) => (
              <li
                role="option"
                aria-selected={i === selected}
                className={i === selected ? 'sel' : ''}
                key={result.id}
                onMouseEnter={() => setSelected(i)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(result);
                }}
              >
                <span className="picker-excerpt">{result.excerpt}</span>
                {result.meta ? <span className="picker-meta">{result.meta}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="picker-filters">
            <ToggleGroup aria-label="source" className="picker-seg" value={[source]}>
              {(['all', 'mine', 'imported'] as const).map((value) => (
                <Toggle
                  key={value}
                  value={value}
                  onClick={() => {
                      setSource(value);
                      store('blyg.picker.source', value);
                      afterControl();
                  }}
                >
                  {value === 'all' ? 'both' : value}
                </Toggle>
              ))}
            </ToggleGroup>
            <select
              aria-label="sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as Sort);
                store('blyg.picker.sort', e.target.value);
                afterControl();
              }}
            >
              <option value="newest">newest first</option>
              <option value="oldest">oldest first</option>
            </select>
            {source === 'imported' && subs.length ? (
              <select
                aria-label="subscription"
                value={sub}
                onChange={(e) => {
                  setSub(e.target.value);
                  afterControl();
                }}
              >
                <option value="">every subscription</option>
                {subs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <Failure error={error} />
          <div className="picker-count" aria-live="polite">
            {needsLongerTerm ? SEARCH_PROMPT : loading && !hits.length ? 'searching…' : `${hits.length.toLocaleString()}${hasMore ? '+' : ''} item${hits.length === 1 && !hasMore ? '' : 's'}`}
          </div>
          <ul role="listbox" aria-label="items" className="picker-list">
            {hits.map((hit, i) => (
              <li
                role="option"
                aria-selected={i === selected}
                className={i === selected ? 'sel' : ''}
                key={JSON.stringify([hit.source, hit.subscriptionId, hit.id])}
                onMouseEnter={() => setSelected(i)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(hit);
                }}
              >
                <span className="picker-excerpt">{hit.excerpt}</span>
                <span className="picker-meta">
                  {hit.source === 'mine' ? <span className="picker-mine">mine</span> : <span>{hit.sourceTitle}</span>} · {hit.kind} · {ago(hit.updated)} · v{hit.version}
                </span>
              </li>
            ))}
          </ul>
          {error ? (
            <Button className="btn btn-ghost btn-mini" disabled={loading} onMouseDown={(event) => event.preventDefault()} onClick={loadMore}>
              retry search
            </Button>
          ) : null}
          {hasMore ? (
            <Button className="btn btn-ghost btn-mini" disabled={loading} onMouseDown={(event) => event.preventDefault()} onClick={loadMore}>
              load more
            </Button>
          ) : null}
        </>
      )}
      <footer className="picker-foot">
        <span className="hint">↑↓ to move · Enter to insert · Esc to close</span>
      </footer>
    </aside>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { Link, useNavigate, useBlocker } from '@tanstack/react-router';
import { formatDateIn } from '../dates.ts';
import { renderMarkdown } from '../markdown.ts';
import { parseScopes, previewStrip } from '../tk.ts';
import { extractDirectives } from '../directives.ts';
import { previewFromHtml } from '../preview.ts';
import type { ListItemsResponses, Version } from '../../sdk/dist/browser.js';
import { BlyggerApi, unwrap } from '../../sdk/dist/browser.js';
import type { Detail } from './data.ts';
import { client, items, itemDetail, changed } from './data.ts';
import {
  Button,
  Failure,
  Html,
  Modal,
  mount,
  usePoll,
  useSettings,
} from './components.tsx';
import { paletteTrigger, paletteInsert } from '../palette.ts';
import { Draft } from './draft.ts';
import { FRAGMENT_MAX_CHARS as MAX } from '../client.ts';
function useAction() {
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string>();
  const pending = useRef(0);
  return {
    error,
    warning,
    busy,
    run: async (fn: () => Promise<unknown>) => {
      pending.current++;
      setBusy(true);
      setError(undefined);
      setWarning(undefined);
      try {
        const result = await fn();
        if (
          result &&
          typeof result === 'object' &&
          'warning' in result &&
          typeof result.warning === 'string'
        )
          setWarning(result.warning);
      } catch (error) {
        setError(error);
      } finally {
        pending.current--;
        setBusy(pending.current > 0);
      }
    },
  };
}
function Help({ thread }: { thread?: boolean }) {
  return thread ? (
    <p className="compose-help">
      Markdown supported. <code>![[id]]</code> quotes an item.{' '}
      <code>[[id]]</code> links an item. <code>[TK]an instruction[/TK]</code>{' '}
      marks AI-drafted text. <Link to="/syntax">full syntax reference</Link>
    </p>
  ) : (
    <p className="compose-help">
      Markdown supported. Write <code>[[id]]</code> to link another item of
      yours or something you read (type <code>[[</code> for a picker), and{' '}
      <code>[TK]an instruction[/TK]</code> to mark a scope for AI-drafted text —
      a <em>generate</em> button appears, which saves and opens the editor.{' '}
      <Link to="/syntax">full syntax reference</Link>
    </p>
  );
}
function useUpload(
  id: string | undefined | (() => Promise<string | undefined>),
  append: (text: string) => void,
) {
  const input = useRef<HTMLInputElement>(null);
  const action = useAction();
  const [attached, setAttached] = useState('');
  const upload = async (file: File) => {
    const itemId = typeof id === 'function' ? await id() : id;
    const media = await unwrap(
      BlyggerApi.uploadMedia({
        client,
        body: { file, ...(itemId ? { item_id: itemId } : {}) },
      }),
    );
    append(`\n\n![](${mount}/${media.url})`);
    setAttached(media.url);
    if (itemId) await changed('item');
  };
  return {
    input,
    action,
    attached,
    element: (
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void action.run(() => upload(file));
          event.target.value = '';
        }}
      />
    ),
  };
}
export function Compose() {
  const navigate = useNavigate();
  const action = useAction();
  const [text, setText] = useState('');
  const [kind, setKind] = useState<'fragment' | 'thread'>('fragment');
  const [id, setId] = useState<string>();
  const [saved, setSaved] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const result = useLiveQuery({
    query: (q) =>
      q.from({ item: items }).orderBy(({ item }) => item.updated, 'desc'),
  });
  usePoll('items', items.utils.refetch);
  const current = useRef({ text, kind, id });
  current.current = { text, kind, id };
  const queue = useRef(Promise.resolve<string | undefined>(undefined));
  const save = () => {
    const snapshot = current.current;
    const pending = queue.current.then(async (existing) => {
      const existingId = existing || current.current.id;
      const item = existingId
        ? await unwrap(
            BlyggerApi.updateItem({
              client,
              path: { id: existingId },
              body: { content_md: snapshot.text, kind: snapshot.kind },
            }),
          )
        : await unwrap(
            BlyggerApi.createItem({
              client,
              body: { content_md: snapshot.text, kind: snapshot.kind },
            }),
          );
      setId(item.id);
      current.current.id = item.id;
      items.utils.writeUpsert(item);
      if (
        current.current.text === snapshot.text &&
        current.current.kind === snapshot.kind
      ) {
        setSaved(true);
      }
      return item.id;
    });
    queue.current = pending.catch(() => current.current.id);
    return pending.then((id) =>
      current.current.text === snapshot.text &&
      current.current.kind === snapshot.kind
        ? id
        : undefined,
    );
  };
  useBlocker({
    enableBeforeUnload: () => !!current.current.text && !saved,
    shouldBlockFn: async () => {
      if (!current.current.text || saved) return false;
      try {
        return !(await save());
      } catch (error) {
        await action.run(async () => {
          throw error;
        });
        return true;
      }
    },
  });
  const upload = useUpload(save, (addition) => {
    setText((text) => text + addition);
    setSaved(false);
  });
  const openEditor = async () => {
    const savedId = await save();
    if (savedId) await navigate({ to: '/edit/$id', params: { id: savedId } });
  };
  const publish = async () => {
    const savedId = await save();
    if (!savedId) return;
    const result = await unwrap(
      BlyggerApi.publishItem({ client, path: { id: savedId } }),
    );
    if (current.current.text === text) {
      setText('');
      setId(undefined);
      queue.current = Promise.resolve(undefined);
      setSaved(false);
    }
    await changed('items', 'reading');
    return result;
  };
  return (
    <>
      <div className="composer" style={{ position: 'relative' }}>
        <Help />
        <textarea
          ref={input}
          id="composer-text"
          placeholder="compose a fragment…"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
        />
        <BracketPicker input={input} text={text} change={setText} />
        <div className="bar">
          <span className="kind-toggle">
            {(['fragment', 'thread'] as const).map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="composer-kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => {
                    setKind(value);
                    setSaved(false);
                  }}
                />
                {value}
              </label>
            ))}
          </span>
          <span
            className={
              text.length > MAX && kind === 'fragment' ? 'count over' : 'count'
            }
            id="composer-count"
          >
            {text.length} / {MAX}
          </span>
        </div>
        <div className="bar">
          <span>
            <Button
              id="composer-attach"
              onClick={() => upload.input.current?.click()}
            >
              attach image
            </Button>{' '}
            <Button
              id="composer-full"
              disabled={action.busy}
              onClick={() => void action.run(openEditor)}
            >
              Full Editor →
            </Button>
            {text.includes('[TK]') ? (
              <Button onClick={() => void action.run(openEditor)}>
                generate in editor →
              </Button>
            ) : null}
          </span>
          <span>
            {saved ? (
              <span id="composer-state" className="save-state">
                saved
              </span>
            ) : null}{' '}
            <Button
              id="save-draft-btn"
              disabled={action.busy}
              onClick={() => void action.run(save)}
            >
              save draft
            </Button>{' '}
            <Button
              id="publish-btn"
              className="primary"
              disabled={action.busy}
              onClick={() => void action.run(publish)}
            >
              publish
            </Button>
          </span>
        </div>
        {upload.element}
        <Failure error={action.error || upload.action.error} />
        {action.warning ? (
          <p role="status" className="publish-warning">
            {action.warning}
          </p>
        ) : null}
      </div>
      {!result.isLoading && !result.data?.length ? (
        <p>Nothing yet — compose your first fragment above.</p>
      ) : null}
      {result.data?.map((item) => <ItemRow key={item.id} item={item} />)}
    </>
  );
}
function ItemRow({ item }: { item: ListItemsResponses[200]['items'][number] }) {
  const settings = useSettings();
  const action = useAction();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(item.content_md);
  const [saved, setSaved] = useState(false);
  const draft = useRef<Draft | null>(null);
  if (!draft.current)
    draft.current = new Draft(item.content_md, async (content) => {
      await items.update(item.id, (row) => {
        row.content_md = content;
      }).isPersisted.promise;
      await changed('item', 'reading');
    });
  const save = async () => {
    const current = await draft.current!.save();
    if (current) setSaved(true);
    return current;
  };
  useBlocker({
    enableBeforeUnload: () => draft.current!.dirty,
    shouldBlockFn: async () => {
      if (!draft.current!.dirty) return false;
      try {
        return !(await save());
      } catch (error) {
        await action.run(async () => {
          throw error;
        });
        return true;
      }
    },
  });
  const { count, withoutDirectives } = extractDirectives(item.content_md);
  const stripped = previewStrip(
    withoutDirectives,
    parseScopes(withoutDirectives).scopes,
  );
  const preview = previewFromHtml(renderMarkdown(stripped.text));
  const mutate = (fn: () => Promise<unknown>) =>
    void action.run(async () => {
      if (draft.current!.dirty && !(await save())) return;
      const result = await fn();
      await changed('items', 'item', 'reading');
      return result;
    });
  return (
    <article
      className={`item-row ${item.dirty ? 'dirty' : ''}`}
      data-id={item.id}
    >
      <p className="excerpt">
        <span className={`state ${item.status === 'public' ? 'pub' : 'draft'}`}>
          {item.status === 'public' ? '●' : '○'}
        </span>
        {item.kind === 'thread' ? (
          <span className="kind-chip">thread</span>
        ) : null}
        {count ? <span className="tc-chip">⧉{count}</span> : null}
        {preview.title ? (
          <span className="excerpt-title">{preview.title}</span>
        ) : (
          preview.body || '(empty draft)'
        )}
      </p>
      {preview.title ? <p className="excerpt-body">{preview.body}</p> : null}
      <p className="timestamps">
        <span>
          Created: {formatDateIn(item.created, settings?.timezone || 'UTC')}
        </span>
        <span>
          {item.status} · v{item.version}
          {item.dirty ? ' · unpublished changes' : ''}
        </span>
      </p>
      {item.version > 0 ? (
        <p className="version-summary">
          <Link to="/edit/$id" params={{ id: item.id }} hash="history">
            {item.version} version{item.version === 1 ? '' : 's'}
          </Link>
          {item.pins?.length ? (
            <span className="pin-chips">
              {' '}
              · 📌{' '}
              {item.pins.map((pin) => (
                <a
                  key={pin.version}
                  href={`${mount}/${pin.kind === 'thread' ? 't' : 'f'}/${
                    item.id
                  }/v${pin.version}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  v{pin.version}{' '}
                </a>
              ))}
            </span>
          ) : null}
        </p>
      ) : null}
      {open ? (
        <div className="quick-edit" id={`qe-${item.id}`}>
          <textarea
            aria-label="quick edit"
            value={text}
            onChange={(event) => {
              draft.current!.edit(event.target.value);
              setText(event.target.value);
              setSaved(false);
            }}
          />
          <div className="qe-bar">
            <Button
              disabled={action.busy}
              onClick={() => void action.run(save)}
            >
              save draft
            </Button>
            <Button
              className="primary"
              disabled={action.busy}
              onClick={() =>
                mutate(() =>
                  unwrap(
                    BlyggerApi.publishItem({ client, path: { id: item.id } }),
                  ),
                )
              }
            >
              publish
            </Button>
            {saved ? <span className="save-state">saved</span> : null}
          </div>
          <Help />
        </div>
      ) : null}
      <Failure error={action.error} />
      {action.warning ? (
        <p role="status" className="publish-warning">
          {action.warning}
        </p>
      ) : null}
      <div className="actions">
        {item.kind === 'fragment' && item.status !== 'withdrawn' ? (
          <Button
            data-action="quick-edit"
            onClick={() => {
              if (!draft.current!.dirty) {
                draft.current!.accept(item.content_md);
                setText(item.content_md);
              }
              setOpen((value) => !value);
            }}
          >
            quick edit
          </Button>
        ) : null}
        <Link to="/edit/$id" params={{ id: item.id }}>
          full editor
        </Link>
        {item.version === 0 || item.dirty || item.status === 'withdrawn' ? (
          <Button
            disabled={action.busy}
            onClick={() =>
              mutate(() =>
                unwrap(
                  BlyggerApi.publishItem({ client, path: { id: item.id } }),
                ),
              )
            }
          >
            {item.status === 'withdrawn' ? 'republish' : 'publish'}
          </Button>
        ) : null}
        {item.version === 0 ? (
          <Button
            className="danger"
            disabled={action.busy}
            onClick={() => {
              if (window.confirm('Discard this unpublished draft?'))
                mutate(() => items.delete(item.id).isPersisted.promise);
            }}
          >
            discard
          </Button>
        ) : item.status === 'public' ? (
          <>
            <Button
              disabled={action.busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Pin v${item.version}? It will stay fetchable forever.`,
                  )
                )
                  mutate(() =>
                    unwrap(
                      BlyggerApi.pinItem({
                        client,
                        path: { id: item.id, version: item.version },
                      }),
                    ),
                  );
              }}
            >
              pin v{item.version}…
            </Button>
            <Button
              className="danger"
              disabled={action.busy}
              onClick={() => {
                if (
                  window.confirm(
                    'Withdraw this item? This publishes a permanent endcap.',
                  )
                )
                  mutate(() =>
                    unwrap(
                      BlyggerApi.withdrawItem({
                        client,
                        path: { id: item.id },
                      }),
                    ),
                  );
              }}
            >
              withdraw
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}
export function EditorPage({ id }: { id: string }) {
  const collection = useMemo(() => itemDetail(id), [id]);
  usePoll(`item:${id}`, collection.utils.refetch);
  const result = useLiveQuery({
    query: (q) => q.from({ item: collection }),
  });
  return result.data?.[0] ? (
    <Editor key={id} item={result.data[0]} />
  ) : (
    <p>Loading editor…</p>
  );
}
function Editor({ item }: { item: Detail }) {
  const navigate = useNavigate();
  const action = useAction();
  const collection = itemDetail(item.id);
  const draft = useRef<Draft | null>(null);
  if (!draft.current)
    draft.current = new Draft(item.content_md, async (text) => {
      const transaction = collection.update(item.id, (row) => {
        row.content_md = text;
      });
      await transaction.isPersisted.promise;
      await changed('items', 'reading');
    });
  const [text, setText] = useState(draft.current.text);
  const [note, setNote] = useState('');
  const [preview, setPreview] =
    useState<Awaited<ReturnType<typeof getPreview>>>();
  const [version, setVersion] = useState<Version>();
  const [saved, setSaved] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const leaving = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const save = async () => {
    clearTimeout(saveTimer.current);
    const current = await draft.current!.save();
    if (current) setSaved(true);
    return current;
  };
  useBlocker({
    enableBeforeUnload: () => !leaving.current && draft.current!.dirty,
    shouldBlockFn: async () => {
      if (leaving.current || !draft.current!.dirty) return false;
      try {
        return !(await save());
      } catch (error) {
        await action.run(async () => {
          throw error;
        });
        return true;
      }
    },
  });
  const edit = (text: string) => {
    draft.current!.edit(text);
    setText(text);
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void action.run(save), 400);
  };
  useEffect(() => () => clearTimeout(saveTimer.current), []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void getPreview(text, item.id, item.authored_kind, controller.signal)
        .then(setPreview)
        .catch((error) => {
          if (!controller.signal.aborted)
            setPreview({
              html: '',
              scopes: [],
              errors: [
                {
                  reason:
                    error instanceof Error ? error.message : String(error),
                },
              ],
            });
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, item.id, item.authored_kind]);
  const upload = useUpload(item.id, (addition) =>
    edit(draft.current!.text + addition),
  );
  const operation = (fn: () => Promise<unknown>) =>
    void action.run(async () => {
      if (!(await save())) return;
      const result = await fn();
      await changed('item', 'items', 'reading');
      return result;
    });
  const switchKind = async () => {
    const next = item.authored_kind === 'fragment' ? 'thread' : 'fragment';
    await unwrap(
      BlyggerApi.updateItem({
        client,
        path: { id: item.id },
        body: { kind: next },
      }),
    );
  };
  const restore = async (version: number, discardChanges = false) => {
    const message = discardChanges
      ? `Discard unpublished changes and go back to the published v${version}?\n\nThe public item is not affected — it is already v${version}.`
      : `Restore v${version} into the working copy?\n\nNothing is published yet and no version is rewound — this replaces your current draft, which you would then publish as v${
          item.version + 1
        }.`;
    if (!window.confirm(message)) return;
    clearTimeout(saveTimer.current);
    setReplacing(true);
    try {
      // Finish queued PATCHes before replacing the working copy on the server.
      await draft.current!.settle();
      await unwrap(
        BlyggerApi.restoreItem({
          client,
          path: { id: item.id },
          body: { version },
        }),
      );
      const restored = await unwrap(
        BlyggerApi.getItem({ client, path: { id: item.id } }),
      );
      draft.current!.accept(restored.content_md);
      setText(restored.content_md);
      setSaved(true);
      await changed('item', 'items', 'reading');
    } finally {
      setReplacing(false);
    }
  };
  const discardDraft = async () => {
    if (!window.confirm('Discard this draft? It was never published.')) return;
    clearTimeout(saveTimer.current);
    setReplacing(true);
    try {
      await draft.current!.settle();
      await unwrap(BlyggerApi.deleteItem({ client, path: { id: item.id } }));
      await changed('items');
      leaving.current = true;
      await navigate({ to: '/' });
    } finally {
      setReplacing(false);
    }
  };
  const withdraw = () => {
    if (
      !window.confirm(
        "Withdraw this item? This publishes a permanent endcap — reversible by republishing, but the withdrawal itself can't be undone.",
      )
    )
      return;
    operation(() =>
      unwrap(BlyggerApi.withdrawItem({ client, path: { id: item.id } })),
    );
  };
  const generate = async (scope: number) => {
    const revision = draft.current!.revision;
    const result = await draft.current!.mutate(() =>
      unwrap(
        BlyggerApi.generateItem({
          client,
          path: { id: item.id },
          body: { scope },
        }),
      ),
    );
    if (draft.current!.revision === revision) edit(result.text);
  };
  const pin = async (version: number) => {
    if (
      !window.confirm(
        `Pin v${version}? This is irrevocable — it stays fetchable forever, even past withdrawal.`,
      )
    )
      return;
    await unwrap(
      BlyggerApi.pinItem({ client, path: { id: item.id, version } }),
    );
    await changed('item', 'items');
  };
  return (
    <>
      <p>
        <Link to="/">← compose</Link> · {item.authored_kind} · {item.status} · v
        {item.version}
      </p>
      <div id="error-banner-slot">
        <Failure error={action.error || upload.action.error} />
        {action.warning ? (
          <p role="status" className="publish-warning">
            {action.warning}
          </p>
        ) : null}
        {preview?.link_errors?.map((e, i) => (
          <Failure key={`link:${i}`} error={e.reason} />
        ))}
        {preview?.errors?.map((e, i) => <Failure key={i} error={e.reason} />)}
      </div>
      {item.stub_of ? (
        <p className="stub-head">
          stub of {'url' in item.stub_of ? item.stub_of.url : item.stub_of.id}{' '}
          <Button
            className="link"
            onClick={() =>
              operation(async () => {
                await unwrap(
                  BlyggerApi.updateItem({
                    client,
                    path: { id: item.id },
                    body: { stub_of: null },
                  }),
                );
              })
            }
          >
            clear stub
          </Button>
        </p>
      ) : null}
      {item.forked_from ? (
        <p>
          fork of {item.forked_from.id} v{item.forked_from.version}
        </p>
      ) : null}
      <div className={item.authored_kind === 'thread' ? 'panes' : 'split'}>
        <div className="pane" style={{ position: 'relative' }}>
          <h2>draft</h2>
          <Help thread={item.authored_kind === 'thread'} />
          <textarea
            id="md-input"
            readOnly={replacing}
            ref={input}
            value={text}
            onChange={(event) => edit(event.target.value)}
          />
          {!replacing ? (
            <BracketPicker
              input={input}
              text={text}
              change={edit}
              allowTransclude={item.authored_kind === 'thread'}
            />
          ) : null}
        </div>
        <div className="pane preview" id="preview-pane">
          <h2>preview</h2>
          <Html id="preview-body" html={preview?.html ?? ''} />
        </div>
      </div>
      <div className="tk-panel" id="tk">
        <h2>
          TK scopes{' '}
          {item.authored_kind === 'fragment' ? (
            <Button
              id="tk-generate-whole-btn"
              className="link"
              disabled={replacing}
              onClick={() => {
                const instruction = window.prompt(
                  'Instruction for the whole fragment:',
                );
                if (!instruction) return;
                const existing = draft.current!.text.trim();
                edit(
                  `[TK]${instruction}${existing ? `[=]${existing}` : ''}[/TK]`,
                );
              }}
            >
              generate whole fragment…
            </Button>
          ) : null}
        </h2>
        <ul>
          {preview?.scopes.map((scope) => (
            <li key={scope.index} className="tk-scope-row">
              <span className="tk-instruction">{scope.instruction}</span>
              <Button
                disabled={action.busy}
                onClick={() => operation(() => generate(scope.index))}
              >
                {scope.hasOutput ? 'regenerate' : 'generate'}
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <div className="edit-bar">
        <span>
          <Button
            id="attach-btn"
            disabled={replacing}
            onClick={() => upload.input.current?.click()}
          >
            attach image
          </Button>{' '}
          {item.status === 'draft' ? (
            <Button
              data-action="switch-kind"
              onClick={() => operation(switchKind)}
            >
              make this a{' '}
              {item.authored_kind === 'thread' ? 'fragment' : 'thread'}
            </Button>
          ) : null}{' '}
          <span className="count">
            {text.length} / {MAX}
          </span>
        </span>
        <span>
          <input
            id="note-input"
            className="note"
            placeholder="what changed? (optional edit note)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            id="save-draft-btn"
            disabled={action.busy}
            onClick={() => void action.run(save)}
          >
            save draft
          </Button>{' '}
          <Button
            id="publish-btn"
            className="primary"
            disabled={action.busy}
            onClick={() =>
              operation(async () => {
                return unwrap(
                  BlyggerApi.publishItem({
                    client,
                    path: { id: item.id },
                    body: { note },
                  }),
                );
              })
            }
          >
            {item.status === 'withdrawn' ? 'republish' : 'publish'}
          </Button>{' '}
          {item.status === 'public' ? (
            <Button
              className="danger"
              disabled={action.busy}
              onClick={withdraw}
            >
              withdraw
            </Button>
          ) : null}
          {item.version === 0 ? (
            <Button
              className="danger"
              disabled={action.busy || upload.action.busy}
              onClick={() => void action.run(discardDraft)}
            >
              discard draft
            </Button>
          ) : item.status === 'public' &&
            (item.dirty || (!saved && text !== item.content_md)) ? (
            <Button
              data-action="discard-changes"
              disabled={action.busy || upload.action.busy}
              onClick={() => void action.run(() => restore(item.version, true))}
            >
              discard changes
            </Button>
          ) : null}
        </span>
      </div>
      {saved ? <p className="save-state">saved</p> : null}
      {upload.element}
      {upload.attached ? <p>attached: {upload.attached}</p> : null}
      {item.media.length ? (
        <section className="media">
          <h2>attachments</h2>
          {item.media.map((media) => (
            <p key={media.id}>
              <a
                href={`${mount}/${media.url}`}
                target="_blank"
                rel="noreferrer"
              >
                {media.alt || media.url}
              </a>{' '}
              · {media.mime}
            </p>
          ))}
        </section>
      ) : null}
      {item.status === 'public' ? (
        <p>
          <a
            href={`${mount}/${item.authored_kind === 'thread' ? 't' : 'f'}/${
              item.id
            }/`}
            target="_blank"
            rel="noreferrer"
          >
            public permalink ↗
          </a>
        </p>
      ) : null}
      <section className="history" id="history">
        <h2>history</h2>
        {!item.versions.length ? (
          <p>Not yet published.</p>
        ) : (
          <ul className="h-list">
            {[...item.versions].reverse().map((v) => (
              <li className="h-row" key={v.version}>
                <strong>v{v.version}</strong> {v.note}{' '}
                <span className="h-actions">
                  <Button
                    data-action="view-version"
                    onClick={() => setVersion(v)}
                  >
                    view
                  </Button>{' '}
                  {v.pinned ? (
                    <>
                      <a
                        href={`${mount}/${v.kind === 'thread' ? 't' : 'f'}/${
                          item.id
                        }/v${v.version}/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        📌 pinned
                      </a>{' '}
                      <Link to="/fork" search={{ id: item.id }}>
                        fork
                      </Link>
                    </>
                  ) : v.content_md ? (
                    <Button
                      data-action="pin"
                      disabled={action.busy}
                      onClick={() => void action.run(() => pin(v.version))}
                    >
                      pin
                    </Button>
                  ) : null}
                  {v.content_md ? (
                    <Button
                      disabled={action.busy || upload.action.busy}
                      onClick={() => void action.run(() => restore(v.version))}
                    >
                      restore → v{item.version + 1}
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Modal
        open={!!version}
        close={() => setVersion(undefined)}
        title={`version ${version?.version}`}
      >
        <Html id="h-viewer-body" html={version?.content_html ?? ''} />
      </Modal>
    </>
  );
}
const getPreview = (
  text: string,
  id: string,
  kind: 'fragment' | 'thread',
  signal?: AbortSignal,
) =>
  unwrap(
    BlyggerApi.preview({
      client,
      body: { content_md: text, item_id: id, kind },
      signal,
    }),
  );
function BracketPicker({
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
  const [hits, setHits] = useState<
    {
      id: string;
      excerpt: string;
    }[]
  >([]);
  const [selected, setSelected] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>();
  const request = useRef<AbortController | undefined>(undefined);
  const [caret, setCaret] = useState(text.length);
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
  const query = trigger?.query;
  const loadPage = async (
    offset: number,
    controller: AbortController,
    query: string,
  ) => {
    if (controller.signal.aborted) return;
    setLoading(true);
    setError(undefined);
    try {
      const result = await unwrap(
        BlyggerApi.search({
          client,
          query: { q: query, offset, limit: 20 },
          signal: controller.signal,
        }),
      );
      if (controller.signal.aborted || request.current !== controller) return;
      setHits((current) =>
        offset === 0
          ? result.items
          : [
              ...current,
              ...result.items.filter(
                (item) => !current.some((hit) => hit.id === item.id),
              ),
            ],
      );
      setTotal(result.total);
    } catch (failure) {
      if (!controller.signal.aborted && request.current === controller)
        setError(failure);
    } finally {
      if (request.current === controller) setLoading(false);
    }
  };
  useEffect(() => {
    setSelected(0);
    setHits([]);
    setTotal(0);
    setError(undefined);
    setLoading(false);
    if (query === undefined) return;
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => void loadPage(0, controller, query), 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
      if (request.current === controller) request.current = undefined;
    };
  }, [query]);
  const loadMore = () => {
    const controller = request.current;
    if (controller && query !== undefined)
      void loadPage(hits.length, controller, query);
  };
  const pick = (id: string) => {
    if (!trigger) return;
    const next = paletteInsert(text, caret, trigger, id);
    change(next.text);
    request.current?.abort();
    setHits([]);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(next.caret, next.caret);
    });
  };
  useEffect(() => {
    const element = input.current;
    if (!element) return;
    const key = (event: KeyboardEvent) => {
      if (!hits.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelected((i) => Math.min(i + 1, hits.length - 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      }
      if (event.key === 'Escape') {
        request.current?.abort();
        setHits([]);
        setError(undefined);
      }
      if (event.key === 'Enter' && hits[selected]) {
        event.preventDefault();
        pick(hits[selected].id);
      }
    };
    element.addEventListener('keydown', key);
    return () => element.removeEventListener('keydown', key);
  });
  return trigger && (hits.length || error) ? (
    <div className="palette">
      <Failure error={error} />
      <ul role="listbox" aria-label="items">
        {hits.map((hit, i) => (
          <li
            role="option"
            aria-selected={i === selected}
            className={i === selected ? 'sel' : ''}
            key={hit.id}
            onMouseDown={(event) => {
              event.preventDefault();
              pick(hit.id);
            }}
          >
            {hit.excerpt}
          </li>
        ))}
      </ul>
      {error ? (
        <Button
          disabled={loading}
          onMouseDown={(event) => event.preventDefault()}
          onClick={loadMore}
        >
          retry search
        </Button>
      ) : null}
      {hits.length < total ? (
        <Button
          disabled={loading}
          onMouseDown={(event) => event.preventDefault()}
          onClick={loadMore}
        >
          load more ({hits.length} of {total})
        </Button>
      ) : null}
    </div>
  ) : null;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { Link, useNavigate, useBlocker } from '@tanstack/react-router';
import { formatDateIn } from '../dates.ts';
import { renderMarkdown } from '../markdown.ts';
import { markImported, parseScopes, previewStrip } from '../tk.ts';
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
import { stripStaleUploads, uploadToken } from './upload-tokens.ts';
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
      marks AI-drafted text. Type <code>/image</code> on its own line, or
      paste or drop an image, to insert one there.{' '}
      <Link to="/syntax">full syntax reference</Link>
    </p>
  ) : (
    <p className="compose-help">
      Markdown supported. Write <code>[[id]]</code> to link another item of
      yours or something you read (type <code>[[</code> for a picker), and{' '}
      <code>[TK]an instruction[/TK]</code> to mark a scope for AI-drafted text —
      a <em>generate</em> button appears, which saves and opens the editor.
      Type <code>/image</code> on its own line, or paste or drop an image, to
      insert one there.{' '}
      <Link to="/syntax">full syntax reference</Link>
    </p>
  );
}
/**
 * Put `block` on its own paragraph at [start, end) of `text`, adding only the
 * blank lines the surrounding text does not already supply.
 */
export function insertBlock(text: string, start: number, end: number, block: string) {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trail = !after || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  return { text: before + lead + block + trail + after, caret: (before + lead + block).length };
}

/** A line holding only `/image`, ending at the caret: the slash command. */
export function imageCommandAt(text: string, caret: number) {
  const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
  return text.slice(lineStart, caret).trim() === '/image' &&
    (caret === text.length || text[caret] === '\n')
    ? { start: lineStart, end: caret }
    : null;
}



/**
 * Image uploads for both composers. An image goes where the author is
 * writing, not at the end (session 30, Venkat): at the caret when the attach
 * button is pressed, in place of a `/image` line, or where an image is pasted
 * or dropped. A placeholder holds the spot while the upload runs, so text
 * typed meanwhile cannot shift where the image lands; it is replaced by the
 * real markdown on success and removed on failure.
 */
function useUpload(
  id: string | undefined | (() => Promise<string | undefined>),
  textarea: React.RefObject<HTMLTextAreaElement | null>,
  setText: (text: string) => void,
) {
  const input = useRef<HTMLInputElement>(null);
  const action = useAction();
  const [attached, setAttached] = useState('');
  // Where the next picked file goes; captured when the picker opens, because
  // the textarea loses its selection while the file dialog has focus.
  const target = useRef<{ start: number; end: number } | null>(null);
  const current = () => textarea.current?.value ?? '';
  const caret = () => {
    const el = textarea.current;
    return el ? { start: el.selectionStart, end: el.selectionEnd } : { start: current().length, end: current().length };
  };
  const upload = async (file: File, at: { start: number; end: number }) => {
    const itemId = typeof id === 'function' ? await id() : id;
    const token = uploadToken(file.name || 'image');
    const placed = insertBlock(current(), at.start, at.end, token);
    setText(placed.text);
    try {
      const media = await unwrap(
        BlyggerApi.uploadMedia({
          client,
          // inline: placed in the text, so shown only where its line is (studio#24).
          body: { file, inline: 'true', ...(itemId ? { item_id: itemId } : {}) },
        }),
      );
      setText(current().replace(token, `![](${mount}/${media.url})`));
      setAttached(media.url);
      if (itemId) await changed('item');
    } catch (error) {
      const now = current();
      const i = now.indexOf(token);
      if (i >= 0) setText(now.slice(0, i) + now.slice(i + token.length));
      throw error;
    }
  };
  const uploadFiles = (files: Iterable<File>, at: { start: number; end: number }) => {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return false;
    void action.run(async () => {
      for (const file of images) await upload(file, at);
    });
    return true;
  };
  const pick = (at = caret()) => {
    target.current = at;
    input.current?.click();
  };
  // Leaving mid-upload strands the placeholder in the saved draft and the
  // image at the bottom of the page (studio#24), so it asks first.
  useBlocker({
    enableBeforeUnload: () => action.busy,
    shouldBlockFn: () =>
      action.busy &&
      !window.confirm('An image is still uploading. Leave anyway? It will not be placed in the text.'),
  });
  return {
    input,
    action,
    attached,
    pick,
    /**
     * Call from the textarea's onChange with the new value. Returns the value
     * to keep: a completed `/image` line is removed and opens the picker.
     */
    command(value: string): string {
      const el = textarea.current;
      const at = el ? el.selectionStart : value.length;
      const hit = imageCommandAt(value, at);
      if (!hit) return value;
      const rest = value.slice(0, hit.start) + value.slice(hit.end);
      pick({ start: hit.start, end: hit.start });
      return rest;
    },
    textareaProps: {
      onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (uploadFiles(event.clipboardData.files, caret())) event.preventDefault();
      },
      onDragOver: (event: React.DragEvent<HTMLTextAreaElement>) => {
        if ([...event.dataTransfer.items].some((i) => i.kind === 'file')) event.preventDefault();
      },
      onDrop: (event: React.DragEvent<HTMLTextAreaElement>) => {
        if (uploadFiles(event.dataTransfer.files, caret())) event.preventDefault();
      },
    },
    element: (
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) uploadFiles([file], target.current ?? caret());
          event.target.value = '';
        }}
      />
    ),
  };
}
/**
 * The changelog note, confirmed before a new version publishes (#40, session
 * 33). Version 1 has nothing to describe and never asks. For a later version
 * the dialog opens whenever there is a note to confirm: one typed by hand, one
 * from *draft note*, or — when Settings' auto_change_notes is on and the field
 * was left empty — one drafted now. An empty note with the setting off
 * publishes straight away, as before. `generated` is true only when the
 * confirmed text is exactly what the model drafted.
 */
type NoteChoice = { note: string; generated: boolean };
function useNoteConfirm() {
  const settings = useSettings();
  const [state, setState] = useState<{
    version: number;
    text: string;
    drafted?: string;
    loading: boolean;
    error?: unknown;
    resolve: (choice: NoteChoice | null) => void;
  }>();
  const request = (
    item: { id: string; version: number },
    note: string,
    drafted?: string,
  ): Promise<NoteChoice | null> => {
    const typed = note.trim();
    if (item.version === 0) return Promise.resolve({ note: typed, generated: false });
    const auto = !typed && !!settings?.auto_change_notes;
    if (!typed && !auto) return Promise.resolve({ note: '', generated: false });
    return new Promise((resolve) => {
      setState({ version: item.version + 1, text: typed, drafted, loading: auto, resolve });
      if (!auto) return;
      unwrap(BlyggerApi.draftNote({ client, path: { id: item.id } }))
        .then((r) => setState((s) => s && { ...s, text: r.note, drafted: r.note, loading: false }))
        .catch((error) => setState((s) => s && { ...s, loading: false, error }));
    });
  };
  const finish = (choice: NoteChoice | null) => {
    state?.resolve(choice);
    setState(undefined);
  };
  const element = (
    <Modal
      open={!!state}
      close={() => finish(null)}
      title={state ? `Version ${state.version}` : ''}
      closeButton={false}
    >
      {state ? (
        <div className="note-confirm" id="note-confirm">
          <label htmlFor="note-confirm-text">Change</label>
          <textarea
            id="note-confirm-text"
            value={state.text}
            disabled={state.loading}
            placeholder={state.loading ? 'Drafting a note…' : 'what changed? (optional)'}
            onChange={(e) => setState({ ...state, text: e.target.value })}
          />
          {state.drafted !== undefined && state.text.trim() === state.drafted ? (
            <p className="h-hint" id="note-confirm-generated">
              Drafted by the model; it will be marked as generated unless you
              edit it.
            </p>
          ) : null}
          {state.error ? (
            <p className="h-hint">
              No note could be drafted:{' '}
              {state.error instanceof Error ? state.error.message : String(state.error)}.
              Write one, or confirm without.
            </p>
          ) : null}
          <p>
            <Button
              id="note-confirm-ok"
              className="primary"
              disabled={state.loading}
              onClick={() =>
                finish({
                  note: state.text.trim(),
                  generated: state.drafted !== undefined && state.text.trim() === state.drafted,
                })
              }
            >
              Confirm
            </Button>{' '}
            <Button id="note-confirm-cancel" onClick={() => finish(null)}>
              Cancel
            </Button>
          </p>
        </div>
      ) : null}
    </Modal>
  );
  return { request, element };
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
  // Autosave (studio#23): text in the composer used to reach the server only
  // through save, publish, the editor button or an in-app navigation, so a
  // crashed tab or a closed laptop lost it. The first save creates the draft,
  // so it waits for a pause and a few real characters — a stray keystroke
  // should not leave an item behind; after that, edits save like the editor's.
  useEffect(() => {
    if (saved || !text.trim()) return;
    if (!id && (text.replace(/\s/g, '').length < 8)) return;
    const timer = setTimeout(() => void action.run(save), id ? 400 : 3000);
    return () => clearTimeout(timer);
  }, [text, kind, id, saved]);
  const upload = useUpload(save, input, (next) => {
    setText(next);
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
          {...upload.textareaProps}
          onChange={(e) => {
            setText(upload.command(e.target.value));
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
              onClick={() => upload.pick()}
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
      <StaleNotice items={result.data ?? []} />
      {result.data?.map((item) => <ItemRow key={item.id} item={item} />)}
    </>
  );
}
function ItemRow({ item }: { item: ListItemsResponses[200]['items'][number] }) {
  const settings = useSettings();
  const action = useAction();
  const confirmNote = useNoteConfirm();
  const publishRow = async () => {
    const choice = await confirmNote.request(item, '');
    if (!choice) return;
    return unwrap(
      BlyggerApi.publishItem({
        client,
        path: { id: item.id },
        body: { ...(choice.note ? { note: choice.note } : {}), note_generated: choice.generated },
      }),
    );
  };
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
              onClick={() => mutate(publishRow)}
            >
              publish
            </Button>
            {saved ? <span className="save-state">saved</span> : null}
          </div>
          <Help />
        </div>
      ) : null}
      {confirmNote.element}
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
            onClick={() => mutate(publishRow)}
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
  if (!draft.current) {
    draft.current = new Draft(item.content_md, async (text) => {
      const transaction = collection.update(item.id, (row) => {
        row.content_md = text;
      });
      await transaction.isPersisted.promise;
      await changed('items', 'reading');
    });
    const cleaned = stripStaleUploads(item.content_md);
    if (cleaned !== item.content_md) draft.current.edit(cleaned);
  }
  const [text, setText] = useState(draft.current.text);
  const [note, setNote] = useState('');
  // The note the studio drafted (#40); `generated` is sent only while the
  // field still holds exactly that text — an edit makes the words the author's.
  const [drafted, setDrafted] = useState<string>();
  const confirmNote = useNoteConfirm();
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
  const upload = useUpload(item.id, input, edit);
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
            {...upload.textareaProps}
            onChange={(event) => edit(upload.command(event.target.value))}
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
          ) : null}{' '}
          <Button
            id="tk-impyrt-btn"
            className="link"
            disabled={replacing}
            title="Wrap the selected text as machine-generated text from another tool"
            onClick={() => {
              const el = input.current;
              if (!el) return;
              const value = draft.current!.text;
              const [from, to] = [el.selectionStart, el.selectionEnd];
              if (from === to) {
                window.alert(
                  'Select the pasted generated text first, then mark it.',
                );
                return;
              }
              edit(markImported(value, from, to));
            }}
          >
            mark selection as generated
          </Button>
        </h2>
        <ul>
          {preview?.scopes.map((scope) => (
            <li key={scope.index} className="tk-scope-row">
              {scope.imported ? (
                <span className="tk-instruction tk-imported">
                  generated elsewhere — disclosed, not regenerated
                </span>
              ) : (
                <>
                  <span className="tk-instruction">{scope.instruction}</span>
                  <Button
                    disabled={action.busy}
                    onClick={() => operation(() => generate(scope.index))}
                  >
                    {scope.hasOutput ? 'regenerate' : 'generate'}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="edit-bar">
        <span>
          <Button
            id="attach-btn"
            disabled={replacing}
            onClick={() => upload.pick()}
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
          {item.version > 0 && item.status === 'public' ? (
            <>
              {' '}
              <Button
                id="draft-note-btn"
                className="link"
                disabled={action.busy}
                title="Describe the change from the published version; you can edit it before publishing"
                onClick={() =>
                  operation(async () => {
                    const result = await unwrap(
                      BlyggerApi.draftNote({ client, path: { id: item.id } }),
                    );
                    setNote(result.note);
                    setDrafted(result.note);
                  })
                }
              >
                draft note
              </Button>
              {drafted !== undefined && note.trim() === drafted ? (
                <span className="h-hint" id="note-generated-hint">
                  {' '}
                  drafted — published as generated unless you edit it
                </span>
              ) : null}
            </>
          ) : null}
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
                const choice = await confirmNote.request(item, note, drafted);
                if (!choice) return;
                const result = await unwrap(
                  BlyggerApi.publishItem({
                    client,
                    path: { id: item.id },
                    body: { note: choice.note, note_generated: choice.generated },
                  }),
                );
                // A note describes one change; it must not ride along on the next.
                setNote('');
                setDrafted(undefined);
                return result;
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
      {confirmNote.element}
      {saved ? <p className="save-state">saved</p> : null}
      {upload.element}
      {upload.attached ? <p>attached: {upload.attached}</p> : null}
      {item.media.length ? (
        <section className="media">
          <h2>attachments</h2>
          {item.media.map((media) => {
            const inText = text.includes(media.url);
            return (
              <p key={media.id} className="attachment" data-media={media.id}>
                <a
                  href={`${mount}/${media.url}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {media.alt || media.url}
                </a>{' '}
                · {media.mime} ·{' '}
                <span className="h-hint">
                  {inText
                    ? 'in the text — delete its line to remove it'
                    : media.inline
                      ? 'not in the text, so not shown'
                      : 'shown below the post'}
                </span>
                {!inText ? (
                  <>
                    {' '}
                    <Button
                      className="link danger"
                      data-action="remove-media"
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(async () => {
                          await unwrap(
                            BlyggerApi.deleteMedia({
                              client,
                              path: { id: media.id },
                            }),
                          );
                          await changed('item');
                        })
                      }
                    >
                      remove
                    </Button>
                  </>
                ) : null}
              </p>
            );
          })}
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
      {item.status === 'public' && item.authored_kind === 'thread' ? (
        <QuotedSnapshots
          id={item.id}
          version={item.version}
          unpublished={
            (!saved && text !== item.content_md) ||
            (item.dirty &&
              !(
                text === item.published?.content_md &&
                !item.published?.generated.length
              ))
          }
        />
      ) : null}
      <section className="history" id="history">
        <h2>history</h2>
        {!item.versions.length ? (
          <p>Not yet published.</p>
        ) : (
          <ul className="h-list">
            {[...item.versions].reverse().map((v) => (
              <li className="h-row" key={v.version}>
                <strong>v{v.version}</strong> {v.note}
                {v.note_generated ? (
                  <span className="tc-chip" title="note drafted by the studio">generated</span>
                ) : null}{' '}
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
type Freshness = Awaited<ReturnType<typeof loadFreshness>>;
const loadFreshness = (id: string) =>
  unwrap(BlyggerApi.getItemFreshness({ client, path: { id } }));
const host = (origin: string) => {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
};
function quoteState(q: Freshness['quotes'][number]): string {
  switch (q.status) {
    case 'current':
      return `current · v${q.baked}`;
    case 'refreshable':
      return `v${q.baked} → v${q.held} available`;
    case 'behind':
      return `v${q.baked} → v${q.live} at its origin (imported on refresh)`;
    case 'retained':
    case 'passage-missing':
      return q.reason ?? q.status;
    case 'unresolvable':
      return `no longer resolves: ${q.reason ?? 'unknown'}`;
  }
}
/**
 * Quoted snapshots (decision #33's direct check; #38: detect always, refresh
 * only on a decision, never silently). A refresh is a republish of the
 * published words, so it waits for unpublished edits to be dealt with, and it
 * says so rather than folding them in.
 */
function QuotedSnapshots({
  id,
  version,
  unpublished,
}: {
  id: string;
  version: number;
  unpublished: boolean;
}) {
  const action = useAction();
  const [report, setReport] = useState<Freshness>();
  const [failed, setFailed] = useState<unknown>();
  const [note, setNote] = useState('refreshed quoted snapshots');
  useEffect(() => {
    let live = true;
    setFailed(undefined);
    loadFreshness(id)
      .then((r) => live && setReport(r))
      .catch((e) => live && setFailed(e));
    return () => {
      live = false;
    };
  }, [id, version]);
  if (failed) return <Failure error={failed} />;
  if (!report || !report.quotes.length) return null;
  const refresh = async () => {
    const result = await unwrap(
      BlyggerApi.refreshItem({ client, path: { id }, body: { note } }),
    );
    await changed('item', 'items', 'reading');
    setReport(await loadFreshness(id));
    return result;
  };
  return (
    <section className="snapshots" id="snapshots">
      <h2>
        quoted snapshots{' '}
        <span className="h-hint">
          {report.stale
            ? `${report.stale} of ${report.quotes.length} quote an older version`
            : 'all current'}
        </span>
      </h2>
      <ul className="h-list">
        {report.quotes.map((q, i) => (
          <li className={`h-row q-${q.status}`} key={`${q.id}-${i}`} data-status={q.status}>
            <code>{q.id.slice(0, 8)}</code>{' '}
            <span className="q-source">{q.origin ? host(q.origin) : 'own'}</span>
            {q.partial ? <span className="tc-chip">excerpt</span> : null}{' '}
            <span className="q-state">{quoteState(q)}</span>
          </li>
        ))}
      </ul>
      {report.stale && !report.blocking ? (
        unpublished ? (
          <p className="h-hint" role="status">
            This thread has unpublished edits. A refresh republishes the
            published words with new quotes, so publish or discard the edits
            first.
          </p>
        ) : (
          <p>
            <input
              className="note"
              aria-label="refresh note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />{' '}
            <Button
              data-action="refresh-quotes"
              className="primary"
              disabled={action.busy}
              onClick={() => void action.run(refresh)}
            >
              refresh {report.stale} {report.stale === 1 ? 'quote' : 'quotes'} → v
              {version + 1}
            </Button>
          </p>
        )
      ) : null}
      {report.blocking ? (
        <p className="h-hint" role="status">
          A republish would fail until the quotes marked above are edited or
          removed in the working copy.
        </p>
      ) : null}
      <Failure error={action.error} />
    </section>
  );
}
/** Threads whose quotes are behind, database-only — the cross-blyg view. */
function StaleNotice({
  items: rows,
}: {
  items: ListItemsResponses[200]['items'];
}) {
  const [stale, setStale] = useState<{ id: string; stale: number; blocking: number }[]>([]);
  const versions = rows.map((r) => `${r.id}:${r.version}`).join(',');
  useEffect(() => {
    let live = true;
    unwrap(BlyggerApi.listStaleThreads({ client }))
      .then((r) => live && setStale(r.items))
      .catch(() => live && setStale([]));
    return () => {
      live = false;
    };
  }, [versions]);
  if (!stale.length) return null;
  const label = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return id.slice(0, 8);
    const p = previewFromHtml(renderMarkdown(extractDirectives(row.content_md).withoutDirectives));
    return p.title || p.body || id.slice(0, 8);
  };
  return (
    <section className="stale-notice" role="status">
      <p>
        {stale.length === 1
          ? '1 published thread quotes'
          : `${stale.length} published threads quote`}{' '}
        an older version of something:
      </p>
      <ul>
        {stale.map((t) => (
          <li key={t.id}>
            <Link to="/edit/$id" params={{ id: t.id }} hash="snapshots">
              {label(t.id)}
            </Link>{' '}
            <span className="h-hint">
              {t.stale ? `${t.stale} stale` : ''}
              {t.stale && t.blocking ? ' · ' : ''}
              {t.blocking ? `${t.blocking} need editing` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
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

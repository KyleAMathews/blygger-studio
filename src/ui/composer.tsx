/*
 * The composer core shared by the Studio and the clipper: textarea tools
 * (caret, link, pour-over), the Markdown preview, and image upload. The
 * Studio-specific parts (which client, where media lives, what to refresh,
 * how to guard leaving mid-upload) arrive as arguments.
 */
import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { BlyggerClient } from '../../sdk/dist/browser.js';
import { BlyggerApi, unwrap } from '../../sdk/dist/browser.js';
import { toast } from './sheets.tsx';
import { insertLink, isUrl, linkToast } from './links.ts';
import { uploadToken } from './upload-tokens.ts';
import { imageCommandAt, insertBlock } from './text-edit.ts';
export { imageCommandAt, insertBlock };

export function useAction() {
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

/** Move the caret once React has written the new value, and tell the palette. */
export function placeCaret(el: HTMLTextAreaElement, start: number, end = start) {
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start, end);
    el.dispatchEvent(new Event('selectionchange'));
  });
}
/** Link `raw` over [start, end) of the textarea: the selected words, or an autolink. */
export function linkInto(
  el: HTMLTextAreaElement,
  raw: string,
  at: { start: number; end: number },
  change: (text: string) => void,
) {
  const result = insertLink(el.value, at.start, at.end, raw);
  if (!result) {
    toast('That is not a URL.');
    return;
  }
  change(result.text);
  placeCaret(el, result.caret);
  toast(linkToast(result));
}
/**
 * Pour-over (Burrow): a lone URL pasted while text is selected links the
 * selection. Anything else — no selection, an image, prose — pastes as usual.
 */
export function pourOver(
  event: React.ClipboardEvent<HTMLTextAreaElement>,
  change: (text: string) => void,
) {
  const el = event.currentTarget;
  if (el.selectionStart === el.selectionEnd || event.clipboardData.files.length) return false;
  const text = event.clipboardData.getData('text/plain');
  if (!isUrl(text)) return false;
  event.preventDefault();
  linkInto(el, text, { start: el.selectionStart, end: el.selectionEnd }, change);
  return true;
}

export const getPreview = (
  client: BlyggerClient,
  text: string,
  itemId: string | undefined,
  kind: 'fragment' | 'thread',
  signal?: AbortSignal,
) =>
  unwrap(
    BlyggerApi.preview({
      client,
      body: { content_md: text, ...(itemId ? { item_id: itemId } : {}), kind },
      signal,
    }),
  );
export type Preview = Awaited<ReturnType<typeof getPreview>>;

/** The server's preview of `text`, 150 ms after typing stops; stale requests are aborted. */
export function usePreview(client: BlyggerClient, text: string, itemId: string | undefined, kind: 'fragment' | 'thread') {
  const [preview, setPreview] = useState<Preview>();
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void getPreview(client, text, itemId, kind, controller.signal)
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
  }, [client, text, itemId, kind]);
  return preview;
}

/** What a host supplies to useUpload: its client, where uploaded media is served, and its own refresh and leave guard. */
export interface UploadDeps {
  client: BlyggerClient;
  mediaUrl: (url: string) => string;
  onUploaded?: (itemId: string) => Promise<void>;
  useLeaveGuard: (busy: () => boolean) => void;
}
/**
 * Image uploads for both composers. An image goes where the author is
 * writing, not at the end (session 30, Venkat): at the caret when the attach
 * button is pressed, in place of a `/image` line, or where an image is pasted
 * or dropped. A placeholder holds the spot while the upload runs, so text
 * typed meanwhile cannot shift where the image lands; it is replaced by the
 * real markdown on success and removed on failure.
 */
export function useUpload(
  id: string | undefined | (() => Promise<string | undefined>),
  textarea: RefObject<HTMLTextAreaElement | null>,
  setText: (text: string) => void,
  deps: UploadDeps,
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
          client: deps.client,
          // inline: placed in the text, so shown only where its line is (studio#24).
          body: { file, inline: 'true', ...(itemId ? { item_id: itemId } : {}) },
        }),
      );
      setText(current().replace(token, `![](${deps.mediaUrl(media.url)})`));
      setAttached(media.url);
      if (itemId) await deps.onUploaded?.(itemId);
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
  deps.useLeaveGuard(() => action.busy);
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

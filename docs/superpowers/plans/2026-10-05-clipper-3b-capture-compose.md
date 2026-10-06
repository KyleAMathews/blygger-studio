# Clipper Plan 3b: Capture, Compose and the Local Draft

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Highlight text on any page, right-click "Quote in Blygger", and the side panel opens with the selection quoted and the source cited, kept durably on the device while the owner writes. Saving to the blyg is Plan 3c.

**Architecture:**
- The service worker owns everything durable. Captures land in an inbox in `storage.local` before anything else sees them, and the worker moves them into a per-blyg draft with a revision number.
- One panel at a time holds an editing lease over a runtime port. It sends edits through an edit queue that keeps one edit in flight.
- A capture script, injected on demand, reads the page and returns a plain value. It touches no extension API.
- Pure modules hold the rules, so unit tests drive them directly: capture validation, quote composition, the transclusion judge, the draft store and the edit queue. The worker and panel are thin wiring around them.

**Tech Stack:**
- WXT 0.21.4 and React 19, as in Plan 3a.
- `turndown` 7.2.4 converts the selection's HTML to Markdown inside the capture script.
- `happy-dom` 20.14.5 is a DOM for the page-reading unit tests.
- vitest runs the extension units, and the Workers pool runs laws about server state.
- Playwright drives the real extension in Chromium.

**Spec:** `docs/superpowers/specs/2026-10-05-chrome-clipper-design.md`:
- §4 (all of it) and §6.
- The laws L1, L1b, L6, L7 and L8 in §7.1.
- The 3b rows of §7.4.

This is Plan 3b of 3a–3c. Plan 3c covers:
- Save draft and Publish, with their persisted phases, the retry queue and recent clips.
- The rest of the oracle campaign, the remaining mutation controls, and packaging.

## Global Constraints

- **The worker is the single authority for the inbox and the draft** (spec §4.1, §4.6):
  - Panels never write `storage.local`; they send `edit` messages.
  - `storage.local` keys: `inbox` (an array of `StoredCapture`) and `draft:{base}`, where `base` is `origin + mount + "/"` of the connected blyg.
  - A draft write and its inbox deletion are always **one** `local.set` call.
- **Capture limits** (spec §6):
  - A quote is refused over 50 000 characters: "That selection is too long to clip (50 KB at most)."
  - Every other field is cut to 2 000 characters.
  - Every page URL must parse as absolute http(s), or it is dropped. Links in the quote may also be `mailto:`.
  - The excerpt is the first 200 graphemes of `quote.text`.
- **Panel safety:**
  - The panel renders page values only as React text.
  - The only HTML it renders is the server's `POST /api/preview` output, through `Html`.
- **Capture script:**
  - It imports only `extension/lib/page.ts` and `turndown`. It calls no `chrome.*`/`browser.*` API, sends no message and reads no storage.
  - This also answers Plan 3a's carry-forward on `storage.local` access. Chrome cannot restrict `storage.local` from content scripts, so the guard is that our only injected code never touches it, enforced by a bundle-reach test.
- **The trusted-sender rule (carried from Plan 3a):**
  - The worker answers a message or port only when `sender.id` is the extension's own id and `sender.url` is on the extension's own origin.
  - Content scripts, pages and other extensions get nothing. This covers every request type, `connect-manual` included.
- **Lease:**
  - One port holds the lease. A free lease goes to a panel that asks for it on `hello`.
  - "Edit here" takes it, and the lease is released when its port disconnects.
  - The worker never changes the body while a holder exists. It hands each capture to the holder, which inserts the quote and sends it back with `absorb: [uuid]`.
- **Edit queue:**
  - At most one `edit` is in flight. Input that arrives meanwhile coalesces into one pending value.
  - "Saved on this device." shows only when nothing is pending or in flight.
  - A refusal stops sending, and "Edit here" never resends unsent text.
- **Ruling, recorded: one `edit` mutation, not three.** The spec's `appendCapture`, `setBody` and `editCitation` become one `edit { baseRevision, text?, absorb?, citation?, transclusion? }` message.
  - Why: the spec requires every body-affecting change to pass through one sequencer (§4.6). Three message types would need three queues, or one queue that orders them, and a single coalescing mutation is that queue.
  - Cost if wrong: renaming in 3c's controls.
- **Ruling, recorded: the e2e build reaches its fixture hosts.**
  - Why: Playwright cannot click Chrome's context menu or press an extension command, so the e2e build (`--mode e2e`) adds `host_permissions: ["https://*.example/*", "http://127.0.0.1/*"]` and a `__clipperTest` hook that calls the same menu handler.
  - The production manifest stays without host permissions, and the manifest test asserts that.
  - Cost if wrong: the context-menu and gesture wiring is checked by unit tests with fakes, not in real Chrome.
- **Ruling, recorded: no image paste in the clipper composer yet.** `useUpload` needs a server item id, and the server draft is created only on Save (spec §4.6), which is Plan 3c. Cost if wrong: 3c adds it.
- **Ruling, recorded: CDP `ServiceWorker.stopWorker` is not used.** Worker loss is tested by restarting the browser profile, which kills the worker *and* every panel. This is a stronger fault than stopping the worker alone, and it needs no CDP target plumbing. Cost if wrong: 3c's lifecycle campaign adds the narrower fault.
- **Blyg identity of a captured page:**
  - It is the URL the item JSON was fetched from (after redirects) with its trailing `items/{id}.json` removed.
  - It is never the document's self-asserted `origin` field, the same rule the server uses for subscriptions (`src/transclusion.ts:229`).
- **Shared selection rule:** `normalizeSelection` and `quoteLines` move to `src/selection.ts`, which imports nothing, so the extension can use the server's exact rule. `src/markdown.ts` and `src/item-create.ts` import from it, and Studio behaviour is unchanged.
- **Approved test files:** `extension/tests/*.test.ts`, `test/clipper-oauth.test.ts` and `e2e/clipper.spec.ts`. Fixture HTML under `extension/tests/fixtures/` is data, not tests. No other new test files.
- **Studio safety:** never import `src/ui/app.tsx` or `src/ui/data.ts` from the extension. Do not turn on React StrictMode in the panel: `Connected` creates its data instance in `useMemo` and disposes it in an effect, which StrictMode's double effects would break (Plan 3a carry-forward).
- **Environment:**
  - Node is `/usr/local/bin/node`, so prefix commands with `PATH=/usr/local/bin:$PATH`.
  - `npm install` needs `--legacy-peer-deps`.
  - Work in `/Users/kylemathews/programs/blygger-studio/.worktrees/chrome-clipper`.
  - Never commit `~/.blygger-clipper-dev-key.pem`.

## Review Focus

1. **A selection that spans several paragraphs or list items.**
   - Expected: the quote keeps the blocks as separate quoted paragraphs. In transclusion mode the attached blockquote still matches the server's text of the item.
   - Tests: Task 2 (two-paragraph selection) and Task 3 (a real preview of a two-paragraph item).
2. **A page with no title, no Open Graph tags and a relative canonical link.**
   - Expected: the title falls back to the host and the canonical URL becomes absolute.
   - Tests: Task 1 (fallbacks) and Task 2 (relative canonical).
3. **Selected text that looks like Markdown**, such as `*stars*` or `[brackets](here)`.
   - Expected: it stays literal and does not become emphasis or a link.
   - Test: Task 2.
4. **A selection over 50 KB.**
   - Expected: a plain refusal, shown in the panel, and nothing stored.
   - Tests: Task 1 (validation) and Task 4 (the store is untouched).
5. **A clip while the extension is not connected.**
   - Expected: the clip waits in the inbox, the connect screen says so, and connecting moves it into the draft.
   - Tests: Task 4 (unit) and Task 7 (the connect screen shows the count).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/selection.ts` | `normalizeBlocks`, `normalizeSelection`, `quoteLines`, with no imports |
| `extension/lib/capture.ts` | `Capture`, `StoredCapture`, `validateCapture`, `httpUrl`, `safeLinks`, `fragmentUrl`, `stamp`, `CaptureError` |
| `extension/lib/page.ts` | `readPage`: metadata, selection Markdown and context, blyg detection (runs in the page) |
| `extension/entrypoints/capture.ts` | The unlisted capture script: defines `__blyggerCapture` |
| `extension/lib/compose.ts` | `Draft`, `Citation`, `Transclusion`, quote blocks, `appendClip`, `absorb`, `switchQuote`, `stubOf` |
| `extension/lib/transclusion.ts` | `judgeTransclusion`, `checkTransclusion`, `subscribeAndWait`, `REASONS` |
| `extension/lib/edit-queue.ts` | `Edit`, `EditResult`, `EditQueue` |
| `extension/lib/draft-store.ts` | `DraftStore`: inbox, drain, lease, edits |
| `extension/lib/clip.ts` | `createClipper`, `installMenus`, menu and command ids |
| `extension/lib/channel.ts` | Worker side of the panel ports; `PanelMessage`, `WorkerMessage` |
| `extension/lib/panel-channel.ts` | Panel side of the port, reconnecting |
| `extension/lib/messages.ts` | (modify) `trustedSender`; `serve` takes the gate |
| `extension/lib/tokens.ts` | (modify) `ConnectionChanged`, retried once by `accessToken` |
| `extension/manifest.ts` | `manifestFor(mode)` |
| `extension/entrypoints/background.ts` | (rewrite) wires menus, commands, clipper, draft store, channel |
| `extension/panel/useDraft.ts` | The panel's draft state: port, lease, queue, conflict |
| `extension/panel/useTransclusion.ts` | Runs the transclusion check for the lease holder |
| `extension/panel/SourceCard.tsx` | The source card |
| `extension/panel/Compose.tsx` | The compose view |
| `extension/panel/App.tsx`, `Connect.tsx`, `panel.css` | (modify) |
| `scripts/mutation-engine.ts` | The control runner, extracted from the auth runner |
| `scripts/verify-clipper-mutations.ts` | The clipper's controls |
| `extension/tests/capture.test.ts`, `page.test.ts`, `compose.test.ts`, `draft-store.test.ts`, `edit-queue.test.ts`, `clip.test.ts`, `panel.test.ts` | New extension units |
| `extension/tests/fixtures/article.html`, `hostile.html` | Saved page fixtures |

---

### Task 1: The shared selection rule and the capture record

**Files:**
- Create: `src/selection.ts`, `extension/lib/capture.ts`, `extension/tests/capture.test.ts`
- Modify: `src/markdown.ts:116-150`, `src/item-create.ts:6,50-55`

**Interfaces:**
- Consumes: `graphemePrefix(s, n)` from `src/text.ts`.
- Produces:
  - `src/selection.ts`: `normalizeBlocks(segments: string[]): string`, `normalizeSelection(text: string): string` and `quoteLines(selection: string): string`.
  - `extension/lib/capture.ts`:
    - Types: `Selector`, `BlygRef`, `Capture`, `StoredCapture` (`Capture & { uuid: string; capturedAt: string }`).
    - Constants: `QUOTE_CAP = 50_000`, `FIELD_CAP = 2_000`.
    - `class CaptureError extends Error`, `validateCapture(raw: unknown): Capture` and `stamp(c: Capture, uuid: string, at: Date): StoredCapture`.
    - `httpUrl(v: unknown, schemes?: string[]): string | undefined`, `safeLinks(markdown: string): string` and `fragmentUrl(canonical: string, selector: Selector): string`.

- [ ] **Step 1: Move the selection rule into `src/selection.ts`**

Create `src/selection.ts`:

```ts
/*
 * The one selection rule (§16.4, decision #49). `selectionText` in
 * markdown.ts uses it to check a quote at publish; select-to-quote and the
 * clipper use it to make the quote. The two must agree: a disagreement would
 * be an affordance that reliably produces unpublishable drafts. It imports
 * nothing, so the clipper's worker can use the server's exact rule.
 */

/** Whitespace collapses within a block; blocks join with "\n"; empty blocks drop. */
export function normalizeBlocks(segments: string[]): string {
  return segments
    .map((seg) => seg.replace(/\s+/g, " ").trim())
    .filter((seg) => seg !== "")
    .join("\n");
}

/**
 * The same rule applied to text that is already text — a browser selection,
 * where `Selection.toString()` has already put a newline at each block
 * boundary.
 */
export function normalizeSelection(text: string): string {
  return normalizeBlocks(text.split("\n"));
}

/** A partial transclusion's attached blockquote: one quoted paragraph per block. */
export function quoteLines(selection: string): string {
  return selection
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n>\n");
}
```

In `src/markdown.ts`:
- Delete the `function normalizeBlocks` definition (lines 119-124).
- Delete `export function normalizeSelection` together with its doc comment (lines 137-150).
- Keep `const BLOCK_SEP` and `selectionText`, which still call `normalizeBlocks`.
- Add next to the existing imports at the top:

```ts
import { normalizeBlocks } from "./selection.ts";
export { normalizeSelection } from "./selection.ts";
```

In `src/item-create.ts`, delete the local `function quoteLines` (lines 50-55). Change line 6 to:

```ts
import { selectionText } from "./markdown.ts";
import { normalizeSelection, quoteLines } from "./selection.ts";
```

- [ ] **Step 2: Check the Studio is unchanged**

Run: `PATH=/usr/local/bin:$PATH npx tsc --noEmit -p . && PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run --maxWorkers=2 test/item-create test/partial test/transclusion test/markdown`

Expected: tsc clean and every selected file passes. If a filter matches no file, run `ls test | grep -E "partial|transclu|markdown|item-create"` and use the real names. The full Worker suite runs in Task 8.

- [ ] **Step 3: Write the failing capture tests**

Create `extension/tests/capture.test.ts`:

```ts
/**
 * L6 Inert page content and L7 Citation fidelity, at the worker's door
 * (spec §6, §7.1). Sources: OWASP XSS prevention (URLs from untrusted input
 * are allowlisted by scheme); WICG scroll-to-text-fragment §3.3 (the text
 * directive and its percent-encoding). The judges here are independent
 * models: URL parsing for schemes, and decoding the directive back to text.
 */
import { describe, expect, test } from 'vitest';
import { importedHtmlAttacks } from '../../test/fixtures/imported-html-attacks.ts';
import { CaptureError, FIELD_CAP, QUOTE_CAP, fragmentUrl, validateCapture } from '../lib/capture.ts';

const base = () => ({
  url: 'https://news.example/2026/10/post?x=1#top',
  canonical: 'https://news.example/2026/10/post',
  title: 'A Post About Things',
  siteName: 'News Example',
  author: 'Ada Writer',
  published: '2026-10-01T09:00:00Z',
  favicon: 'https://news.example/favicon.ico',
  quote: { markdown: 'Some _emphasis_, `code` and [a link](https://safe.example/).', text: 'Some emphasis, code and a link.', prefix: 'the paragraph before it ends here.', suffix: 'And then the next sentence goes on.' },
  blyg: { origin: 'https://blyg.example/b', id: 'abc123', version: 2, kind: 'fragment' },
});
type Raw = ReturnType<typeof base>;

const URL_ATTACKS = ['javascript:alert(1)', 'java\tscript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', '&#106;avascript:alert(1)', '//evil.example/x', 'file:///etc/passwd'];
const MARKDOWN_ATTACKS = ['[x](javascript:alert(1))', '[x](<javascript:alert(1)>)', '<javascript:alert(1)>', '![x](javascript:alert(1))', '[x](data:text/html,hi)'];
const PAYLOADS = [...URL_ATTACKS, ...MARKDOWN_ATTACKS, ...importedHtmlAttacks.map((a) => a.html)];
const FIELDS = ['url', 'canonical', 'title', 'siteName', 'author', 'published', 'favicon', 'quote.markdown', 'quote.text', 'quote.prefix', 'quote.suffix', 'blyg.origin', 'blyg.id'] as const;

function withField(path: string, value: unknown): Raw {
  const raw = base() as Record<string, any>;
  const [head, tail] = path.split('.');
  if (tail) raw[head] = { ...raw[head], [tail]: value };
  else raw[head] = value;
  return raw as Raw;
}
/** Every link target in Markdown: inline links, images and autolinks. */
function markdownTargets(md: string): string[] {
  return [...md.matchAll(/\]\(\s*<?([^)\s>]*)/g), ...md.matchAll(/<([a-z][a-z0-9+.-]*:[^>\s]*)>/gi)].map((m) => m[1]);
}
const scheme = (u: string) => { try { return new URL(u).protocol; } catch { return 'unparseable'; } };

describe('L6: every page URL is http(s) or dropped', () => {
  test('inventory sweep: each field set to each hostile payload', () => {
    for (const field of FIELDS) for (const payload of PAYLOADS) {
      let capture;
      try { capture = validateCapture(withField(field, payload)); } catch (error) {
        expect(error, `${field}=${payload}: only a CaptureError may refuse`).toBeInstanceOf(CaptureError);
        continue;
      }
      const urls = [capture.url, capture.canonical, capture.favicon, capture.quote?.fragmentUrl, capture.blyg?.origin].filter((u): u is string => !!u);
      for (const u of urls) expect(['http:', 'https:'], `every page URL is http(s) or dropped (L6): ${field}=${payload} gave ${u}`).toContain(scheme(u));
      for (const t of markdownTargets(capture.quote?.markdown ?? '')) expect(['http:', 'https:', 'mailto:'], `every page URL is http(s) or dropped (L6): link ${t} from ${field}`).toContain(scheme(t));
      for (const text of [capture.title, capture.siteName, capture.author ?? '']) expect(typeof text).toBe('string');
    }
  });

  test('contrast: safe formatting, an https link and a mailto link survive exactly', () => {
    const md = 'Some _emphasis_, `code` and [a link](https://safe.example/) or [mail](mailto:ada@example.com).';
    expect(validateCapture(withField('quote.markdown', md)).quote!.markdown).toBe(md);
  });

  test('an unsafe link keeps its words', () => {
    expect(validateCapture(withField('quote.markdown', 'see [the words](javascript:void0) here')).quote!.markdown).toBe('see the words here');
  });

  test('a page whose own address is not a web address cannot be clipped', () => {
    expect(() => validateCapture(withField('url', 'chrome://settings/'))).toThrow('This page cannot be clipped: its address is not a web address.');
  });
});

describe('caps and fallbacks (spec §6)', () => {
  test('a quote over 50 KB is refused with a plain message', () => {
    expect(() => validateCapture(withField('quote.text', 'a'.repeat(QUOTE_CAP + 1)))).toThrow('That selection is too long to clip (50 KB at most).');
  });
  test('other fields are cut to 2 000 characters', () => {
    expect(validateCapture(withField('title', 't'.repeat(5000))).title.length).toBeLessThanOrEqual(FIELD_CAP);
  });
  test('no title, no site name and no canonical fall back to the host and the address without its fragment', () => {
    const raw = { url: 'https://plain.example/a/b?q=1#frag' };
    expect(validateCapture(raw)).toEqual({ url: 'https://plain.example/a/b?q=1#frag', canonical: 'https://plain.example/a/b?q=1', title: 'plain.example', siteName: 'plain.example' });
  });
  test('a blyg reference gets a trailing slash; a malformed one is dropped', () => {
    expect(validateCapture(base()).blyg).toEqual({ origin: 'https://blyg.example/b/', id: 'abc123', version: 2, kind: 'fragment' });
    expect(validateCapture(withField('blyg.id', 'has space')).blyg).toBeUndefined();
  });
  test('an invalid published date is dropped; a valid one becomes ISO', () => {
    expect(validateCapture(withField('published', 'yesterday-ish')).published).toBeUndefined();
    expect(validateCapture(base()).published).toBe('2026-10-01T09:00:00.000Z');
  });
});

describe('L7: the fragment link selects the quoted text', () => {
  /** An independent decoder of the text directive (WICG §3.3.1). */
  function decode(url: string) {
    const directive = new URL(url).hash.split(':~:text=')[1];
    const terms = directive.split(',');
    const prefix = terms[0].endsWith('-') ? decodeURIComponent(terms.shift()!.slice(0, -1)) : undefined;
    const suffix = terms.at(-1)!.startsWith('-') ? decodeURIComponent(terms.pop()!.slice(1)) : undefined;
    return { prefix, suffix, terms: terms.map(decodeURIComponent) };
  }

  test('a one-line quote with directive characters decodes back to itself', () => {
    const exact = 'Commas, dashes - and (brackets) & ampersands';
    const url = fragmentUrl('https://news.example/post', { exact, prefix: 'before', suffix: 'after' });
    expect(decode(url), 'the fragment link decodes to the quote (L7)').toEqual({ prefix: 'before', suffix: 'after', terms: [exact] });
    expect(url, 'no raw ( or ) so a Markdown link can hold it').not.toMatch(/[()]/);
  });

  test('a multi-paragraph quote uses textStart,textEnd from its first and last lines', () => {
    const exact = 'One two three four five six seven\nmiddle\nalpha beta gamma delta epsilon zeta';
    expect(decode(fragmentUrl('https://news.example/post', { exact })), 'the fragment link decodes to the quote (L7)').toEqual({ prefix: undefined, suffix: undefined, terms: ['One two three four five', 'beta gamma delta epsilon zeta'] });
  });

  test('context is cut to 32 characters on word boundaries, within its block', () => {
    const q = validateCapture(withField('quote.prefix', 'an earlier block\nthe paragraph before it ends here.')).quote!;
    expect(q.selector.prefix).toBe('paragraph before it ends here.');
    expect(validateCapture(base()).quote!.selector.suffix).toBe('And then the next sentence goes');
  });

  test('the canonical URL loses any fragment of its own', () => {
    expect(fragmentUrl('https://news.example/post#section', { exact: 'x' })).toBe('https://news.example/post#:~:text=x');
  });
});
```

- [ ] **Step 4: Run them to see them fail**

Run: `PATH=/usr/local/bin:$PATH npm run test:ext -- capture`

Expected: FAIL, because `../lib/capture.ts` does not exist.

- [ ] **Step 5: Write `extension/lib/capture.ts`**

```ts
/*
 * The capture record (spec §4.2) and the worker's check of it (spec §6). The
 * capture script returns raw page values; nothing from the page is trusted
 * until it has passed through validateCapture.
 */
import { normalizeSelection } from '../../src/selection.ts';
import { graphemePrefix } from '../../src/text.ts';

export interface Selector { exact: string; prefix?: string; suffix?: string }
export interface BlygRef { origin: string; id: string; version: number; kind: 'fragment' | 'thread' }
export interface Capture {
  url: string;
  canonical: string;
  title: string;
  siteName: string;
  author?: string;
  published?: string;
  favicon?: string;
  quote?: { markdown: string; text: string; selector: Selector; fragmentUrl: string };
  blyg?: BlygRef;
  degraded?: boolean;
}
export interface StoredCapture extends Capture { uuid: string; capturedAt: string }

export const QUOTE_CAP = 50_000;
export const FIELD_CAP = 2_000;
const CONTEXT = 32;
const LINK_SCHEMES = ['http:', 'https:', 'mailto:'];
const ID = /^[A-Za-z0-9_-]{1,128}$/;

export class CaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CaptureError';
  }
}

const record = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);

/** A page string on one line: control characters dropped, whitespace collapsed, capped. */
function field(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = graphemePrefix(v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim(), FIELD_CAP);
  return s || undefined;
}

/** An absolute URL with an allowed scheme, or nothing (spec §6). */
export function httpUrl(v: unknown, schemes = ['http:', 'https:']): string | undefined {
  if (typeof v !== 'string' || v.length > FIELD_CAP) return undefined;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return undefined;
  }
  return schemes.includes(url.protocol) ? url.href : undefined;
}

/** Links, images and autolinks whose target is not http(s) or mailto become their words. */
export function safeLinks(markdown: string): string {
  return markdown
    .replace(/(!?)\[([^\]]*)\]\(\s*<?([^)\s>]*)>?(?:\s+"[^"]*")?\s*\)/g, (whole, bang: string, text: string, href: string) => (bang ? text : httpUrl(href, LINK_SCHEMES) ? whole : text))
    .replace(/<([a-z][a-z0-9+.-]*:[^>\s]*)>/gi, (whole, href: string) => (httpUrl(href, LINK_SCHEMES) ? whole : href));
}

/** Text directive terms (WICG §3.3.1), with `(` and `)` encoded too so a Markdown link can hold the URL. */
const term = (s: string) => encodeURIComponent(s).replace(/[-!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const words = (s: string) => s.split(' ').filter(Boolean);

/** `canonical#:~:text=…`: the exact text for one short line, else the first and last few words. */
export function fragmentUrl(canonical: string, selector: Selector): string {
  const lines = selector.exact.split('\n');
  const body = lines.length === 1 && selector.exact.length <= 300
    ? term(selector.exact)
    : `${term(words(lines[0]).slice(0, 5).join(' '))},${term(words(lines[lines.length - 1]).slice(-5).join(' '))}`;
  const prefix = selector.prefix ? `${term(selector.prefix)}-,` : '';
  const suffix = selector.suffix ? `,-${term(selector.suffix)}` : '';
  return `${canonical.split('#')[0]}#:~:text=${prefix}${body}${suffix}`;
}

/** The ≤32 characters beside the quote, within its own block, dropping a cut word. */
function context(raw: unknown, side: 'prefix' | 'suffix'): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const lines = raw.split('\n');
  const line = (side === 'prefix' ? lines[lines.length - 1] : lines[0]).replace(/\s+/g, ' ').trim();
  if (line.length <= CONTEXT) return line || undefined;
  const window = side === 'prefix' ? line.slice(-CONTEXT) : line.slice(0, CONTEXT);
  const cut = side === 'prefix' ? window.replace(/^\S*\s+/, '') : window.replace(/\s+\S*$/, '');
  return cut && cut !== window ? cut : undefined;
}

/** Selected text used as Markdown when the page gave none (a degraded clip): literal, not syntax. */
const literal = (text: string) => text.split('\n').map((line) => line.replace(/[\\`*_[\]<>]/g, (c) => `\\${c}`)).join('\n\n');

function readQuote(q: Record<string, unknown> | undefined, canonical: string): Capture['quote'] {
  if (!q || typeof q.text !== 'string') return undefined;
  if (q.text.length > QUOTE_CAP || (typeof q.markdown === 'string' && q.markdown.length > QUOTE_CAP)) throw new CaptureError('That selection is too long to clip (50 KB at most).');
  const text = normalizeSelection(q.text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' '));
  if (!text) return undefined;
  const markdown = safeLinks(typeof q.markdown === 'string' && q.markdown.trim() ? q.markdown.replace(/\u0000/g, '').trim() : literal(text));
  const selector: Selector = { exact: text };
  const prefix = context(q.prefix, 'prefix');
  const suffix = context(q.suffix, 'suffix');
  if (prefix) selector.prefix = prefix;
  if (suffix) selector.suffix = suffix;
  return { markdown, text, selector, fragmentUrl: fragmentUrl(canonical, selector) };
}

function readBlyg(b: Record<string, unknown> | undefined): BlygRef | undefined {
  if (!b) return undefined;
  const origin = httpUrl(b.origin);
  const version = b.version;
  if (!origin || typeof b.id !== 'string' || !ID.test(b.id) || typeof version !== 'number' || !Number.isInteger(version) || version < 1) return undefined;
  if (b.kind !== 'fragment' && b.kind !== 'thread') return undefined;
  return { origin: origin.endsWith('/') ? origin : `${origin}/`, id: b.id, version, kind: b.kind };
}

export function validateCapture(raw: unknown): Capture {
  const r = record(raw);
  const url = httpUrl(r?.url);
  if (!r || !url) throw new CaptureError('This page cannot be clipped: its address is not a web address.');
  const host = new URL(url).host;
  const canonical = httpUrl(r.canonical) ?? url.split('#')[0];
  const capture: Capture = { url, canonical, title: field(r.title) ?? host, siteName: field(r.siteName) ?? host };
  const author = field(r.author);
  const published = field(r.published);
  const favicon = httpUrl(r.favicon);
  const quote = readQuote(record(r.quote), canonical);
  const blyg = readBlyg(record(r.blyg));
  if (author) capture.author = author;
  if (published && !Number.isNaN(Date.parse(published))) capture.published = new Date(published).toISOString();
  if (favicon) capture.favicon = favicon;
  if (quote) capture.quote = quote;
  if (blyg) capture.blyg = blyg;
  if (r.degraded === true) capture.degraded = true;
  return capture;
}

export const stamp = (capture: Capture, uuid: string, at: Date): StoredCapture => ({ ...capture, uuid, capturedAt: at.toISOString() });
```

- [ ] **Step 6: Run the tests until they pass**

Run: `PATH=/usr/local/bin:$PATH npm run test:ext -- capture`

Expected: PASS. If the inventory sweep fails, fix `capture.ts` and keep the test as it is. The test is the law.

- [ ] **Step 7: Commit**

```bash
git add src/selection.ts src/markdown.ts src/item-create.ts extension/lib/capture.ts extension/tests/capture.test.ts
git commit -m "Capture record: validated, capped, http(s)-only, with a text-fragment link"
```

---

### Task 2: Reading the page, and the capture script

**Files:**
- Create: `extension/lib/page.ts`, `extension/entrypoints/capture.ts`, `extension/tests/page.test.ts`, `extension/tests/fixtures/article.html`, `extension/tests/fixtures/hostile.html`
- Modify: `package.json` (devDependencies)

**Interfaces:**
- Produces:
  - `PageRead`, the raw shape that `validateCapture` accepts.
  - `ReadInput`: `{ url: string; range: Range | null; selectionText: string; fetchFn?: (url: string, init?: RequestInit) => Promise<Response> }`.
  - `readPage(doc: Document, input: ReadInput): Promise<PageRead>` and `selectionMarkdown(range: Range, base: string): string`.
  - The built script `/capture.js`, which sets `globalThis.__blyggerCapture: () => Promise<PageRead>`.

- [ ] **Step 1: Add the dependencies**

Run: `PATH=/usr/local/bin:$PATH npm install --legacy-peer-deps --save-dev turndown@7.2.4 @types/turndown@5.0.6 happy-dom@20.14.5`

Expected: `package.json` devDependencies gain all three, and `package-lock.json` changes.

- [ ] **Step 2: Save the fixtures**

Create `extension/tests/fixtures/article.html`:

```html
<!doctype html>
<html><head>
<title>Fallback title</title>
<meta property="og:title" content="A Post About Things">
<meta property="og:site_name" content="News Example">
<meta property="article:published_time" content="2026-10-01T09:00:00Z">
<link rel="canonical" href="/2026/10/post">
<link rel="icon" href="/static/icon.png">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"News Example"},{"@type":"Article","author":{"@type":"Person","name":"Ada Writer"},"datePublished":"2026-10-01T09:00:00Z"}]}</script>
</head><body>
<article>
<p id="one">The paragraph before it ends here. First quoted paragraph with <em>emphasis</em> and <code>code</code>.</p>
<p id="two">Second quoted paragraph with <a href="/rel/path">a relative link</a>, <a href="javascript:alert(1)">a bad link</a> and <img src="/chart.png" alt="a chart">.<script>window.bad = 1</script></p>
<p id="three">Use *stars* and [brackets](not a link) literally. And then the next sentence goes on.</p>
</article>
</body></html>
```

Create `extension/tests/fixtures/hostile.html`:

```html
<!doctype html>
<html><head>
<title>&lt;img src=x onerror="document.documentElement.dataset.compromised=1"&gt;</title>
<meta property="og:title" content="<script>document.documentElement.dataset.compromised=1</script>Hostile">
<meta property="og:site_name" content="<svg onload=&quot;document.documentElement.dataset.compromised=1&quot;>">
<meta name="author" content="&quot;><img src=x onerror=&quot;document.documentElement.dataset.compromised=1&quot;>">
<link rel="canonical" href="javascript:document.documentElement.dataset.compromised=1">
<link rel="icon" href="javascript:document.documentElement.dataset.compromised=1">
</head><body>
<p id="bait">Hostile words <a href="javascript:document.documentElement.dataset.compromised=1">click me</a> and <a href="data:text/html,<script>1</script>">data</a> plus <b onclick="document.documentElement.dataset.compromised=1">bold</b>.</p>
</body></html>
```

- [ ] **Step 3: Write the failing page tests**

Create `extension/tests/page.test.ts`:

```ts
/**
 * Reading a page (spec §4.2) against saved fixtures in a real DOM
 * (happy-dom), and the capture script's reach (spec §6: it holds nothing and
 * calls no extension API). Markdown is judged by its rendered meaning, not
 * by Turndown's exact spacing.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { describe, expect, test } from 'vitest';
import { readPage } from '../lib/page.ts';
import { validateCapture } from '../lib/capture.ts';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const URL_ = 'https://news.example/2026/10/post?ref=feed#top';

function load(name: string, url = URL_) {
  const window = new Window({ url });
  window.document.write(fixture(name));
  return window.document as unknown as Document;
}
function rangeOver(doc: Document, startId: string, endId: string) {
  const range = doc.createRange();
  range.setStart(doc.getElementById(startId)!.firstChild!, 'The paragraph before it ends here. '.length);
  range.setEndAfter(doc.getElementById(endId)!.lastChild!);
  return range;
}
const noFetch = async () => { throw new Error('no network in this test'); };

describe('metadata', () => {
  test('Open Graph, JSON-LD and links are read, and relative URLs become absolute (Review Focus 2)', async () => {
    const doc = load('article.html');
    const read = await readPage(doc, { url: URL_, range: null, selectionText: '', fetchFn: noFetch });
    expect(read).toEqual({
      url: URL_,
      canonical: 'https://news.example/2026/10/post',
      title: 'A Post About Things',
      siteName: 'News Example',
      author: 'Ada Writer',
      published: '2026-10-01T09:00:00Z',
      favicon: 'https://news.example/static/icon.png',
    });
  });
});

describe('the selection', () => {
  test('a two-paragraph selection keeps both paragraphs, formatting and safe absolute links (Review Focus 1)', async () => {
    const doc = load('article.html');
    const range = rangeOver(doc, 'one', 'two');
    const read = await readPage(doc, { url: URL_, range, selectionText: 'First quoted paragraph with emphasis and code.\nSecond quoted paragraph with a relative link, a bad link and .', fetchFn: noFetch });
    const md = read.quote!.markdown;
    expect(md.split(/\n\s*\n/).length, 'two paragraphs stay two blocks').toBe(2);
    expect(md).toContain('_emphasis_');
    expect(md).toContain('`code`');
    expect(md).toContain('[a relative link](https://news.example/rel/path)');
    expect(md, 'an unsafe link keeps its words only').toContain('a bad link');
    expect(md).not.toContain('javascript:');
    expect(md, 'an image becomes its alt text').toContain('a chart');
    expect(md).not.toContain('window.bad');
    expect(read.quote!.prefix.endsWith('The paragraph before it ends here. '), 'the prefix is the text before the quote in its block').toBe(true);
  });

  test('text that looks like Markdown stays literal (Review Focus 3)', async () => {
    const doc = load('article.html');
    const p = doc.getElementById('three')!;
    const range = doc.createRange();
    range.selectNodeContents(p);
    const read = await readPage(doc, { url: URL_, range, selectionText: p.textContent!, fetchFn: noFetch });
    expect(read.quote!.markdown).toContain('\\*stars\\*');
    expect(read.quote!.markdown).toContain('\\[brackets\\]');
  });

  test('a collapsed or empty selection is no quote', async () => {
    const doc = load('article.html');
    const range = doc.createRange();
    range.setStart(doc.getElementById('one')!.firstChild!, 3);
    expect((await readPage(doc, { url: URL_, range, selectionText: '', fetchFn: noFetch })).quote).toBeUndefined();
  });

  test('hostile page values come out as data that validation makes safe', async () => {
    const doc = load('hostile.html', 'https://hostile.example/p');
    const p = doc.getElementById('bait')!;
    const range = doc.createRange();
    range.selectNodeContents(p);
    const capture = validateCapture(await readPage(doc, { url: 'https://hostile.example/p', range, selectionText: p.textContent!, fetchFn: noFetch }));
    expect(capture.canonical).toBe('https://hostile.example/p');
    expect(capture.favicon, 'a javascript: icon is dropped, not replaced').toBeUndefined();
    expect(capture.quote!.markdown).not.toMatch(/javascript:|data:|onclick/);
    expect(capture.quote!.markdown).toContain('click me');
  });
});

describe('blyg detection (spec §4.2)', () => {
  const blygPage = (href: string) => {
    const window = new Window({ url: 'https://blyg.example/b/f/abc123/' });
    window.document.write(`<!doctype html><html><head><link rel="alternate" type="application/json" href="${href}"></head><body><p>x</p></body></html>`);
    return window.document as unknown as Document;
  };

  test('a same-origin item document names the blyg by where it was fetched from', async () => {
    const seen: string[] = [];
    const fetchFn = async (url: string) => { seen.push(url); return Response.json({ id: 'abc123', version: 3, kind: 'fragment', origin: 'https://liar.example/' }); };
    const read = await readPage(blygPage('/b/items/abc123.json'), { url: 'https://blyg.example/b/f/abc123/', range: null, selectionText: '', fetchFn });
    expect(seen).toEqual(['https://blyg.example/b/items/abc123.json']);
    expect(read.blyg, 'identity is the fetch location, never the self-asserted origin').toEqual({ origin: 'https://blyg.example/b/', id: 'abc123', version: 3, kind: 'fragment' });
  });

  test('a cross-origin alternate is never fetched', async () => {
    let called = false;
    const read = await readPage(blygPage('https://other.example/items/abc123.json'), { url: 'https://blyg.example/b/f/abc123/', range: null, selectionText: '', fetchFn: async () => { called = true; return Response.json({}); } });
    expect(called).toBe(false);
    expect(read.blyg).toBeUndefined();
  });

  test('a document whose id does not match its address is not a blyg item', async () => {
    const read = await readPage(blygPage('/b/items/abc123.json'), { url: 'https://blyg.example/b/f/abc123/', range: null, selectionText: '', fetchFn: async () => Response.json({ id: 'other', version: 1, kind: 'fragment' }) });
    expect(read.blyg).toBeUndefined();
  });
});

describe('the capture script holds nothing (spec §6)', () => {
  async function reach(entry: { entryPoints: string[] } | { stdin: { contents: string; resolveDir: string; loader: 'ts' } }) {
    const result = await build({ ...entry, bundle: true, write: false, metafile: true, platform: 'browser', format: 'esm', packages: 'external', outdir: 'reach-out', logLevel: 'silent' });
    const inputs = Object.keys(result.metafile!.inputs);
    const imports = Object.values(result.metafile!.inputs).flatMap((input) => input.imports.map((i) => i.path));
    return { inputs, imports, text: result.outputFiles!.map((f) => f.text).join('\n') };
  }
  const forbidden = (r: Awaited<ReturnType<typeof reach>>) => [
    ...r.inputs.filter((f) => !/(^|\/)(entrypoints\/capture|lib\/page)\.ts$/.test(f)),
    ...r.imports.filter((p) => p !== 'turndown'),
    ...(/\b(chrome|browser)\.(storage|runtime|tabs|identity|scripting)\b/.test(r.text) ? ['an extension API call'] : []),
  ];

  test('it bundles only page.ts and turndown, and calls no extension API', async () => {
    expect(forbidden(await reach({ entryPoints: [resolve(import.meta.dirname, '../entrypoints/capture.ts')] })), 'the capture script reaches only page.ts').toEqual([]);
  });

  test('contrast: the reach check catches a storage import and an API call', async () => {
    const r = await reach({ stdin: { contents: "import '../lib/storage.ts'; import 'wxt/browser'; chrome.storage.local.get('x');", resolveDir: resolve(import.meta.dirname, '../entrypoints'), loader: 'ts' } });
    expect(forbidden(r).length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 4: Run them to see them fail**

Run: `PATH=/usr/local/bin:$PATH npm run test:ext -- page`

Expected: FAIL, because `../lib/page.ts` does not exist.

- [ ] **Step 5: Write `extension/lib/page.ts`**

```ts
/*
 * Runs inside the clicked frame (spec §2, §4.2). It reads the page and returns
 * plain values; it holds nothing and calls no extension API. Everything it
 * returns is untrusted until the worker's validateCapture has seen it.
 */
import TurndownService from 'turndown';

export interface PageRead {
  url: string;
  canonical?: string;
  title?: string;
  siteName?: string;
  author?: string;
  published?: string;
  favicon?: string;
  quote?: { markdown: string; text: string; prefix: string; suffix: string };
  blyg?: { origin: string; id: string; version: unknown; kind: unknown };
}
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
export interface ReadInput { url: string; range: Range | null; selectionText: string; fetchFn?: Fetch }

const DROP = 'script,style,iframe,frame,form,input,button,select,textarea,object,embed,noscript,svg,math,template,link,meta,canvas,video,audio';
const BLOCK = 'p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,td,th,dd,dt,figcaption,div,section,article,main,body';
const LINK = new Set(['http:', 'https:', 'mailto:']);
const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '_' });

function resolve(href: string | null | undefined, base: string) {
  if (!href) return undefined;
  try {
    return new URL(href, base).href;
  } catch {
    return undefined;
  }
}
const meta = (doc: Document, key: string) => doc.querySelector<HTMLMetaElement>(`meta[property="${key}"], meta[name="${key}"]`)?.content?.trim() || undefined;

function jsonLd(doc: Document): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') {
      found.push(v as Record<string, unknown>);
      visit((v as Record<string, unknown>)['@graph']);
    }
  };
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      visit(JSON.parse(script.textContent ?? ''));
    } catch {
      continue;
    }
  }
  return found;
}
const personName = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? personName(v[0]) : v && typeof v === 'object' && typeof (v as { name?: unknown }).name === 'string' ? (v as { name: string }).name : undefined;

/** The selection as Markdown: links absolute and http(s)/mailto only, images as their alt text, no active elements. */
export function selectionMarkdown(range: Range, base: string): string {
  const doc = range.startContainer.ownerDocument!;
  const box = doc.createElement('div');
  box.append(range.cloneContents());
  for (const el of box.querySelectorAll(DROP)) el.remove();
  for (const img of box.querySelectorAll('img')) img.replaceWith(doc.createTextNode(img.getAttribute('alt') ?? ''));
  for (const a of box.querySelectorAll('a')) {
    const href = resolve(a.getAttribute('href'), base);
    if (href && LINK.has(new URL(href).protocol)) {
      for (const attr of [...a.attributes]) a.removeAttribute(attr.name);
      a.setAttribute('href', href);
    } else a.replaceWith(...a.childNodes);
  }
  for (const el of box.querySelectorAll('*')) for (const attr of [...el.attributes]) if (!(el.tagName === 'A' && attr.name === 'href')) el.removeAttribute(attr.name);
  return turndown.turndown(box).trim();
}

const blockOf = (node: Node) => (node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest(BLOCK) ?? node.ownerDocument!.body;

/** Up to 64 characters beside the selection, within its block; the worker trims to 32. */
function beside(range: Range, side: 'before' | 'after'): string {
  const doc = range.startContainer.ownerDocument!;
  const r = doc.createRange();
  if (side === 'before') {
    r.setStart(blockOf(range.startContainer), 0);
    r.setEnd(range.startContainer, range.startOffset);
    return r.toString().slice(-64);
  }
  const block = blockOf(range.endContainer);
  r.setStart(range.endContainer, range.endOffset);
  r.setEnd(block, block.childNodes.length);
  return r.toString().slice(0, 64);
}

/** A blyg item page names its item document; identity is where that document was fetched from. */
async function detectBlyg(doc: Document, url: string, fetchFn: Fetch): Promise<PageRead['blyg']> {
  const href = resolve(doc.querySelector('link[rel~="alternate"][type="application/json"]')?.getAttribute('href'), url);
  if (!href || new URL(href).origin !== new URL(url).origin) return undefined;
  try {
    const response = await fetchFn(href, { credentials: 'omit', signal: AbortSignal.timeout(5000) });
    if (!response.ok) return undefined;
    const item = (await response.json()) as { id?: unknown; version?: unknown; kind?: unknown };
    const at = response.url || href;
    if (typeof item.id !== 'string' || !at.endsWith(`items/${item.id}.json`)) return undefined;
    return { origin: at.slice(0, -`items/${item.id}.json`.length), id: item.id, version: item.version, kind: item.kind };
  } catch {
    return undefined;
  }
}

export async function readPage(doc: Document, input: ReadInput): Promise<PageRead> {
  const { url, range } = input;
  const ld = jsonLd(doc);
  const ldValue = (key: string) => ld.map((o) => o[key]).find((v) => v !== undefined);
  const datePublished = ldValue('datePublished');
  const read: PageRead = { url };
  const set = <K extends keyof PageRead>(key: K, value: PageRead[K] | undefined) => {
    if (value !== undefined) read[key] = value;
  };
  set('canonical', resolve(doc.querySelector('link[rel~="canonical"]')?.getAttribute('href'), url) ?? resolve(meta(doc, 'og:url'), url));
  set('title', meta(doc, 'og:title') ?? (doc.title.trim() || undefined));
  set('siteName', meta(doc, 'og:site_name'));
  set('author', personName(ldValue('author')) ?? meta(doc, 'author') ?? meta(doc, 'article:author'));
  set('published', (typeof datePublished === 'string' ? datePublished : undefined) ?? meta(doc, 'article:published_time'));
  set('favicon', resolve(doc.querySelector('link[rel~="icon"]')?.getAttribute('href'), url) ?? resolve('/favicon.ico', url));
  if (range && !range.collapsed && input.selectionText.trim()) {
    read.quote = { markdown: selectionMarkdown(range, url), text: input.selectionText, prefix: beside(range, 'before'), suffix: beside(range, 'after') };
  }
  set('blyg', await detectBlyg(doc, url, input.fetchFn ?? ((u, init) => fetch(u, init))));
  return read;
}
```

- [ ] **Step 6: Write the capture script**

Create `extension/entrypoints/capture.ts`:

```ts
import { readPage } from '../lib/page.ts';

// Injected on demand into the clicked frame (spec §2). It defines one function
// the worker then calls, and returns a value; it holds nothing.
export default defineUnlistedScript(() => {
  Object.assign(globalThis, {
    __blyggerCapture: () => {
      const selection = getSelection();
      const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
      return readPage(document, { url: location.href, range, selectionText: selection?.toString() ?? '' });
    },
  });
});
```

- [ ] **Step 7: Run the tests until they pass, and build**

Run: `PATH=/usr/local/bin:$PATH npm run test:ext -- page && PATH=/usr/local/bin:$PATH npm run ext:build && ls extension/.output/chrome-mv3/capture.js`

Expected: PASS, and `capture.js` exists.
- If `happy-dom`'s `document.write` does not build the document, use `window.document.documentElement.innerHTML = html` instead, and record the change.
- If the prefix test fails only because happy-dom's `Range.toString` collapses whitespace differently, compare with `.trim()` and record that. Do not loosen any other assertion.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json extension/lib/page.ts extension/entrypoints/capture.ts extension/tests/page.test.ts extension/tests/fixtures
git commit -m "Capture script reads the page and returns plain values"
```

---

### Task 3: Composing quotes, and the transclusion judge

**Files:**
- Create: `extension/lib/compose.ts`, `extension/lib/transclusion.ts`, `extension/tests/compose.test.ts`
- Modify: `test/clipper-oauth.test.ts` (append one `describe`)

**Interfaces:**
- Consumes: `Capture`, `StoredCapture`, `validateCapture` and `stamp` from Task 1, `quoteLines` from `src/selection.ts`, and `graphemePrefix` from `src/text.ts`.
- Produces from `compose.ts`:
  - Types: `Citation { source; author? }`, the `Transclusion` union (`pending` | `used { held }` | `fallback { reason }` | `subscribe`) and `Draft { revision; captures: StoredCapture[]; text; citation?; transclusion? }`.
  - `EMPTY_DRAFT`.
  - Quote text: `blockquote(md)`, `urlQuote(c)`, `transclusionQuote(c)`, `clipBlock(draft, c)` and `appendClip(text, draft, c): string`.
  - Draft changes: `absorb(draft, captures, text?): Draft`, `switchQuote(text, c, to: 'used' | 'url'): string | null` and `defaultCitation(c): Citation`.
  - `StubOf` and `stubOf(draft): StubOf | undefined`.
- Produces from `transclusion.ts`:
  - `PreviewLike` and `REASONS`.
  - `judgeTransclusion(preview, c, base, canSubscribe): Transclusion`.
  - `checkTransclusion(c, { preview, base, canSubscribe }): Promise<Transclusion>`.
  - `subscribeAndWait(c, { subscribe, preview, base, sleep, now }): Promise<Transclusion>`.

- [ ] **Step 1: Write the failing unit tests**

Create `extension/tests/compose.test.ts`:

```ts
/**
 * How clips become Markdown (spec §4.3–§4.5) and the saved citation (L7,
 * spec §4.3). The server's own rendering of these strings is checked in
 * test/clipper-oauth.test.ts; here the text itself is the contract.
 */
import { describe, expect, test } from 'vitest';
import { stamp, validateCapture, type StoredCapture } from '../lib/capture.ts';
import { absorb, appendClip, EMPTY_DRAFT, stubOf, switchQuote, transclusionQuote, urlQuote } from '../lib/compose.ts';

let n = 0;
function clip(over: Record<string, unknown> = {}): StoredCapture {
  const raw = {
    url: 'https://news.example/post', title: 'A Post', siteName: 'News Example', author: 'Ada Writer',
    quote: { markdown: 'First _line_.', text: 'First line.' },
    ...over,
  };
  return stamp(validateCapture(raw), `uuid-${++n}`, new Date('2026-10-05T12:00:00Z'));
}

describe('clips become quotes', () => {
  test('a first clip is a blockquote with the cursor below it', () => {
    const c = clip();
    expect(appendClip('', EMPTY_DRAFT, c)).toBe('> First _line_.\n\n');
  });
  test('a page-only first clip leaves the body empty', () => {
    expect(appendClip('', EMPTY_DRAFT, clip({ quote: undefined }))).toBe('');
  });
  test('a second clip from the same page joins the body', () => {
    const first = clip();
    const draft = absorb(EMPTY_DRAFT, [first]);
    expect(appendClip('> First _line_.\n\nMy words.', draft, clip({ quote: { markdown: 'Later.', text: 'Later.' } }))).toBe('> First _line_.\n\nMy words.\n\n> Later.\n\n');
  });
  test('a clip from another page adds a source line, its title escaped', () => {
    const draft = absorb(EMPTY_DRAFT, [clip()]);
    const other = clip({ url: 'https://other.example/x', title: 'Odd [title]', quote: { markdown: 'Elsewhere.', text: 'Elsewhere.' } });
    const text = appendClip(draft.text, draft, other);
    expect(text.endsWith(`> Elsewhere.\n\n— [Odd \\[title\\]](<${other.quote!.fragmentUrl}>)\n\n`)).toBe(true);
  });
  test('in transclusion mode, a second clip of the same item is another partial', () => {
    const blyg = { origin: 'https://blyg.example/', id: 'abc', version: 2, kind: 'fragment' };
    const first = clip({ blyg });
    const draft = { ...absorb(EMPTY_DRAFT, [first]), transclusion: { state: 'used' as const, held: 2 } };
    const second = clip({ blyg, quote: { markdown: 'x', text: 'Two\nblocks' } });
    expect(appendClip('![[abc]]\n> First line.\n\n', draft, second)).toBe('![[abc]]\n> First line.\n\n![[abc]]\n> Two\n>\n> blocks\n\n');
  });
});

describe('switching to a transclusion', () => {
  const blyg = { origin: 'https://blyg.example/', id: 'abc', version: 2, kind: 'fragment' };
  test('an untouched first quote switches, keeping what follows', () => {
    const c = clip({ blyg });
    expect(switchQuote(`${urlQuote(c)}\n\nMine.`, c, 'used')).toBe(`${transclusionQuote(c)}\n\nMine.`);
  });
  test('an edited first quote does not', () => {
    const c = clip({ blyg });
    expect(switchQuote('> First _li', c, 'used')).toBeNull();
  });
});

describe('absorb sets the defaults from the first clip', () => {
  test('citation from the first clip; a blyg quote waits for its check', () => {
    const blyg = { origin: 'https://blyg.example/', id: 'abc', version: 2, kind: 'fragment' };
    const draft = absorb(EMPTY_DRAFT, [clip({ blyg }), clip({ siteName: 'Later Site' })]);
    expect(draft.citation).toEqual({ source: 'News Example', author: 'Ada Writer' });
    expect(draft.transclusion).toEqual({ state: 'pending' });
    expect(draft.captures).toHaveLength(2);
    expect(draft.revision, 'absorb does not number revisions; the store does').toBe(0);
  });
});

describe('L7: the saved citation', () => {
  test('a URL quote cites the canonical page with a capped excerpt and the fragment link', () => {
    const long = 'word '.repeat(80).trim();
    const c = clip({ quote: { markdown: long, text: long } });
    const stub = stubOf(absorb(EMPTY_DRAFT, [c]));
    expect([...(stub as { cited: { excerpt: string } }).cited.excerpt].length, 'the excerpt is a caption, at most 200 characters (L7)').toBeLessThanOrEqual(200);
    expect(stub).toEqual({ url: 'https://news.example/post', cited: { source: 'News Example', author: 'Ada Writer', excerpt: long.slice(0, 200), url: c.quote!.fragmentUrl, retrieved: '2026-10-05T12:00:00.000Z' } });
  });
  test('an edited citation is what is saved', () => {
    const draft = { ...absorb(EMPTY_DRAFT, [clip()]), citation: { source: 'Edited Source' } };
    expect((stubOf(draft) as { cited: { source: string; author?: string } }).cited).toMatchObject({ source: 'Edited Source' });
    expect((stubOf(draft) as { cited: { author?: string } }).cited.author).toBeUndefined();
  });
  test('a page-only clip cites the canonical page and no excerpt', () => {
    const stub = stubOf(absorb(EMPTY_DRAFT, [clip({ quote: undefined })])) as { cited: Record<string, unknown> };
    expect(stub.cited.url).toBe('https://news.example/post');
    expect(stub.cited.excerpt).toBeUndefined();
  });
  test('a transclusion cites the item at the held version', () => {
    const blyg = { origin: 'https://blyg.example/', id: 'abc', version: 3, kind: 'fragment' };
    const draft = { ...absorb(EMPTY_DRAFT, [clip({ blyg })]), transclusion: { state: 'used' as const, held: 2 } };
    expect(stubOf(draft)).toEqual({ origin: 'https://blyg.example/', id: 'abc', version: 2 });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `PATH=/usr/local/bin:$PATH npm run test:ext -- compose`

Expected: FAIL, because `../lib/compose.ts` does not exist.

- [ ] **Step 3: Write `extension/lib/compose.ts`**

```ts
/*
 * Quotes, the draft and its citation (spec §4.3–§4.6). Pure: the worker and
 * the panel both call these, so a capture becomes the same text whichever of
 * them inserts it.
 */
import { quoteLines } from '../../src/selection.ts';
import { graphemePrefix } from '../../src/text.ts';
import type { Capture, StoredCapture } from './capture.ts';

export interface Citation { source: string; author?: string }
export type Transclusion = { state: 'pending' } | { state: 'used'; held: number } | { state: 'fallback'; reason: string } | { state: 'subscribe' };
export interface Draft { revision: number; captures: StoredCapture[]; text: string; citation?: Citation; transclusion?: Transclusion }
export const EMPTY_DRAFT: Draft = { revision: 0, captures: [], text: '' };

export const blockquote = (markdown: string) => markdown.split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n');
export const urlQuote = (c: Capture) => (c.quote ? blockquote(c.quote.markdown) : '');
/** The partial grammar (§16.4): the directive, then the selection as an attached blockquote. */
export const transclusionQuote = (c: Capture) => (c.blyg ? `![[${c.blyg.id}]]${c.quote ? `\n${quoteLines(c.quote.text)}` : ''}` : urlQuote(c));
const linkText = (s: string) => s.replace(/[\\[\]]/g, (ch) => `\\${ch}`);
const sameItem = (a: Capture, b: Capture) => !!a.blyg && !!b.blyg && a.blyg.origin === b.blyg.origin && a.blyg.id === b.blyg.id;

/** What one more clip adds (spec §4.5): stub_of names only the first source, so later pages get a source line. */
export function clipBlock(draft: Pick<Draft, 'captures' | 'transclusion'>, c: Capture): string {
  const first = draft.captures[0];
  if (!first) return urlQuote(c);
  if (draft.transclusion?.state === 'used' && c.quote && sameItem(first, c)) return transclusionQuote(c);
  const quote = urlQuote(c);
  if (first.canonical === c.canonical) return quote;
  const source = `— [${linkText(c.title)}](<${c.quote?.fragmentUrl ?? c.canonical}>)`;
  return quote ? `${quote}\n\n${source}` : source;
}

export function appendClip(text: string, draft: Pick<Draft, 'captures' | 'transclusion'>, c: Capture): string {
  const block = clipBlock(draft, c);
  if (!block) return text;
  const head = text.replace(/\s+$/, '');
  return head ? `${head}\n\n${block}\n\n` : `${block}\n\n`;
}

export const defaultCitation = (c: Capture): Citation => ({ source: c.siteName, ...(c.author ? { author: c.author } : {}) });

/**
 * Captures joining the draft. Without `text`, each one's quote is appended;
 * with it, the text is the lease holder's, which already holds the quotes.
 * The first capture sets the citation and, for a quote of a blyg item, a
 * pending transclusion check. Revisions are the store's to number.
 */
export function absorb(draft: Draft, captures: StoredCapture[], text?: string): Draft {
  let next = draft;
  for (const c of captures) {
    if (!next.captures.length) next = { ...next, citation: next.citation ?? defaultCitation(c), ...(c.blyg && c.quote ? { transclusion: { state: 'pending' } as const } : {}) };
    if (text === undefined) next = { ...next, text: appendClip(next.text, next, c) };
    next = { ...next, captures: [...next.captures, c] };
  }
  return text === undefined ? next : { ...next, text };
}

/** Swap the first quote between its two forms, only if the owner has not edited it. */
export function switchQuote(text: string, c: Capture, to: 'used' | 'url'): string | null {
  const [from, into] = to === 'used' ? [urlQuote(c), transclusionQuote(c)] : [transclusionQuote(c), urlQuote(c)];
  return from && text.startsWith(from) ? into + text.slice(from.length) : null;
}

export type StubOf =
  | { origin: string; id: string; version: number }
  | { url: string; cited: { source: string; author?: string; excerpt?: string; url: string; retrieved: string } };

/** The thread's stub_of (spec §4.3, §4.4). */
export function stubOf(draft: Draft): StubOf | undefined {
  const first = draft.captures[0];
  if (!first) return undefined;
  if (draft.transclusion?.state === 'used' && first.blyg) return { origin: first.blyg.origin, id: first.blyg.id, version: draft.transclusion.held };
  const cite = draft.citation ?? defaultCitation(first);
  return {
    url: first.canonical,
    cited: {
      source: cite.source,
      ...(cite.author ? { author: cite.author } : {}),
      ...(first.quote ? { excerpt: graphemePrefix(first.quote.text, 200) } : {}),
      url: first.quote?.fragmentUrl ?? first.canonical,
      retrieved: first.capturedAt,
    },
  };
}
```

- [ ] **Step 4: Write `extension/lib/transclusion.ts`**

```ts
/*
 * L8 Transclusion identity (spec §4.4, decision #26). The resolver matches on
 * id alone and prefers local items, so a preview that resolves is not enough:
 * it must resolve to the captured origin and id, or the clip is a URL quote.
 */
import type { Capture } from './capture.ts';
import { transclusionQuote, type Transclusion } from './compose.ts';

export interface PreviewLike { errors?: { reason: string }[]; transclusions?: { id: string; version: number; origin?: string }[] }

export const REASONS = {
  edited: 'The quote no longer matches the copy of this item your blyg holds, so it is quoted as a link.',
  identity: 'Your blyg has a different item under that id, so this is quoted as a link.',
  waited: 'Subscribed, but your blyg has not fetched this item yet, so it is quoted as a link.',
  other: (reason: string) => `Your blyg cannot quote this item as a transclusion (${reason}), so it is quoted as a link.`,
};
const slash = (u: string) => (u.endsWith('/') ? u : `${u}/`);

export function judgeTransclusion(preview: PreviewLike, c: Capture, base: string, canSubscribe: boolean): Transclusion {
  const blyg = c.blyg!;
  const local = slash(blyg.origin) === slash(base);
  const error = preview.errors?.[0]?.reason;
  if (error) {
    if (/^quoted passage not found/.test(error)) return { state: 'fallback', reason: REASONS.edited };
    if (error === 'unknown item' && !local && canSubscribe) return { state: 'subscribe' };
    return { state: 'fallback', reason: REASONS.other(error) };
  }
  const t = preview.transclusions?.[0];
  const right = !!t && t.id === blyg.id && (local ? t.origin === undefined : t.origin !== undefined && slash(t.origin) === slash(blyg.origin));
  if (!right) return { state: 'fallback', reason: REASONS.identity };
  return { state: 'used', held: t!.version };
}

export interface CheckDeps { preview: (contentMd: string) => Promise<PreviewLike>; base: string; canSubscribe: boolean }

export async function checkTransclusion(c: Capture, deps: CheckDeps): Promise<Transclusion> {
  return judgeTransclusion(await deps.preview(transclusionQuote(c)), c, deps.base, deps.canSubscribe);
}

/** "Subscribe to {site}…" (spec §4.4): subscribe, then poll preview every 3 s for up to 60 s. */
export async function subscribeAndWait(
  c: Capture,
  deps: Omit<CheckDeps, 'canSubscribe'> & { subscribe: () => Promise<void>; sleep: (ms: number) => Promise<void>; now: () => number },
): Promise<Transclusion> {
  await deps.subscribe();
  const until = deps.now() + 60_000;
  for (;;) {
    const preview = await deps.preview(transclusionQuote(c));
    if (preview.errors?.[0]?.reason !== 'unknown item') return judgeTransclusion(preview, c, deps.base, false);
    if (deps.now() + 3000 > until) return { state: 'fallback', reason: REASONS.waited };
    await deps.sleep(3000);
  }
}
```

- [ ] **Step 5: Run the unit tests until they pass**

Run: `PATH=/usr/local/bin:$PATH npm run test:ext -- compose`

Expected: PASS.

- [ ] **Step 6: Write the failing server-backed tests**

Append to `test/clipper-oauth.test.ts`. Put these imports with the others at the top of the file:

```ts
import { stamp, validateCapture } from '../extension/lib/capture.ts';
import { absorb, appendClip, EMPTY_DRAFT, stubOf } from '../extension/lib/compose.ts';
import { checkTransclusion, REASONS, subscribeAndWait } from '../extension/lib/transclusion.ts';
import { StubSchema } from '../src/contract/resources.ts';
```

Then the block:

```ts
/**
 * L7 Citation fidelity and L8 Transclusion identity against the real Worker
 * (spec §4.3, §4.4; decision #26). Server truth comes from the real preview
 * and create routes, never a stub.
 */
describe('clip composition against the real server (L6, L7, L8)', () => {
  const BASE = 'https://oauth-oracle.example.test/blyg/';
  const at = new Date('2026-10-05T12:00:00Z');
  const capture = (over: Record<string, unknown>) => stamp(validateCapture({ url: 'https://news.example/post', title: 'A Post', siteName: 'News Example', ...over }), crypto.randomUUID(), at);
  async function published(f: Awaited<ReturnType<typeof fixture>>, content_md: string) {
    const created = await f.call('/api/items', { body: { kind: 'fragment', content_md }, cookie: true });
    expect(created.status).toBe(201);
    const { id } = await created.json() as { id: string };
    expect((await f.call(`/api/items/${id}/publish`, { body: {}, cookie: true })).status).toBe(200);
    return id;
  }
  const previewOf = (f: Awaited<ReturnType<typeof fixture>>) => async (content_md: string) => (await f.call('/api/preview', { body: { kind: 'thread', content_md } })).json();

  it('transclusion identity: the captured local item, quoted across two paragraphs, is used at the held version (L8)', async () => {
    const f = await fixture();
    const id = await published(f, 'First paragraph here.\n\nSecond paragraph, with a comma.');
    const c = capture({ blyg: { origin: BASE, id, version: 1, kind: 'fragment' }, quote: { text: 'First paragraph here.\nSecond paragraph, with a comma.', markdown: 'First paragraph here.\n\nSecond paragraph, with a comma.' } });
    expect(await checkTransclusion(c, { preview: previewOf(f), base: BASE, canSubscribe: false }), 'transclusion only for the captured origin and id (L8)').toEqual({ state: 'used', held: 1 });
  });

  it('transclusion identity: the same id claimed by another origin is quoted as a link (L8)', async () => {
    const f = await fixture();
    const id = await published(f, 'Shared words.');
    const c = capture({ blyg: { origin: 'https://other.example/', id, version: 1, kind: 'fragment' }, quote: { text: 'Shared words.' } });
    expect(await checkTransclusion(c, { preview: previewOf(f), base: BASE, canSubscribe: true }), 'transclusion only for the captured origin and id (L8)').toEqual({ state: 'fallback', reason: REASONS.identity });
  });

  it('a quote the held copy does not contain is quoted as a link, saying why', async () => {
    const f = await fixture();
    const id = await published(f, 'What was published.');
    const c = capture({ blyg: { origin: BASE, id, version: 1, kind: 'fragment' }, quote: { text: 'Words never published.' } });
    expect(await checkTransclusion(c, { preview: previewOf(f), base: BASE, canSubscribe: false })).toEqual({ state: 'fallback', reason: REASONS.edited });
  });

  it('an unknown item on a blyg not followed offers to subscribe only with owner:manage', async () => {
    const f = await fixture();
    const c = capture({ blyg: { origin: 'https://other.example/', id: 'nosuchitem', version: 1, kind: 'fragment' }, quote: { text: 'Anything.' } });
    expect(await checkTransclusion(c, { preview: previewOf(f), base: BASE, canSubscribe: true })).toEqual({ state: 'subscribe' });
    expect((await checkTransclusion(c, { preview: previewOf(f), base: BASE, canSubscribe: false })).state).toBe('fallback');
  });

  it('subscribing then waiting gives up after 60 s and says so', async () => {
    const f = await fixture();
    const c = capture({ blyg: { origin: 'https://other.example/', id: 'nosuchitem', version: 1, kind: 'fragment' }, quote: { text: 'Anything.' } });
    let clock = 0, subscribed = 0;
    const result = await subscribeAndWait(c, { subscribe: async () => { subscribed++; }, preview: previewOf(f), base: BASE, sleep: async (ms) => { clock += ms; }, now: () => clock });
    expect(subscribed).toBe(1);
    expect(result).toEqual({ state: 'fallback', reason: REASONS.waited });
    expect(clock).toBeLessThanOrEqual(60_000);
  });

  it('the saved stub_of matches the capture, validates and is stored as sent (L7)', async () => {
    const f = await fixture();
    const c = capture({ canonical: 'https://news.example/post', author: 'Ada Writer', quote: { text: 'A sentence, with - dashes & (brackets).', prefix: 'before it', suffix: 'after it' } });
    const draft = absorb(EMPTY_DRAFT, [c]);
    const stub = stubOf(draft)!;
    expect(StubSchema.safeParse(stub).success, 'the stub validates against the contract (L7)').toBe(true);
    const created = await f.call('/api/items', { body: { kind: 'thread', content_md: draft.text, stub_of: stub } });
    expect(created.status).toBe(201);
    const { id } = await created.json() as { id: string };
    const item = await (await f.call(`/api/items/${id}`, { method: 'GET' })).json() as { stub_of: unknown };
    expect(item.stub_of, 'the saved stub_of matches the capture (L7)').toEqual(stub);
  });

  it('a transclusion stub and its partial body are accepted', async () => {
    const f = await fixture();
    const id = await published(f, 'First paragraph here.');
    const created = await f.call('/api/items', { body: { kind: 'thread', content_md: `![[${id}]]\n> First paragraph here.\n\n`, stub_of: { origin: BASE, id, version: 1 } } });
    expect(created.status).toBe(201);
  });

  it('a hostile page title in a source line stays inert in the rendered item (L6)', async () => {
    const f = await fixture();
    const first = capture({ quote: { text: 'One.' } });
    const hostile = capture({ url: 'https://hostile.example/p', title: 'x](javascript:alert(1)) <img src=x onerror=alert(1)> [', quote: { text: 'Two.' } });
    const draft = absorb(EMPTY_DRAFT, [first]);
    const text = appendClip(draft.text, draft, hostile);
    const { html } = await previewOf(f)(text) as { html: string };
    expect(html, 'page values stay inert in the saved item (L6)').not.toMatch(/href="javascript:|<img|<script/i);
    expect(html, 'contrast: the source link is still a link').toContain('href="https://hostile.example/p#:~:text=Two.');
  });
});
```

- [ ] **Step 7: Run them, and make them pass**

Run: `PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run test/clipper-oauth.test.ts -t "clip composition"`

Expected: all eight pass, since the code already exists. Then confirm each test checks something real:
- Temporarily replace `if (!right) return { state: 'fallback', reason: REASONS.identity };` with nothing. The "same id claimed by another origin" test must fail with "transclusion only for the captured origin and id (L8)".
- Revert the change.
- Record the RED in your report.

If the publish route needs a body other than `{}`, use what `src/contract/routes.ts` `publishItem` accepts and record it. If the preview's partial check normalises differently from `quoteLines` and the first test fails, stop and report: that is a real disagreement between the clipper and the server, not a test to change.

- [ ] **Step 8: Commit**

```bash
git add extension/lib/compose.ts extension/lib/transclusion.ts extension/tests/compose.test.ts test/clipper-oauth.test.ts
git commit -m "Compose clips into quotes and judge transclusion identity against the real preview"
```

---

### Task 4: The draft store — inbox, lease and edits

**Files:**
- Create: `extension/lib/edit-queue.ts` (types only in this task), `extension/lib/draft-store.ts`, `extension/tests/draft-store.test.ts`

**Interfaces:**
- Consumes:
  - `KeyValue` and `memoryArea` from Plan 3a (`extension/lib/storage.ts`).
  - `validateCapture`, `stamp`, `CaptureError` and `StoredCapture` (Task 1).
  - `absorb`, `EMPTY_DRAFT`, `Draft`, `Citation` and `Transclusion` (Task 3).
- Produces in `edit-queue.ts` (Task 6 adds the class):
  - `interface EditFields { text?: string; absorb?: string[]; citation?: Citation; transclusion?: Transclusion }`
  - `interface Edit extends EditFields { baseRevision: number }`
  - `type EditResult = { ok: true; revision: number } | { ok: false; reason: 'lease' | 'stale'; draft?: Draft }`
- Produces in `draft-store.ts`:
  - `INBOX = 'inbox'` and `draftKey(base)`.
  - `type DraftEvent = { type: 'changed' } | { type: 'capture'; holder: string; capture: StoredCapture }`
  - `interface Snapshot { draft?: Draft; base?: string; holder: boolean; inbox: number }`
  - `interface DraftDeps { base; onEvent; now?; uuid?; known? }`
  - `class DraftStore`:
    - `accept(raw): Promise<StoredCapture>` and `drain(): Promise<void>`
    - `hello(port, wantLease): Promise<void>`, `claim(port): Promise<void>` and `release(port): Promise<void>`
    - `edit(port, edit): Promise<EditResult>` and `snapshot(port): Promise<Snapshot>`

- [ ] **Step 1: Write the edit types**

Create `extension/lib/edit-queue.ts`:

```ts
import type { Citation, Draft, Transclusion } from './compose.ts';

/** Everything a panel may change, in one message (Plan 3b's recorded ruling: one sequencer). */
export interface EditFields { text?: string; absorb?: string[]; citation?: Citation; transclusion?: Transclusion }
export interface Edit extends EditFields { baseRevision: number }
export type EditResult = { ok: true; revision: number } | { ok: false; reason: 'lease' | 'stale'; draft?: Draft };
```

- [ ] **Step 2: Write the failing store tests**

Create `extension/tests/draft-store.test.ts`:

```ts
/**
 * L1 Capture durability and L1b No lost or duplicated work (spec §4.1, §4.6,
 * §7.1). Source: Chrome's service worker lifecycle (the worker may be
 * terminated between any two awaits). Faults are injected at the storage
 * boundary, the only place a terminated worker leaves evidence. The fixtures
 * serialise like chrome.storage (memoryArea). The placement judge reads
 * storage directly, not through the store.
 */
import { describe, expect, test } from 'vitest';
import { CaptureError, QUOTE_CAP, type StoredCapture } from '../lib/capture.ts';
import type { Draft } from '../lib/compose.ts';
import { DraftStore, INBOX, draftKey, type DraftEvent } from '../lib/draft-store.ts';
import { memoryArea, type KeyValue } from '../lib/storage.ts';

const BASE = 'https://blyg.example/b/';
const page = (n: number) => ({ url: `https://news.example/p${n}`, title: `Post ${n}`, quote: { text: `Quote ${n}.`, markdown: `Quote ${n}.` } });

function harness(area: KeyValue = memoryArea(), base: string | undefined = BASE) {
  const events: DraftEvent[] = [];
  let n = 0;
  const deps = { base: async () => base, onEvent: (e: DraftEvent) => events.push(e), uuid: () => `c${++n}`, now: () => new Date('2026-10-05T12:00:00Z') };
  return { area, events, store: new DraftStore(area, deps), setBase: (b: string | undefined) => { base = b; } };
}
const read = async (area: KeyValue) => ({ inbox: ((await area.get(INBOX)) ?? []) as StoredCapture[], draft: (await area.get(draftKey(BASE))) as Draft | undefined });
/** L1's judge: each accepted capture is in exactly one place. */
async function placements(area: KeyValue, uuid: string) {
  const { inbox, draft } = await read(area);
  return inbox.filter((c) => c.uuid === uuid).length + (draft?.captures.filter((c) => c.uuid === uuid).length ?? 0);
}
/** A storage area that dies on its k-th set from now: the write does not land, as when the worker is terminated. */
function dying(area: KeyValue) {
  let left = Infinity;
  return {
    arm: (k: number) => { left = k; },
    area: { ...area, set: async (items: Record<string, unknown>) => { if (--left === 0) throw new Error('worker terminated'); return area.set(items); } } as KeyValue,
  };
}

describe('the inbox (spec §4.1)', () => {
  test('rapid captures with no panel all reach the draft, in order', async () => {
    const { area, store } = harness();
    for (const n of [1, 2, 3]) await store.accept(page(n));
    const { inbox, draft } = await read(area);
    expect(inbox).toEqual([]);
    expect(draft!.captures.map((c) => c.uuid)).toEqual(['c1', 'c2', 'c3']);
    expect(draft!.text.indexOf('Quote 1.')).toBeLessThan(draft!.text.indexOf('Quote 3.'));
  });

  test('a worker terminated mid-delivery leaves each capture in exactly one place (L1)', async () => {
    for (const k of [1, 2, 3]) {
      const memory = memoryArea();
      const disconnected = harness(memory, undefined);
      await disconnected.store.accept(page(1));
      const fault = dying(memory);
      const live = harness(fault.area);
      fault.arm(k);
      await live.store.drain().catch(() => undefined);
      expect(await placements(memory, 'c1'), `an accepted capture is in exactly one place (L1), fault at set ${k}`).toBe(1);
      await harness(memory).store.drain();
      expect(await placements(memory, 'c1'), `an accepted capture is in exactly one place (L1), after recovery from set ${k}`).toBe(1);
    }
  });

  test('recovery never appends a capture twice, even if a write half landed (L1b)', async () => {
    const memory = memoryArea();
    await harness(memory, undefined).store.accept(page(1));
    // A write that lands its draft key but not its inbox key: the state a non-atomic storage write would leave.
    const halfway = { ...memory, set: async (items: Record<string, unknown>) => { const rest = { ...items }; delete rest[INBOX]; await memory.set(rest); throw new Error('worker terminated'); } } as KeyValue;
    await harness(halfway).store.drain().catch(() => undefined);
    await harness(memory).store.drain();
    const { inbox, draft } = await read(memory);
    expect(draft!.captures.filter((c) => c.uuid === 'c1'), 'recovery never appends a capture twice (L1b)').toHaveLength(1);
    expect(draft!.text.split('Quote 1.').length - 1, 'recovery never appends a capture twice (L1b)').toBe(1);
    expect(inbox).toEqual([]);
  });

  test('a clip while disconnected waits in the inbox, and connecting delivers it (Review Focus 5)', async () => {
    const h = harness(memoryArea(), undefined);
    await h.store.accept(page(1));
    expect(await h.store.snapshot('p')).toEqual({ holder: false, inbox: 1 });
    h.setBase(BASE);
    await h.store.drain();
    expect((await read(h.area)).draft!.captures).toHaveLength(1);
  });

  test('an oversize selection is refused and nothing is stored (Review Focus 4)', async () => {
    const { area, store } = harness();
    await expect(store.accept({ url: 'https://news.example/x', quote: { text: 'a'.repeat(QUOTE_CAP + 1) } })).rejects.toBeInstanceOf(CaptureError);
    expect(await read(area)).toEqual({ inbox: [], draft: undefined });
  });
});

describe('the lease (spec §4.6)', () => {
  test('the worker never changes the body under a lease holder; it hands the capture over (L1b)', async () => {
    const { area, store, events } = harness();
    await store.hello('panel-a', true);
    await store.accept(page(1));
    expect((await read(area)).draft?.text ?? '', 'the worker never changes the body under a lease holder (L1b)').toBe('');
    expect(events).toContainEqual({ type: 'capture', holder: 'panel-a', capture: expect.objectContaining({ uuid: 'c1' }) });
    expect((await read(area)).inbox.map((c) => c.uuid), 'the capture waits in the inbox until absorbed (L1)').toEqual(['c1']);
  });

  test('the holder absorbs a capture with its own text in one write', async () => {
    const memory = memoryArea();
    let sets = 0;
    const counted = { ...memory, set: async (items: Record<string, unknown>) => { sets++; return memory.set(items); } } as KeyValue;
    const { store } = harness(counted);
    await store.hello('panel-a', true);
    await store.accept(page(1));
    sets = 0;
    expect(await store.edit('panel-a', { baseRevision: 0, text: '> Quote 1.\n\nMine.', absorb: ['c1'] })).toEqual({ ok: true, revision: 1 });
    expect(sets, 'the draft write and the inbox deletion are one set call').toBe(1);
    const { inbox, draft } = await read(memory);
    expect(inbox).toEqual([]);
    expect(draft).toMatchObject({ revision: 1, text: '> Quote 1.\n\nMine.', citation: { source: 'news.example' } });
  });

  test('a non-holder cannot write the draft (L1b)', async () => {
    const { area, store } = harness();
    await store.hello('panel-a', true);
    await store.hello('panel-b', true);
    const result = await store.edit('panel-b', { baseRevision: 0, text: 'overwrite' });
    expect(result.ok, 'a non-holder cannot write the draft (L1b)').toBe(false);
    expect((await read(area)).draft, 'a non-holder cannot write the draft (L1b)').toBeUndefined();
  });

  test('a stale base cannot overwrite the draft (L1b)', async () => {
    const { area, store } = harness();
    await store.hello('panel-a', true);
    expect((await store.edit('panel-a', { baseRevision: 0, text: 'one' })).ok).toBe(true);
    const stale = await store.edit('panel-a', { baseRevision: 0, text: 'two' });
    expect(stale, 'a stale base cannot overwrite the draft (L1b)').toMatchObject({ ok: false, reason: 'stale', draft: { revision: 1, text: 'one' } });
    expect((await read(area)).draft!.text, 'a stale base cannot overwrite the draft (L1b)').toBe('one');
  });

  test('releasing the lease delivers what the holder never absorbed', async () => {
    const { area, store } = harness();
    await store.hello('panel-a', true);
    await store.accept(page(1));
    await store.release('panel-a');
    const { inbox, draft } = await read(area);
    expect(inbox).toEqual([]);
    expect(draft!.captures.map((c) => c.uuid)).toEqual(['c1']);
  });

  test('a new holder is handed what is waiting in the inbox', async () => {
    const { store, events } = harness();
    await store.hello('panel-a', true);
    await store.accept(page(1));
    events.length = 0;
    await store.claim('panel-b');
    expect(events).toContainEqual({ type: 'capture', holder: 'panel-b', capture: expect.objectContaining({ uuid: 'c1' }) });
  });

  test('a panel that does not ask for the lease does not take it', async () => {
    const { store } = harness();
    await store.hello('panel-a', false);
    expect((await store.snapshot('panel-a')).holder).toBe(false);
    await store.hello('panel-b', true);
    expect((await store.snapshot('panel-b')).holder).toBe(true);
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `PATH=/usr/local/bin:$PATH npm run test:ext -- draft-store`

Expected: FAIL, because `../lib/draft-store.ts` does not exist.

- [ ] **Step 4: Write `extension/lib/draft-store.ts`**

```ts
/*
 * The worker's single authority over the inbox and the draft (spec §4.1,
 * §4.6). Every operation runs one at a time; every draft write and its inbox
 * deletion are one storage call, so a terminated worker leaves either both
 * or neither.
 */
import { stamp, validateCapture, type StoredCapture } from './capture.ts';
import { absorb, EMPTY_DRAFT, type Draft } from './compose.ts';
import type { Edit, EditResult } from './edit-queue.ts';
import type { KeyValue } from './storage.ts';

export const INBOX = 'inbox';
export const draftKey = (base: string) => `draft:${base}`;

export type DraftEvent = { type: 'changed' } | { type: 'capture'; holder: string; capture: StoredCapture };
export interface Snapshot { draft?: Draft; base?: string; holder: boolean; inbox: number }
export interface DraftDeps {
  /** The connected blyg, origin + mount + "/", or undefined when not connected. */
  base: () => Promise<string | undefined>;
  onEvent: (event: DraftEvent) => void;
  now?: () => Date;
  uuid?: () => string;
  /** Plan 3c: a capture already in a save operation or recent clips. */
  known?: (uuid: string) => Promise<boolean>;
}

export class DraftStore {
  private chain: Promise<unknown> = Promise.resolve();
  private holder?: string;

  constructor(private local: KeyValue, private deps: DraftDeps) {}

  /** Spec §4.1 steps 1-2: durable in the inbox before anything else sees it. */
  async accept(raw: unknown): Promise<StoredCapture> {
    const capture = stamp(validateCapture(raw), (this.deps.uuid ?? (() => crypto.randomUUID()))(), (this.deps.now ?? (() => new Date()))());
    const holder = await this.serial(async () => {
      await this.local.set({ [INBOX]: [...(await this.inbox()), capture] });
      return this.holder;
    });
    if (holder) this.deps.onEvent({ type: 'capture', holder, capture });
    await this.drain();
    this.deps.onEvent({ type: 'changed' });
    return capture;
  }

  /** Steps 3-4: with no lease holder, move the inbox into the draft, in order, never twice. */
  drain(): Promise<void> {
    return this.serial(async () => {
      if (this.holder) return;
      const base = await this.deps.base();
      const inbox = await this.inbox();
      if (!base || !inbox.length) return;
      const draft = await this.draft(base);
      const fresh: StoredCapture[] = [];
      for (const c of inbox) if (!(await this.isKnown(draft, c.uuid)) && !fresh.some((f) => f.uuid === c.uuid)) fresh.push(c);
      const next = fresh.length ? { ...absorb(draft, fresh), revision: draft.revision + 1 } : draft;
      await this.local.set({ [draftKey(base)]: next, [INBOX]: [] });
      this.deps.onEvent({ type: 'changed' });
    });
  }

  /** A panel arrives. It takes a free lease only when it asks to (a panel that was not holding does not). */
  async hello(port: string, wantLease: boolean): Promise<void> {
    const took = await this.serial(async () => {
      if (!wantLease || this.holder) return false;
      this.holder = port;
      return true;
    });
    if (took) await this.handOver(port);
  }

  /** "Edit here": this port takes the lease (spec §4.6). */
  async claim(port: string): Promise<void> {
    await this.serial(async () => {
      this.holder = port;
    });
    await this.handOver(port);
  }

  async release(port: string): Promise<void> {
    await this.serial(async () => {
      if (this.holder === port) this.holder = undefined;
    });
    await this.drain();
    this.deps.onEvent({ type: 'changed' });
  }

  edit(port: string, edit: Edit): Promise<EditResult> {
    return this.serial(async (): Promise<EditResult> => {
      const base = await this.deps.base();
      if (!base) return { ok: false, reason: 'lease' };
      const draft = await this.draft(base);
      if (this.holder !== port) return { ok: false, reason: 'lease', draft };
      if (edit.baseRevision !== draft.revision) return { ok: false, reason: 'stale', draft };
      const inbox = await this.inbox();
      const taken = inbox.filter((c) => edit.absorb?.includes(c.uuid) && !draft.captures.some((d) => d.uuid === c.uuid));
      const next: Draft = {
        ...absorb(draft, taken, edit.text ?? draft.text),
        revision: draft.revision + 1,
        ...(edit.citation ? { citation: edit.citation } : {}),
        ...(edit.transclusion ? { transclusion: edit.transclusion } : {}),
      };
      await this.local.set({ [draftKey(base)]: next, [INBOX]: inbox.filter((c) => !taken.includes(c)) });
      this.deps.onEvent({ type: 'changed' });
      return { ok: true, revision: next.revision };
    });
  }

  snapshot(port: string): Promise<Snapshot> {
    return this.serial(async () => {
      const base = await this.deps.base();
      const inbox = (await this.inbox()).length;
      return base ? { draft: await this.draft(base), base, holder: this.holder === port, inbox } : { holder: this.holder === port, inbox };
    });
  }

  /** A new holder gets every capture still waiting for one, then everyone sees the lease move. */
  private async handOver(port: string) {
    const waiting = await this.serial(() => this.inbox());
    for (const capture of waiting) this.deps.onEvent({ type: 'capture', holder: port, capture });
    this.deps.onEvent({ type: 'changed' });
  }

  private async isKnown(draft: Draft, uuid: string) {
    return draft.captures.some((c) => c.uuid === uuid) || (await this.deps.known?.(uuid)) === true;
  }

  private async inbox(): Promise<StoredCapture[]> {
    return ((await this.local.get(INBOX)) as StoredCapture[] | undefined) ?? [];
  }

  private async draft(base: string): Promise<Draft> {
    return ((await this.local.get(draftKey(base))) as Draft | undefined) ?? EMPTY_DRAFT;
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => undefined);
    return run;
  }
}
```

- [ ] **Step 5: Run the tests until they pass**

Run: `PATH=/usr/local/bin:$PATH npm run test:ext -- draft-store`

Expected: PASS. Then check that the L1 test catches the defect it names:
1. Temporarily replace `await this.local.set({ [draftKey(base)]: next, [INBOX]: [] });` with two calls, `await this.local.set({ [INBOX]: [] });` then `await this.local.set({ [draftKey(base)]: next });`.
2. "terminated mid-delivery" must fail with "an accepted capture is in exactly one place (L1)".
3. Revert, and record the RED in your report.

Do the same for the `if (this.holder) return;` line in `drain`: delete it, and "never changes the body under a lease holder" must fail.

- [ ] **Step 6: Commit**

```bash
git add extension/lib/edit-queue.ts extension/lib/draft-store.ts extension/tests/draft-store.test.ts
git commit -m "Draft store: durable inbox, single-write delivery, lease-gated revisioned edits"
```

---

### Task 5: The worker: triggers, the sender gate, ports and the manifest

**Files:**
- Create: `extension/manifest.ts`, `extension/lib/clip.ts`, `extension/lib/channel.ts`, `extension/lib/panel-channel.ts`, `extension/tests/clip.test.ts`
- Modify:
  - `extension/wxt.config.ts`, `extension/lib/messages.ts`, `extension/lib/tokens.ts`
  - `extension/entrypoints/background.ts` (rewrite)
  - `extension/tests/manifest.test.ts`, `extension/tests/messages.test.ts`, `extension/tests/connect.test.ts`
  - `e2e/clipper.spec.ts:10` (the extension path) and `package.json` scripts

**Interfaces:**
- Consumes:
  - `DraftStore`, `DraftEvent` and `Snapshot` (Task 4); `Edit` and `EditResult` (Task 4).
  - `CaptureError` and `StoredCapture` (Task 1).
  - Plan 3a's `TokenStore`, `Status`, `ReconnectError`, `connectOAuth`, `connectManual` and `withTimeout`.
- Produces:
  - `manifestFor(mode: string)`.
  - From `clip.ts`: `MENU_SELECTION = 'quote-selection'`, `MENU_PAGE = 'clip-page'` and `COMMAND = 'clip-selection'`. Also `ClipDeps`, `createClipper(deps): { onMenuClick(info, tab): Promise<void>; onCommand(command, tab): Promise<void> }` and `installMenus(menus)`.
  - From `messages.ts`: `Sender` and `trustedSender(sender, runtimeId, extensionBase): boolean`. `serve(trusted, handle)` now takes the gate first.
  - From `channel.ts`:
    - `PORT = 'clipper-panel'`.
    - `PanelMessage = { type: 'hello'; wantLease: boolean } | { type: 'claim' } | { type: 'edit'; id: number; edit: Edit }`.
    - `WorkerMessage = state | status | capture | edit-result | notice`.
    - `openChannel({ trusted, status })` returns `{ attach, event, status, notice }`.
  - From `panel-channel.ts`: `class PanelChannel(onDrop, hello)` with `open()`, `send(m)`, `listen(fn)` and `close()`.
  - From `tokens.ts`: `class ConnectionChanged extends Error`. `accessToken()` retries once on it.
  - The e2e build only: `globalThis.__clipperTest = { menu, command }` in the worker.

- [ ] **Step 1: Write the failing tests**

Replace `extension/tests/manifest.test.ts` with:

```ts
// The manifest is a security boundary: these permissions and no host access
// (spec §8). The pinned key fixes the extension ID, and so the OAuth redirect.
// Only the e2e build may reach its fixture hosts (Plan 3b's recorded ruling).
import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { manifestFor } from '../manifest.ts';
import { EXTENSION_ID, PUBLIC_KEY } from '../lib/identity.ts';

test('the production manifest asks for exactly the spec permissions and no host access', () => {
  const manifest = manifestFor('production');
  expect(manifest.permissions).toEqual(['contextMenus', 'sidePanel', 'activeTab', 'scripting', 'identity', 'storage', 'alarms']);
  expect('host_permissions' in manifest, 'no host permissions').toBe(false);
  expect(manifest.minimum_chrome_version).toBe('116');
  expect(manifest.key).toBe(PUBLIC_KEY);
  expect(manifest.commands['clip-selection'].suggested_key.default).toBe('Alt+Shift+Q');
  expect(manifest.action).toEqual({ default_title: 'Blygger Clipper' });
});

test('only the e2e build reaches its fixture hosts', () => {
  expect(manifestFor('e2e').host_permissions).toEqual(['https://*.example/*', 'http://127.0.0.1/*']);
  expect('host_permissions' in manifestFor('development')).toBe(false);
});

test('the pinned key yields the recorded extension ID', () => {
  const hex = createHash('sha256').update(Buffer.from(PUBLIC_KEY, 'base64')).digest('hex').slice(0, 32);
  expect([...hex].map((d) => String.fromCharCode(97 + parseInt(d, 16))).join('')).toBe(EXTENSION_ID);
});
```

In `extension/tests/messages.test.ts`:
- Change both `serve(` calls to pass `() => true` as the new first argument.
- Change the import to `import { ask, serve, trustedSender, WorkerError } from '../lib/messages.ts';`.
- Append:

```ts
test("only the clipper's own pages are answered", () => {
  const ID = 'kdcaplcgfineioncbobnkglobpljjaef', BASE = `chrome-extension://${ID}/`;
  expect(trustedSender({ id: ID, url: `${BASE}sidepanel.html` }, ID, BASE), "only the clipper's own pages are answered").toBe(true);
  const strangers = [
    { id: ID, url: 'https://news.example/post' },
    { id: 'otherextensionidotherextensionid', url: 'chrome-extension://otherextensionidotherextensionid/x.html' },
    { id: ID, url: `chrome-extension://${ID}.evil/x` },
    { id: ID },
    {},
  ];
  for (const sender of strangers) expect(trustedSender(sender, ID, BASE), `only the clipper's own pages are answered: ${JSON.stringify(sender)}`).toBe(false);
});

test('an untrusted sender gets no answer, even for a token', async () => {
  serve(() => false, async () => 'token-value');
  await expect(fakeBrowser.runtime.sendMessage({ type: 'access-token' })).resolves.toBeUndefined();
});
```

Append to `extension/tests/connect.test.ts`, after the disconnect test (it uses that file's `FAKE_DISCOVERY` and `memoryArea`):

```ts
test('a refresh that loses to a Reconnect elsewhere answers with the new connection, not Reconnect', async () => {
  const local = memoryArea(), session = memoryArea();
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>((r) => { release = r; }), tokenCalled = new Promise<void>((r) => { started = r; });
  const fetchFn = async (url: string) => {
    if (url.endsWith('/oauth2/token')) { started(); await gate; return Response.json({ access_token: 'a2', refresh_token: 'r2', expires_in: 3600, scope: 'owner:draft' }); }
    return new Response(null, { status: 404 });
  };
  // Two stores over one storage: the only way a write can land between a refresh's request and its guard.
  const worker = new TokenStore(local, session, fetchFn, () => 1_000_000);
  const elsewhere = new TokenStore(local, session, fetchFn, () => 1_000_000);
  await worker.saveOAuth(FAKE_DISCOVERY, 'client-1', { accessToken: 'a1', refreshToken: 'r1', expiresAt: 0, scope: ['owner:draft'] });
  const pending = worker.accessToken();
  await tokenCalled;
  await elsewhere.saveOAuth(FAKE_DISCOVERY, 'client-2', { accessToken: 'a9', refreshToken: 'r9', expiresAt: 9_000_000, scope: ['owner:draft'] });
  release();
  expect(await pending, "a stale refresh is discarded and the caller gets the current connection's token").toBe('a9');
  expect((await worker.status()).state).toBe('connected');
});
```

Create `extension/tests/clip.test.ts`:

```ts
/**
 * Triggers (spec §4.1). sidePanel.open needs the user gesture, so it must be
 * called before any await; a page the clipper cannot read still gives a clip,
 * marked degraded; nothing fails silently (spec §5.5).
 */
import { expect, test } from 'vitest';
import { validateCapture } from '../lib/capture.ts';
import { COMMAND, createClipper, installMenus, MENU_PAGE, MENU_SELECTION, type ClipDeps } from '../lib/clip.ts';

function harness(over: Partial<ClipDeps> = {}) {
  const log: string[] = [], accepted: unknown[] = [], failures: string[] = [];
  const deps: ClipDeps = {
    openPanel: async (tabId) => { log.push(`open ${tabId}`); },
    inject: async () => { log.push('inject'); return { url: 'https://news.example/p', title: 'P', quote: { text: 'Hi', markdown: 'Hi', prefix: '', suffix: '' } }; },
    accept: async (raw) => { accepted.push(raw); },
    failed: (message) => { failures.push(message); },
    ...over,
  };
  return { log, accepted, failures, clipper: createClipper(deps) };
}

test('the side panel opens before anything is awaited, from the menu and the shortcut', () => {
  const menu = harness();
  void menu.clipper.onMenuClick({ menuItemId: MENU_SELECTION, frameId: 0 }, { id: 7 });
  expect(menu.log, 'sidePanel.open is called synchronously, before injection').toEqual(['open 7', 'inject']);
  const key = harness();
  void key.clipper.onCommand(COMMAND, { id: 8 });
  expect(key.log).toEqual(['open 8', 'inject']);
});

test('the clicked frame is the one injected', async () => {
  const frames: number[] = [];
  const h = harness({ inject: async (_tab, frameId) => { frames.push(frameId); return { url: 'https://news.example/p' }; } });
  await h.clipper.onMenuClick({ menuItemId: MENU_SELECTION, frameId: 3, selectionText: 'x' }, { id: 1 });
  expect(frames).toEqual([3]);
});

test("a page the clipper cannot read gives a degraded clip from the menu's own selection", async () => {
  const h = harness({ inject: async () => { throw new Error('Cannot access contents of the page'); } });
  await h.clipper.onMenuClick({ menuItemId: MENU_SELECTION, frameId: 0, selectionText: 'flattened text' }, { id: 1, url: 'https://news.example/doc.pdf', title: 'Doc' });
  expect(h.accepted).toEqual([{ url: 'https://news.example/doc.pdf', title: 'Doc', degraded: true, quote: { text: 'flattened text' } }]);
});

test('"Clip this page" drops any selection', async () => {
  const h = harness();
  await h.clipper.onMenuClick({ menuItemId: MENU_PAGE, frameId: 0 }, { id: 1 });
  expect((h.accepted[0] as { quote?: unknown }).quote).toBeUndefined();
});

test('a page that cannot be clipped says why', async () => {
  const h = harness({ inject: async () => { throw new Error('Cannot access a chrome:// URL'); }, accept: async (raw) => { validateCapture(raw); } });
  await h.clipper.onMenuClick({ menuItemId: MENU_SELECTION, frameId: 0, selectionText: 'x' }, { id: 1, url: 'chrome://settings/', title: 'Settings' });
  expect(h.failures).toEqual(['This page cannot be clipped: its address is not a web address.']);
});

test('an unexpected failure is not silent', async () => {
  const h = harness({ accept: async () => { throw new Error('storage quota'); } });
  await h.clipper.onMenuClick({ menuItemId: MENU_SELECTION, frameId: 0 }, { id: 1 });
  expect(h.failures).toEqual(['Clip failed, try again.']);
});

test('menus that are not ours do nothing', async () => {
  const h = harness();
  await h.clipper.onMenuClick({ menuItemId: 'someone-else', frameId: 0 }, { id: 1 });
  expect(h.log).toEqual([]);
});

test('the menus are the two the spec names', async () => {
  const made: unknown[] = [];
  await installMenus({ removeAll: async () => {}, create: (p) => { made.push(p); } });
  expect(made).toEqual([
    { id: MENU_SELECTION, title: 'Quote in Blygger: "%s"', contexts: ['selection'] },
    { id: MENU_PAGE, title: 'Clip this page', contexts: ['page'] },
  ]);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `PATH=/usr/local/bin:$PATH npm run test:ext`

Expected: FAIL for these reasons:
- `manifest.ts` and `clip.ts` are missing.
- `trustedSender` is not exported.
- The Reconnect-race test fails with `ReconnectError: The connection changed while refreshing.`, which is the RED this task fixes.

- [ ] **Step 3: Write `extension/manifest.ts` and use it**

```ts
import { PUBLIC_KEY } from './lib/identity.ts';

/**
 * Spec §8. The e2e build alone reaches its fixture hosts: Playwright cannot
 * click a context menu, so it calls the same handler through a test hook,
 * and without a gesture only host access lets that handler inject.
 */
export function manifestFor(mode: string) {
  return {
    name: 'Blygger Clipper',
    description: 'Quote what you read into a draft on your own blyg.',
    version: '0.1.0',
    key: PUBLIC_KEY,
    minimum_chrome_version: '116',
    permissions: ['contextMenus', 'sidePanel', 'activeTab', 'scripting', 'identity', 'storage', 'alarms'],
    action: { default_title: 'Blygger Clipper' },
    commands: { 'clip-selection': { suggested_key: { default: 'Alt+Shift+Q' }, description: 'Quote the selection in Blygger' } },
    ...(mode === 'e2e' ? { host_permissions: ['https://*.example/*', 'http://127.0.0.1/*'] } : {}),
  };
}
```

Replace the `manifest:` object in `extension/wxt.config.ts` with `manifest: ({ mode }) => manifestFor(mode),`. Import `manifestFor` from `./manifest.ts`, and drop the now-unused `PUBLIC_KEY` import.

In `package.json` scripts:
- Add `"ext:build:e2e": "wxt build extension --mode e2e"`.
- Change `test:e2e` to `"npm run ext:build:e2e && playwright test"`.

In `e2e/clipper.spec.ts`, change `const EXTENSION = resolve('extension/.output/chrome-mv3');` to the directory WXT writes for mode e2e:
- Run `PATH=/usr/local/bin:$PATH npm run ext:build:e2e` and look under `extension/.output/`. The expected name is `chrome-mv3-e2e`.
- If WXT writes the e2e build over `chrome-mv3`, add `outDirTemplate: '{{browser}}-mv{{manifestVersion}}{{modeSuffix}}'` to the config, and confirm the production build still lands in `chrome-mv3` and the e2e one elsewhere. Record what you found.

- [ ] **Step 4: The sender gate and the token retry**

In `extension/lib/messages.ts`, add `Sender` and `trustedSender`, and make `serve` take the gate:

```ts
export interface Sender { id?: string; url?: string }

/** Only the clipper's own pages are answered: never a content script, a web page or another extension. */
export function trustedSender(sender: Sender, runtimeId: string, extensionBase: string): boolean {
  return sender.id === runtimeId && typeof sender.url === 'string' && sender.url.startsWith(extensionBase);
}

/** The worker side: answer clipper requests from trusted senders; ignore everything else. */
export function serve(trusted: (sender: Sender) => boolean, handle: (request: Request) => Promise<unknown>) {
  browser.runtime.onMessage.addListener((message: unknown, sender: Sender, sendResponse: (reply: Reply) => void) => {
    if (!isRequest(message) || !trusted(sender)) return false;
    handle(message).then(
      (value) => sendResponse({ ok: true, value }),
      (error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error), reconnect: error instanceof Error && error.name === 'ReconnectError' }),
    );
    return true;
  });
}
```

In `extension/lib/tokens.ts`:

1. Add the class beside `ReconnectError`:

```ts
/** A refresh whose connection was replaced or removed while it ran: retryable, never a Reconnect. */
export class ConnectionChanged extends Error {
  constructor() {
    super('The connection changed while refreshing.');
    this.name = 'ConnectionChanged';
  }
}
```

2. In `refresh`, change `if (!(await this.stillHolds(conn))) throw new ReconnectError('The connection changed while refreshing.');` to `if (!(await this.stillHolds(conn))) throw new ConnectionChanged();`.

3. In `endAccess`, change its first line to `if (!(await this.stillHolds(conn))) return new ConnectionChanged();`, and widen its return type to `Promise<Error>` if TypeScript needs that.

4. Rename the existing `async accessToken(): Promise<string> {` to `private async currentToken(): Promise<string> {`. Change only that line: the body, and in particular the lines `this.inflight ??= this.refresh(conn).finally(() => { this.inflight = undefined; });` and `return this.inflight;`, must stay byte-identical, because a mutation control anchors on them. Then add above it:

```ts
  async accessToken(): Promise<string> {
    try {
      return await this.currentToken();
    } catch (error) {
      // A refresh that lost a race with a Disconnect or Reconnect: ask again of what is stored now.
      if (error instanceof ConnectionChanged) return this.currentToken();
      throw error;
    }
  }
```

- [ ] **Step 5: Write `extension/lib/clip.ts`**

```ts
/*
 * The triggers (spec §4.1): the context menu, "Clip this page" and the
 * shortcut. Chrome APIs arrive as ClipDeps, so the order of calls is testable.
 */
import { CaptureError } from './capture.ts';

export const MENU_SELECTION = 'quote-selection';
export const MENU_PAGE = 'clip-page';
export const COMMAND = 'clip-selection';

export interface ClipDeps {
  openPanel: (tabId: number) => Promise<unknown>;
  /** Inject the capture script into one frame and return what it read. */
  inject: (tabId: number, frameId: number) => Promise<unknown>;
  accept: (raw: unknown) => Promise<unknown>;
  failed: (message: string) => void;
}
export interface MenuInfo { menuItemId: string | number; frameId?: number; selectionText?: string }
export interface Tab { id?: number; url?: string; title?: string }

/** When injection is blocked (PDF viewer, chrome:// pages, the Web Store): the tab and the menu's own selection. */
const degraded = (tab: Tab, selectionText?: string): Record<string, unknown> => ({ url: tab.url, title: tab.title, degraded: true, ...(selectionText ? { quote: { text: selectionText } } : {}) });

export function createClipper(deps: ClipDeps) {
  const clip = async (tab: Tab & { id: number }, frameId: number, pageOnly: boolean, selectionText?: string) => {
    let raw: Record<string, unknown>;
    try {
      const read = await deps.inject(tab.id, frameId);
      raw = read && typeof read === 'object' ? { ...(read as Record<string, unknown>) } : degraded(tab, selectionText);
    } catch {
      raw = degraded(tab, selectionText);
    }
    if (pageOnly) delete raw.quote;
    else if (!raw.quote && selectionText) raw.quote = { text: selectionText };
    try {
      await deps.accept(raw);
    } catch (error) {
      deps.failed(error instanceof CaptureError ? error.message : 'Clip failed, try again.');
    }
  };
  // sidePanel.open needs the user gesture, so each trigger calls it before any await.
  return {
    onMenuClick(info: MenuInfo, tab?: Tab): Promise<void> {
      if (tab?.id === undefined || (info.menuItemId !== MENU_SELECTION && info.menuItemId !== MENU_PAGE)) return Promise.resolve();
      void deps.openPanel(tab.id).catch(() => undefined);
      return clip({ ...tab, id: tab.id }, info.frameId ?? 0, info.menuItemId === MENU_PAGE, info.selectionText);
    },
    onCommand(command: string, tab?: Tab): Promise<void> {
      if (command !== COMMAND || tab?.id === undefined) return Promise.resolve();
      void deps.openPanel(tab.id).catch(() => undefined);
      return clip({ ...tab, id: tab.id }, 0, false);
    },
  };
}

export async function installMenus(menus: { removeAll(): Promise<void>; create(properties: { id: string; title: string; contexts: ['selection'] | ['page'] }): unknown }) {
  await menus.removeAll();
  menus.create({ id: MENU_SELECTION, title: 'Quote in Blygger: "%s"', contexts: ['selection'] });
  menus.create({ id: MENU_PAGE, title: 'Clip this page', contexts: ['page'] });
}
```

- [ ] **Step 6: Write the two ends of the panel port**

Create `extension/lib/channel.ts`:

```ts
/*
 * The worker's side of the panel ports (spec §4.6). The lease follows a port
 * and ends when the port disconnects. Panels are told the connection status
 * and the draft whenever either changes (Plan 3a carry-forward).
 */
import { browser } from 'wxt/browser';
import type { StoredCapture } from './capture.ts';
import type { DraftEvent, DraftStore, Snapshot } from './draft-store.ts';
import type { Edit, EditResult } from './edit-queue.ts';
import type { Sender } from './messages.ts';
import type { Status } from './tokens.ts';

export const PORT = 'clipper-panel';
export type PanelMessage = { type: 'hello'; wantLease: boolean } | { type: 'claim' } | { type: 'edit'; id: number; edit: Edit };
export type WorkerMessage =
  | { type: 'state'; state: Snapshot }
  | { type: 'status'; status: Status }
  | { type: 'capture'; capture: StoredCapture }
  | { type: 'edit-result'; id: number; result: EditResult }
  | { type: 'notice'; message: string };

interface PortLike {
  name: string;
  sender?: Sender;
  postMessage(message: WorkerMessage): void;
  disconnect(): void;
  onMessage: { addListener(listener: (message: unknown) => void): void };
  onDisconnect: { addListener(listener: () => void): void };
}

export function openChannel(opts: { trusted: (sender: Sender) => boolean; status: () => Promise<Status> }) {
  const ports = new Map<string, PortLike>();
  let drafts: DraftStore | undefined;
  const post = (port: PortLike, message: WorkerMessage) => {
    try {
      port.postMessage(message);
    } catch {
      ports.forEach((p, id) => p === port && ports.delete(id));
    }
  };
  const sendState = async (id: string, port: PortLike) => {
    if (drafts) post(port, { type: 'state', state: await drafts.snapshot(id) });
  };
  const handle = async (id: string, port: PortLike, message: PanelMessage) => {
    if (!drafts) return;
    if (message.type === 'hello') {
      await drafts.hello(id, message.wantLease);
      post(port, { type: 'status', status: await opts.status() });
      await sendState(id, port);
    } else if (message.type === 'claim') await drafts.claim(id);
    else if (message.type === 'edit') post(port, { type: 'edit-result', id: message.id, result: await drafts.edit(id, message.edit) });
  };
  browser.runtime.onConnect.addListener((raw) => {
    const port = raw as unknown as PortLike;
    if (port.name !== PORT || !opts.trusted(port.sender ?? {})) {
      port.disconnect();
      return;
    }
    const id = crypto.randomUUID();
    ports.set(id, port);
    port.onMessage.addListener((message) => void handle(id, port, message as PanelMessage));
    port.onDisconnect.addListener(() => {
      ports.delete(id);
      void drafts?.release(id);
    });
  });
  return {
    attach(store: DraftStore) {
      drafts = store;
    },
    event(event: DraftEvent) {
      if (event.type === 'capture') {
        const port = ports.get(event.holder);
        if (port) post(port, { type: 'capture', capture: event.capture });
        return;
      }
      for (const [id, port] of ports) void sendState(id, port);
    },
    /** The connection changed: every panel gets the status, then the draft for the blyg it now names. */
    async status() {
      const status = await opts.status();
      for (const [id, port] of ports) {
        post(port, { type: 'status', status });
        await sendState(id, port);
      }
    },
    notice(message: string) {
      for (const port of ports.values()) post(port, { type: 'notice', message });
    },
  };
}
```

Create `extension/lib/panel-channel.ts`:

```ts
import { browser } from 'wxt/browser';
import { PORT, type PanelMessage, type WorkerMessage } from './channel.ts';

/** The panel's port to the worker. It reconnects when the worker restarts, and says hello again. */
export class PanelChannel {
  private port?: ReturnType<typeof browser.runtime.connect>;
  private listeners = new Set<(message: WorkerMessage) => void>();
  private closed = false;

  constructor(private onDrop: () => void, private hello: () => PanelMessage) {}

  open() {
    if (this.closed) return;
    const port = browser.runtime.connect({ name: PORT });
    this.port = port;
    port.onMessage.addListener((message: unknown) => {
      for (const listener of this.listeners) listener(message as WorkerMessage);
    });
    port.onDisconnect.addListener(() => {
      this.port = undefined;
      if (this.closed) return;
      this.onDrop();
      setTimeout(() => this.open(), 100);
    });
    port.postMessage(this.hello());
  }

  send(message: PanelMessage) {
    this.port?.postMessage(message);
  }

  listen(listener: (message: WorkerMessage) => void) {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  close() {
    this.closed = true;
    this.port?.disconnect();
  }
}
```

- [ ] **Step 7: Rewrite the background**

Replace `extension/entrypoints/background.ts`:

```ts
import { browser } from 'wxt/browser';
import { openChannel } from '../lib/channel.ts';
import { createClipper, installMenus } from '../lib/clip.ts';
import { connectManual, connectOAuth } from '../lib/connect.ts';
import { DraftStore } from '../lib/draft-store.ts';
import { withTimeout } from '../lib/fetch.ts';
import { serve, trustedSender, type Sender } from '../lib/messages.ts';
import { storageArea } from '../lib/storage.ts';
import { ReconnectError, TokenStore } from '../lib/tokens.ts';

// The only place tokens and drafts are written (spec §3.4, §4.6). Every
// listener is registered synchronously, so a worker woken by an event finds it.
export default defineBackground(() => {
  const local = storageArea(browser.storage.local), session = storageArea(browser.storage.session);
  const fetchFn = withTimeout((input, init) => fetch(input, init));
  const store = new TokenStore(local, session, fetchFn);
  const extensionBase = browser.runtime.getURL('/');
  const trusted = (sender: Sender) => trustedSender(sender, browser.runtime.id, extensionBase);
  const base = async () => {
    const status = await store.status();
    return status.state === 'connected' ? `${status.origin}${status.mount}/` : undefined;
  };
  const channel = openChannel({ trusted, status: () => store.status() });
  const drafts = new DraftStore(local, { base, onEvent: (event) => channel.event(event) });
  channel.attach(drafts);
  const clipper = createClipper({
    openPanel: (tabId) => browser.sidePanel.open({ tabId }),
    inject: async (tabId, frameId) => {
      const target = { tabId, frameIds: [frameId] };
      await browser.scripting.executeScript({ target, files: ['/capture.js'] });
      const [result] = await browser.scripting.executeScript({ target, func: () => (globalThis as { __blyggerCapture?: () => Promise<unknown> }).__blyggerCapture?.() });
      return result?.result;
    },
    accept: (raw) => drafts.accept(raw),
    failed: (message) => channel.notice(message),
  });

  browser.runtime.onInstalled.addListener(() => void installMenus(browser.contextMenus));
  browser.contextMenus.onClicked.addListener((info, tab) => void clipper.onMenuClick(info, tab));
  browser.commands.onCommand.addListener((command, tab) => void clipper.onCommand(command, tab));
  void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
  void drafts.drain();

  const connected = async <T>(connecting: Promise<T>) => {
    const status = await connecting;
    await drafts.drain();
    await channel.status();
    return status;
  };
  serve(trusted, async (request) => {
    switch (request.type) {
      case 'status':
        return store.status();
      case 'connect':
        return connected(connectOAuth(request.url, {
          fetchFn,
          store,
          local,
          redirectUri: browser.identity.getRedirectURL(),
          launch: (url) => browser.identity.launchWebAuthFlow({ url, interactive: true }),
        }));
      case 'connect-manual':
        return connected(connectManual(request.url, request.token, { fetchFn, store }));
      case 'access-token':
        try {
          return await store.accessToken();
        } catch (error) {
          if (error instanceof ReconnectError) await channel.status();
          throw error;
        }
      case 'disconnect':
        await store.disconnect();
        await channel.status();
        return store.status();
    }
  });

  if (import.meta.env.MODE === 'e2e') Object.assign(globalThis, { __clipperTest: { menu: clipper.onMenuClick, command: clipper.onCommand } });
});
```

- [ ] **Step 8: Run everything this task touches**

Run:

```bash
PATH=/usr/local/bin:$PATH npm run test:ext
PATH=/usr/local/bin:$PATH npm run typecheck
PATH=/usr/local/bin:$PATH npm run ext:build
PATH=/usr/local/bin:$PATH npm run ext:build:e2e
PATH=/usr/local/bin:$PATH node node_modules/@playwright/test/cli.js test e2e/clipper.spec.ts --project=desktop
```

Expected:
- All extension units pass, typecheck is clean, and both builds succeed.
- Plan 3a's three clipper e2e tests still pass against the e2e build.
- `grep -c __clipperTest extension/.output/chrome-mv3/background.js` prints `0`, because the production build has no hook. Record the output.
- Fix type errors at their source. If WXT's `browser` types reject `installMenus(browser.contextMenus)`, adapt `installMenus`'s parameter type, not the call.

- [ ] **Step 9: Commit**

```bash
git add extension/manifest.ts extension/wxt.config.ts extension/lib/clip.ts extension/lib/channel.ts extension/lib/panel-channel.ts extension/lib/messages.ts extension/lib/tokens.ts extension/entrypoints/background.ts extension/tests e2e/clipper.spec.ts package.json
git commit -m "Worker: context menu, shortcut, gated messages and panel ports"
```

---

### Task 6: The edit queue

**Files:**
- Modify: `extension/lib/edit-queue.ts` (add the class)
- Create: `extension/tests/edit-queue.test.ts`

**Interfaces:**
- Consumes: `Edit`, `EditFields` and `EditResult` from Task 4; `Draft` from Task 3.
- Produces:
  - `type QueuePhase = 'saved' | 'saving' | 'unsent'`.
  - `class EditQueue(revision: number, send: (id: number, edit: Edit) => void, onPhase?: (phase: QueuePhase) => void)` with:
    - getters `phase` and `acknowledged`;
    - methods `change(fields)`, `result(id, result)`, `lost()`, `resume()`, `reset(draft): EditFields | undefined` and `flush(): Promise<number>`.

- [ ] **Step 1: Write the failing tests**

Create `extension/tests/edit-queue.test.ts`:

```ts
/**
 * L1 and L1b at the panel (spec §4.6, §5.1): one edit in flight; typing
 * never sends a stale base; "saved" means acknowledged; a refusal keeps the
 * input on screen; "Edit here" never resends it. The worker is played by
 * the test, answering exactly as DraftStore does.
 */
import { expect, test } from 'vitest';
import { EditQueue, type Edit, type QueuePhase } from '../lib/edit-queue.ts';

function harness(revision = 0) {
  const sent: { id: number; edit: Edit }[] = [], phases: QueuePhase[] = [];
  const queue = new EditQueue(revision, (id, edit) => sent.push({ id, edit }), (phase) => phases.push(phase));
  return { queue, sent, phases, ack: (i: number, next: number) => queue.result(sent[i].id, { ok: true, revision: next }) };
}

test('fast typing: one edit in flight, the latest text sent next on the new base (L1b)', () => {
  const { queue, sent, ack } = harness(4);
  for (const text of ['a', 'ab', 'abc', 'abcd']) queue.change({ text });
  expect(sent.length, 'one edit in flight at a time (L1b)').toBe(1);
  expect(sent[0].edit).toEqual({ baseRevision: 4, text: 'a' });
  ack(0, 5);
  expect(sent.length, 'one edit in flight at a time (L1b)').toBe(2);
  expect(sent[1].edit, 'the pending value is the latest full text, on the new base').toEqual({ baseRevision: 5, text: 'abcd' });
  ack(1, 6);
  expect(sent).toHaveLength(2);
});

test('"saved" waits for the acknowledgement (L1)', () => {
  const { queue, ack } = harness();
  queue.change({ text: 'x' });
  expect(queue.phase, '"saved" waits for the acknowledgement (L1)').toBe('saving');
  queue.change({ text: 'xy' });
  ack(0, 1);
  expect(queue.phase, '"saved" waits for the acknowledgement (L1)').toBe('saving');
  ack(1, 2);
  expect(queue.phase).toBe('saved');
});

test('a capture absorbed while typing rides with the text', () => {
  const { queue, sent, ack } = harness();
  queue.change({ text: 'a' });
  queue.change({ text: 'a\n\n> q', absorb: ['c1'] });
  queue.change({ text: 'a\n\n> q b' });
  ack(0, 1);
  expect(sent[1].edit).toEqual({ baseRevision: 1, text: 'a\n\n> q b', absorb: ['c1'] });
});

test('a refusal stops sending and keeps the input unsent; "Edit here" never resends it (L1b)', () => {
  const { queue, sent } = harness();
  queue.change({ text: 'mine' });
  queue.result(sent[0].id, { ok: false, reason: 'lease', draft: { revision: 3, captures: [], text: 'theirs' } });
  queue.change({ text: 'mine, more' });
  expect(queue.phase).toBe('unsent');
  expect(sent).toHaveLength(1);
  const unsent = queue.reset({ revision: 3, captures: [], text: 'theirs' });
  expect(unsent?.text, 'the unsent text is handed back to show').toBe('mine, more');
  expect(sent, '"Edit here" never resends unsent text (L1b)').toHaveLength(1);
  queue.change({ text: 'theirs + new' });
  expect(sent[1].edit, 'after the reload, edits build on the reloaded revision').toEqual({ baseRevision: 3, text: 'theirs + new' });
});

test('an edit whose reply was lost to a worker restart is resent as it was, and recognised if it had landed', () => {
  const { queue, sent } = harness(1);
  queue.change({ text: 'A' });
  queue.lost();
  queue.change({ text: 'AB' });
  expect(sent, 'nothing is sent while the port is down').toHaveLength(1);
  queue.resume();
  expect(sent[1].edit, 'the lost edit is resent unchanged, first').toEqual({ baseRevision: 1, text: 'A' });
  queue.result(sent[1].id, { ok: false, reason: 'stale', draft: { revision: 2, captures: [], text: 'A' } });
  expect(sent[2].edit, 'it had landed, so the next edit builds on it').toEqual({ baseRevision: 2, text: 'AB' });
});

test('flush resolves with the final revision, and rejects after a refusal', async () => {
  const { queue, sent, ack } = harness();
  queue.change({ text: 'x' });
  const flushed = queue.flush();
  ack(0, 1);
  await expect(flushed).resolves.toBe(1);
  queue.change({ text: 'y' });
  const refused = queue.flush();
  queue.result(sent[1].id, { ok: false, reason: 'lease' });
  await expect(refused).rejects.toThrow('This window lost the draft to another window.');
});

test('a reply for an edit no longer in flight is ignored', () => {
  const { queue, sent } = harness();
  queue.change({ text: 'x' });
  queue.result(999, { ok: true, revision: 50 });
  expect(queue.acknowledged).toBe(0);
  expect(sent).toHaveLength(1);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `PATH=/usr/local/bin:$PATH npm run test:ext -- edit-queue`

Expected: FAIL, because `EditQueue` is not exported.

- [ ] **Step 3: Add the class to `extension/lib/edit-queue.ts`**

Append below the types:

```ts
export type QueuePhase = 'saved' | 'saving' | 'unsent';

const merge = (a: EditFields | undefined, b: EditFields | undefined): EditFields | undefined => {
  if (!a) return b;
  if (!b) return a;
  const absorb = [...new Set([...(a.absorb ?? []), ...(b.absorb ?? [])])];
  return { ...a, ...b, ...(absorb.length ? { absorb } : {}) };
};

/** The worker already holds what was sent: a reply lost to a worker restart, then resent. */
const holds = (draft: Draft, sent: EditFields) =>
  (sent.text === undefined || draft.text === sent.text) &&
  (sent.absorb ?? []).every((uuid) => draft.captures.some((c) => c.uuid === uuid)) &&
  (sent.citation === undefined || JSON.stringify(draft.citation) === JSON.stringify(sent.citation)) &&
  (sent.transclusion === undefined || JSON.stringify(draft.transclusion) === JSON.stringify(sent.transclusion));

/**
 * Spec §4.6's edit queue: at most one edit in flight; input meanwhile
 * coalesces into one pending value, sent on the acknowledgement with the new
 * revision as its base, so ordinary typing never sends a stale base.
 */
export class EditQueue {
  private inflight?: { id: number; fields: EditFields };
  private pending?: EditFields;
  private refused?: 'lease' | 'stale';
  private offline = false;
  private nextId = 1;
  private waiters: { resolve: (revision: number) => void; reject: (error: Error) => void }[] = [];

  constructor(private revision: number, private send: (id: number, edit: Edit) => void, private onPhase: (phase: QueuePhase) => void = () => undefined) {}

  get phase(): QueuePhase {
    return this.refused ? 'unsent' : this.inflight || this.pending ? 'saving' : 'saved';
  }

  get acknowledged() {
    return this.revision;
  }

  change(fields: EditFields) {
    this.pending = merge(this.pending, fields);
    this.pump();
    this.onPhase(this.phase);
  }

  result(id: number, result: EditResult) {
    if (this.inflight?.id !== id) return;
    const sent = this.inflight.fields;
    this.inflight = undefined;
    if (result.ok) this.revision = result.revision;
    else if (result.reason === 'stale' && result.draft && holds(result.draft, sent)) this.revision = result.draft.revision;
    else {
      this.refused = result.reason;
      this.pending = merge(sent, this.pending);
    }
    this.pump();
    this.settle();
    this.onPhase(this.phase);
  }

  /** The port dropped. An edit in flight may or may not have landed; on resume it is resent as it was. */
  lost() {
    this.offline = true;
  }

  resume() {
    if (!this.offline) return;
    this.offline = false;
    if (this.inflight) {
      this.inflight = { id: this.nextId++, fields: this.inflight.fields };
      this.send(this.inflight.id, { baseRevision: this.revision, ...this.inflight.fields });
    } else this.pump();
    this.onPhase(this.phase);
  }

  /** "Edit here" reloads the stored draft. Unsent input is handed back to show, never resent (spec §4.6). */
  reset(draft: Draft): EditFields | undefined {
    const unsent = merge(this.inflight?.fields, this.pending);
    this.inflight = undefined;
    this.offline = false;
    this.refused = undefined;
    this.revision = draft.revision;
    this.pending = undefined;
    this.settle();
    this.onPhase(this.phase);
    return unsent;
  }

  /** Resolves with the acknowledged revision once nothing is pending or in flight (Save, Plan 3c). */
  flush(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
      this.settle();
    });
  }

  private pump() {
    if (this.inflight || !this.pending || this.refused || this.offline) return;
    this.inflight = { id: this.nextId++, fields: this.pending };
    this.pending = undefined;
    this.send(this.inflight.id, { baseRevision: this.revision, ...this.inflight.fields });
  }

  private settle() {
    if (this.phase === 'saving') return;
    for (const waiter of this.waiters.splice(0)) {
      if (this.refused) waiter.reject(new Error('This window lost the draft to another window.'));
      else waiter.resolve(this.revision);
    }
  }
}
```

- [ ] **Step 4: Run them until they pass, then check the queue's guard is load-bearing**

Run: `PATH=/usr/local/bin:$PATH npm run test:ext -- edit-queue`

Expected: PASS. Then:
1. Temporarily change `if (this.inflight || !this.pending || this.refused || this.offline) return;` to `if (!this.pending || this.refused || this.offline) return;`. "fast typing" must fail with "one edit in flight at a time (L1b)".
2. Revert, and record the RED.

- [ ] **Step 5: Commit**

```bash
git add extension/lib/edit-queue.ts extension/tests/edit-queue.test.ts
git commit -m "Edit queue: one edit in flight, coalesced input, refusals kept on screen"
```

---

### Task 7: The panel: compose, lease and conflict, with the browser tests

**Files:**
- Create: `extension/panel/useDraft.ts`, `extension/panel/useTransclusion.ts`, `extension/panel/SourceCard.tsx`, `extension/panel/Compose.tsx`, `extension/tests/panel.test.ts`
- Modify: `extension/panel/App.tsx`, `extension/panel/Connect.tsx`, `extension/panel/panel.css`, `e2e/clipper.spec.ts`

**Interfaces:**
- Consumes:
  - `PanelChannel` and `WorkerMessage` (Task 5); `EditQueue` (Task 6).
  - `appendClip`, `switchQuote`, `Draft` and `Citation` (Task 3).
  - `checkTransclusion` and `subscribeAndWait` (Task 3); `Snapshot` (Task 4).
  - From Plan 2: `usePreview`, `getPreview` and `pourOver` from `src/ui/composer.tsx`; `Button`, `Failure` and `Html` from `src/ui/primitives.tsx`.
  - `BlyggerApi.createSubscription` from the SDK.
- Produces:
  - `useDraft(): DraftView`, where `DraftView` has:
    - state: `status`, `snapshot`, `text`, `citation`, `phase`, `conflict` and `notice`;
    - methods: `current()`, `type(text)`, `edit(fields)`, `editHere()`, `appendConflict()`, `dismissConflict()` and `dismissNotice()`.
  - `settle(view, first, result)` and `useTransclusionCheck(view, client, base, canSubscribe)`.
  - The components `SourceCard({ capture })` and `Compose({ view, client, base, scope })`.

- [ ] **Step 1: Write the failing L6 panel test**

Create `extension/tests/panel.test.ts`:

```ts
/**
 * L6 in the panel (spec §6): page values render as text. Rendered with
 * React's server renderer and judged by parsing the markup in a real DOM
 * (happy-dom): no element or attribute may come from a page value. Values go
 * through validateCapture first, as they do in the extension.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { importedHtmlAttacks } from '../../test/fixtures/imported-html-attacks.ts';
import { stamp, validateCapture } from '../lib/capture.ts';
import { SourceCard } from '../panel/SourceCard.tsx';

const TAGS = new Set(['DIV', 'IMG', 'STRONG', 'P', 'SPAN', 'TIME']);
const ATTRIBUTES = new Set(['class', 'src', 'alt', 'width', 'height', 'referrerpolicy', 'datetime']);
const PAYLOADS = [...importedHtmlAttacks.map((a) => a.html), '<script>document.documentElement.dataset.compromised=1</script>', '"><img src=x onerror=alert(1)>'];

function render(raw: Record<string, unknown>) {
  const html = renderToStaticMarkup(createElement(SourceCard, { capture: stamp(validateCapture(raw), 'u', new Date('2026-10-05T00:00:00Z')) }));
  const window = new Window();
  window.document.body.innerHTML = html;
  return window.document.body;
}

test('page values render as text in the panel (L6)', () => {
  for (const field of ['title', 'siteName', 'author'] as const) for (const payload of PAYLOADS) {
    const body = render({ url: 'https://hostile.example/p', [field]: payload, favicon: 'https://hostile.example/i.png' });
    for (const el of body.querySelectorAll('*')) {
      expect(TAGS.has(el.tagName), `page values render as text in the panel (L6): <${el.tagName}> from ${field}`).toBe(true);
      for (const name of el.getAttributeNames()) expect(ATTRIBUTES.has(name), `page values render as text in the panel (L6): ${name} from ${field}`).toBe(true);
    }
    expect(body.textContent, 'the value is shown as its own text').toContain(validateCapture({ url: 'https://x.example/', [field]: payload })[field]);
  }
});

test('contrast: ordinary values show exactly, and the favicon is an http(s) image', () => {
  const body = render({ url: 'https://news.example/p', title: 'Fish & Chips <b>', siteName: 'News Example', author: 'Ada', published: '2026-10-01T09:00:00Z', favicon: 'https://news.example/i.png' });
  expect(body.querySelector('.source-title')!.textContent).toBe('Fish & Chips <b>');
  expect(body.querySelector('img')!.getAttribute('src')).toBe('https://news.example/i.png');
  expect(body.querySelector('time')!.getAttribute('datetime')).toBe('2026-10-01T09:00:00.000Z');
});
```

Run: `PATH=/usr/local/bin:$PATH npm run test:ext -- panel`

Expected: FAIL, because `../panel/SourceCard.tsx` does not exist.

If a later run fails with `React is not defined`, the extension's vitest is using the classic JSX transform. Add `esbuild: { jsx: 'automatic' }` to `extension/vitest.config.ts` and record the change.

- [ ] **Step 2: Write `extension/panel/SourceCard.tsx`**

```tsx
import type { StoredCapture } from '../lib/capture.ts';

/** Page values render only as text (spec §6); the favicon was checked as http(s) by the worker. */
export function SourceCard({ capture }: { capture: StoredCapture }) {
  return (
    <div className="source-card">
      {capture.favicon ? <img className="favicon" src={capture.favicon} alt="" width={16} height={16} referrerPolicy="no-referrer" /> : null}
      <div>
        <strong className="source-title">{capture.title}</strong>
        <p className="source-meta">
          <span>{capture.siteName}</span>
          {capture.author ? <span> · {capture.author}</span> : null}
          {capture.published ? <span> · <time dateTime={capture.published}>{capture.published.slice(0, 10)}</time></span> : null}
        </p>
      </div>
    </div>
  );
}
```

Run `npm run test:ext -- panel` again. Expected: PASS.

- [ ] **Step 3: Write `extension/panel/useDraft.ts`**

```ts
/*
 * The panel's side of the draft (spec §4.6). The worker owns the draft; this
 * holds the text on screen, the lease and the edit queue. While holding the
 * lease, the panel inserts each capture's quote itself, so the worker never
 * changes the body underneath typing.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StoredCapture } from '../lib/capture.ts';
import { appendClip, type Citation, type Draft } from '../lib/compose.ts';
import type { WorkerMessage } from '../lib/channel.ts';
import type { Snapshot } from '../lib/draft-store.ts';
import { EditQueue, type EditFields, type QueuePhase } from '../lib/edit-queue.ts';
import { PanelChannel } from '../lib/panel-channel.ts';
import type { Status } from '../lib/tokens.ts';

export interface DraftView {
  status?: Status;
  snapshot?: Snapshot;
  /** What is on screen: the holder's own text, or the stored draft mirrored read-only. */
  text: string;
  citation?: Citation;
  phase: QueuePhase;
  conflict?: string;
  notice?: string;
  /** The latest text, for callbacks that outlive a render. */
  current(): string;
  type(text: string): void;
  edit(fields: Omit<EditFields, 'absorb'>): void;
  editHere(): void;
  appendConflict(): void;
  dismissConflict(): void;
  dismissNotice(): void;
}

export function useDraft(): DraftView {
  const [status, setStatus] = useState<Status>();
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [text, setText] = useState('');
  const [citation, setCitation] = useState<Citation>();
  const [phase, setPhase] = useState<QueuePhase>('saved');
  const [conflict, setConflict] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const textRef = useRef('');
  const draftRef = useRef<Draft | undefined>(undefined);
  const holderRef = useRef(false);
  const seen = useRef(false);
  const absorbed = useRef<StoredCapture[]>([]);
  const early = useRef<StoredCapture[]>([]);
  const queue = useRef<EditQueue | undefined>(undefined);

  const show = (draft: Draft) => {
    textRef.current = draft.text;
    setText(draft.text);
    setCitation(draft.citation);
  };
  const change = (fields: EditFields) => {
    if (fields.text !== undefined) {
      textRef.current = fields.text;
      setText(fields.text);
    }
    if (fields.citation) setCitation(fields.citation);
    queue.current?.change(fields);
  };
  const channel = useMemo(
    () =>
      new PanelChannel(
        () => queue.current?.lost(),
        // A panel that was holding, or has never been told, asks for the lease; a read-only one does not.
        () => ({ type: 'hello', wantLease: holderRef.current || !seen.current }),
      ),
    [],
  );

  useEffect(() => {
    const onCapture = (capture: StoredCapture) => {
      const draft = draftRef.current;
      if (!holderRef.current || !draft) {
        if (!early.current.some((c) => c.uuid === capture.uuid)) early.current.push(capture);
        return;
      }
      const captures = [...draft.captures, ...absorbed.current];
      if (captures.some((c) => c.uuid === capture.uuid)) return;
      absorbed.current = [...absorbed.current, capture];
      change({ text: appendClip(textRef.current, { ...draft, captures }, capture), absorb: [capture.uuid] });
    };
    const onState = (state: Snapshot) => {
      seen.current = true;
      setSnapshot(state);
      const draft = state.draft;
      if (!draft) return;
      const wasHolder = holderRef.current;
      holderRef.current = state.holder;
      draftRef.current = draft;
      absorbed.current = absorbed.current.filter((c) => !draft.captures.some((d) => d.uuid === c.uuid));
      if (!state.holder) {
        // Read-only: mirror the stored draft, unless this window still has input of its own to show.
        if (!queue.current || queue.current.phase === 'saved') show(draft);
        return;
      }
      if (!wasHolder || !queue.current) {
        // Newly holding (first open, or Edit here): reload the stored draft; unsent input is shown, never resent.
        const unsent = queue.current?.reset(draft)?.text;
        queue.current ??= new EditQueue(draft.revision, (id, edit) => channel.send({ type: 'edit', id, edit }), setPhase);
        show(draft);
        if (unsent !== undefined && unsent !== draft.text) setConflict(unsent);
        for (const capture of early.current.splice(0)) onCapture(capture);
        return;
      }
      queue.current.resume();
      if (queue.current.phase === 'saved' && draft.revision === queue.current.acknowledged) show(draft);
    };
    const off = channel.listen((message: WorkerMessage) => {
      if (message.type === 'status') setStatus(message.status);
      else if (message.type === 'state') onState(message.state);
      else if (message.type === 'capture') onCapture(message.capture);
      else if (message.type === 'edit-result') queue.current?.result(message.id, message.result);
      else if (message.type === 'notice') setNotice(message.message);
    });
    channel.open();
    return () => {
      off();
      channel.close();
    };
  }, [channel]);

  return {
    status,
    snapshot,
    text,
    citation,
    phase,
    conflict,
    notice,
    current: () => textRef.current,
    type: (next) => {
      if (holderRef.current && queue.current?.phase !== 'unsent') change({ text: next });
    },
    edit: (fields) => {
      if (holderRef.current) change(fields);
    },
    editHere: () => channel.send({ type: 'claim' }),
    appendConflict: () => {
      const extra = conflict;
      setConflict(undefined);
      if (extra) change({ text: `${textRef.current.replace(/\s+$/, '')}\n\n${extra}` });
    },
    dismissConflict: () => setConflict(undefined),
    dismissNotice: () => setNotice(undefined),
  };
}
```

- [ ] **Step 4: Write `extension/panel/useTransclusion.ts`**

```ts
import { useEffect } from 'react';
import type { BlyggerClient } from '../../sdk/dist/browser.js';
import { getPreview } from '../../src/ui/composer.tsx';
import type { StoredCapture } from '../lib/capture.ts';
import { switchQuote, type Transclusion } from '../lib/compose.ts';
import { checkTransclusion } from '../lib/transclusion.ts';
import type { DraftView } from './useDraft.ts';

/** Apply a check's result. The first quote switches only if it is still as clipped (spec §4.4). */
export function settle(view: DraftView, first: StoredCapture, result: Transclusion) {
  if (result.state !== 'used') {
    view.edit({ transclusion: result });
    return;
  }
  const switched = switchQuote(view.current(), first, 'used');
  view.edit(switched === null ? { transclusion: { state: 'fallback', reason: 'You edited the quote before it could be checked, so it is quoted as a link.' } } : { text: switched, transclusion: result });
}

/** The lease holder runs the check once per draft whose first clip quotes a blyg item. */
export function useTransclusionCheck(view: DraftView, client: BlyggerClient, base: string, canSubscribe: boolean) {
  const draft = view.snapshot?.draft;
  const first = draft?.captures[0];
  const pending = !!view.snapshot?.holder && draft?.transclusion?.state === 'pending';
  useEffect(() => {
    if (!pending || !first) return;
    let cancelled = false;
    checkTransclusion(first, { preview: (md) => getPreview(client, md, undefined, 'thread'), base, canSubscribe }).then(
      (result) => {
        if (!cancelled) settle(view, first, result);
      },
      (error: unknown) => {
        if (!cancelled) view.edit({ transclusion: { state: 'fallback', reason: `Could not check the quote (${error instanceof Error ? error.message : String(error)}), so it is quoted as a link.` } });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [pending, first?.uuid, client, base, canSubscribe]);
}
```

- [ ] **Step 5: Write `extension/panel/Compose.tsx`**

```tsx
import { useState } from 'react';
import type { BlyggerClient } from '../../sdk/dist/browser.js';
import { BlyggerApi } from '../../sdk/dist/browser.js';
import { getPreview, pourOver, usePreview } from '../../src/ui/composer.tsx';
import { Button, Failure, Html } from '../../src/ui/primitives.tsx';
import type { StoredCapture } from '../lib/capture.ts';
import type { Transclusion } from '../lib/compose.ts';
import { subscribeAndWait } from '../lib/transclusion.ts';
import { SourceCard } from './SourceCard.tsx';
import type { DraftView } from './useDraft.ts';
import { settle, useTransclusionCheck } from './useTransclusion.ts';

const PHASE = { saved: 'Saved on this device.', saving: 'Saving on this device…', unsent: 'Not saved: another window has this draft.' } as const;

function TransclusionNotice({ t, first, subscribe, asLink, busy }: { t?: Transclusion; first: StoredCapture; subscribe: () => void; asLink: () => void; busy: boolean }) {
  if (!t) return null;
  if (t.state === 'pending') return <p className="hint" role="status">Checking whether your blyg can quote this as a transclusion…</p>;
  if (t.state === 'fallback') return <p className="notice" role="status">{t.reason}</p>;
  if (t.state === 'used') {
    const captured = first.blyg?.version;
    return <p className="hint" role="status">{captured === undefined || captured === t.held ? `Quoting v${t.held} as a transclusion.` : `Quoting v${t.held}; this page shows v${captured}.`}</p>;
  }
  return (
    <div className="notice" role="group" aria-label="Subscribe to quote as a transclusion">
      <p>Your blyg does not follow {first.siteName}.</p>
      <Button className="btn" onClick={subscribe} disabled={busy}>Subscribe to {first.siteName} to quote it as a transclusion</Button>
      <Button className="btn btn-ghost" onClick={asLink} disabled={busy}>Quote as a link instead</Button>
    </div>
  );
}

export function Compose({ view, client, base, scope }: { view: DraftView; client: BlyggerClient; base: string; scope: string[] }) {
  const draft = view.snapshot?.draft;
  const first = draft?.captures[0];
  const holder = !!view.snapshot?.holder && view.phase !== 'unsent';
  const preview = usePreview(client, view.text, undefined, 'thread');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  useTransclusionCheck(view, client, base, scope.includes('owner:manage'));
  if (!draft || !first) {
    return <p className="hint">Select text on any page, right-click and choose <strong>Quote in Blygger</strong>, or press Alt+Shift+Q.</p>;
  }
  const citation = view.citation ?? { source: first.siteName };
  const subscribe = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await subscribeAndWait(first, {
        subscribe: async () => {
          // confirm: the owner pressed the button, which is the confirmation (spec §4.4).
          const r = await BlyggerApi.createSubscription({ client, body: { url: first.blyg!.origin, confirm: true } });
          if (r.error && r.response?.status !== 409) throw new Error(`Subscribing failed (${r.response?.status ?? 'no response'}).`);
        },
        preview: (md) => getPreview(client, md, undefined, 'thread'),
        base,
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        now: () => Date.now(),
      });
      settle(view, first, result);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="compose">
      <SourceCard capture={first} />
      <div className="citation">
        <label>Source <input value={citation.source} readOnly={!holder} onChange={(e) => view.edit({ citation: { ...citation, source: e.target.value } })} /></label>
        <label>Author <input value={citation.author ?? ''} readOnly={!holder} onChange={(e) => view.edit({ citation: { source: citation.source, ...(e.target.value ? { author: e.target.value } : {}) } })} /></label>
      </div>
      {draft.captures.some((c) => c.degraded) ? <p className="notice">Chrome does not let extensions read this page, so only the selected text was kept.</p> : null}
      <TransclusionNotice t={draft.transclusion} first={first} subscribe={() => void subscribe()} asLink={() => view.edit({ transclusion: { state: 'fallback', reason: 'Quoted as a link.' } })} busy={busy} />
      {!holder ? (
        <p className="notice" role="status">This draft is open in another window. <Button className="btn" onClick={view.editHere}>Edit here</Button></p>
      ) : null}
      {view.conflict !== undefined ? (
        <div className="conflict" role="group" aria-label="Unsent text">
          <p className="notice">This window had text that was not saved. The draft above is the saved one.</p>
          <pre className="unsent">{view.conflict}</pre>
          <Button className="btn" onClick={() => void navigator.clipboard.writeText(view.conflict ?? '')}>Copy</Button>
          <Button className="btn" onClick={view.appendConflict}>Append to draft</Button>
          <Button className="btn btn-ghost" onClick={view.dismissConflict}>Dismiss</Button>
        </div>
      ) : null}
      <textarea aria-label="Your words" value={view.text} readOnly={!holder} rows={12} onChange={(e) => view.type(e.target.value)} onPaste={(e) => void pourOver(e, view.type)} />
      <p className="hint" role="status">{PHASE[view.phase]}</p>
      <Failure error={error} />
      {preview?.errors?.length ? <ul className="preview-errors">{preview.errors.map((issue, i) => <li key={i}>{issue.reason}</li>)}</ul> : null}
      {preview?.html ? <div className="preview"><Html html={preview.html} /></div> : null}
    </section>
  );
}
```

- [ ] **Step 6: Wire the panel**

Replace `extension/panel/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { createBlyggerClient } from '../../sdk/dist/browser.js';
import { createStudioData, type StudioData } from '../../src/ui/data-core.ts';
import { configureHost } from '../../src/ui/host.ts';
import { Button, Failure } from '../../src/ui/primitives.tsx';
import { ask } from '../lib/messages.ts';
import type { Status } from '../lib/tokens.ts';
import { Compose } from './Compose.tsx';
import { Connect } from './Connect.tsx';
import { useDraft, type DraftView } from './useDraft.ts';

export function App() {
  const view = useDraft();
  const [status, setStatus] = useState<Status>();
  // The worker tells every panel when the connection changes (a grant ending included).
  useEffect(() => {
    if (view.status) setStatus(view.status);
  }, [view.status]);
  if (!status) return <main className="panel"><p className="hint">Loading…</p></main>;
  if (status.state !== 'connected') return <Connect status={status} onStatus={setStatus} view={view} />;
  // Keyed by blyg: a change unmounts every consumer before the old data is disposed (Plan 2).
  return <Connected key={`${status.origin}${status.mount}`} status={status} onStatus={setStatus} view={view} />;
}

type Connected = Extract<Status, { state: 'connected' }>;

export function Notice({ view }: { view: DraftView }) {
  if (!view.notice) return null;
  return <p className="error-banner" role="alert">{view.notice} <Button className="btn btn-ghost" onClick={view.dismissNotice}>Dismiss</Button></p>;
}

function Connected({ status, onStatus, view }: { status: Connected; onStatus: (status: Status) => void; view: DraftView }) {
  const [leaveError, setLeaveError] = useState<unknown>();
  // One client and one data instance per connected blyg; the worker supplies tokens.
  const { client, data } = useMemo(() => {
    configureHost({ origin: status.origin, mount: status.mount });
    const client = createBlyggerClient({ baseUrl: status.origin, auth: (auth) => (auth.scheme === 'bearer' ? ask({ type: 'access-token' }) : undefined) });
    return { client, data: createStudioData(client) };
  }, [status.origin, status.mount]);
  useEffect(() => () => void data.dispose(), [data]);
  const host = new URL(status.origin).host;
  return (
    <main className="panel">
      <header className="panel-head"><h1>Blygger Clipper</h1></header>
      {status.scope.includes('owner:read') ? <SiteTitle data={data} fallback={host} /> : <p className="connected">Connected to <strong>{host}</strong></p>}
      <Notice view={view} />
      {status.scope.includes('owner:draft') ? (
        <Compose view={view} client={client} base={`${status.origin}${status.mount}/`} scope={status.scope} />
      ) : (
        <Failure error="This connection cannot clip: it lacks the draft permission. Disconnect and connect again, leaving drafting ticked." />
      )}
      <Failure error={leaveError} />
      <Button className="btn btn-ghost" onClick={async () => {
        try {
          setLeaveError(undefined);
          onStatus(await ask({ type: 'disconnect' }));
        } catch (error) {
          setLeaveError(error);
        }
      }}>Disconnect</Button>
    </main>
  );
}

function SiteTitle({ data, fallback }: { data: StudioData; fallback: string }) {
  const { data: rows } = useLiveQuery((q) => q.from({ settings: data.settings }));
  return <p className="connected">Connected to <strong>{rows?.[0]?.site_title || fallback}</strong></p>;
}
```

In `extension/panel/Connect.tsx`:

1. Change the signature to `export function Connect({ status, onStatus, view }: { status: Exclude<Status, { state: 'connected' }>; onStatus: (status: Status) => void; view: DraftView })`, importing `DraftView` from `./useDraft.ts` and `Notice` from `./App.tsx`.

2. Directly after the `panel-head` header, add:

```tsx
      <Notice view={view} />
      {view.snapshot?.inbox ? (
        <p className="notice" role="status">{view.snapshot.inbox === 1 ? '1 clip is waiting. Connect to keep it.' : `${view.snapshot.inbox} clips are waiting. Connect to keep them.`}</p>
      ) : null}
```

3. Change the reconnect notice line to:

```tsx
      {status.state === 'reconnect' ? (
        <div className="notice" role="status">
          <p>{status.reason}</p>
          <Button className="btn btn-ghost" disabled={busy} onClick={async () => {
            try {
              onStatus(await ask({ type: 'disconnect' }));
            } catch (failure) {
              setError(failure);
            }
          }}>Forget this blyg</Button>
        </div>
      ) : null}
```

4. Append this sentence to the end of the hint paragraph under the Connect button: ` On the consent page, leave Drafting ticked, or the clipper cannot clip.`

Append to `extension/panel/panel.css`:

```css
.compose { display: grid; gap: 10px; }
.source-card { display: flex; gap: 8px; align-items: flex-start; }
.source-card .favicon { margin-top: 4px; }
.source-title { display: block; }
.source-meta { margin: 0; color: #8a8a8a; font-size: 0.9rem; }
.citation { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.citation label { display: grid; gap: 2px; font-size: 0.85rem; color: #8a8a8a; }
.compose textarea { font: inherit; min-height: 12rem; padding: 8px; border: 1px solid #8888; border-radius: 6px; background: transparent; color: inherit; resize: vertical; }
.conflict { display: grid; gap: 6px; }
.unsent { white-space: pre-wrap; margin: 0; padding: 8px; border: 1px dashed #8888; border-radius: 6px; max-height: 12rem; overflow: auto; }
.preview { border-top: 1px solid #8884; padding-top: 8px; overflow-wrap: anywhere; }
.preview-errors { margin: 0; padding-left: 1.2rem; color: #c03a3a; font-size: 0.9rem; }
```

Run: `PATH=/usr/local/bin:$PATH npm run typecheck && PATH=/usr/local/bin:$PATH npm run test:ext`

Expected: clean and PASS. Fix type errors at their source.

`Connect.tsx` imports `Notice` from `App.tsx`, and `App.tsx` imports `Connect`. If that circular import causes trouble, move `Notice` into its own `extension/panel/Notice.tsx` and import it from both.

- [ ] **Step 7: Write the browser tests**

In `e2e/clipper.spec.ts`:

1. Add `readFileSync` to the `node:fs` import.

2. Replace the `context` and `panel` fixtures with a `profile` fixture plus these helpers, so a test can restart the browser on the same profile:

```ts
const launch = (dir: string) => chromium.launchPersistentContext(dir, {
  channel: 'chromium',
  args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
});
async function workerOf(context: BrowserContext) {
  return context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
}
async function panelIn(context: BrowserContext) {
  const worker = await workerOf(context);
  const page = await context.newPage();
  await page.goto(`chrome-extension://${new URL(worker.url()).host}/sidepanel.html`);
  return page;
}
```

The fixture type becomes `{ profile: string; context: BrowserContext; panel: Page; owner: APIRequestContext; mint: ... }`, with:

```ts
  profile: async ({}, use) => { await use(mkdtempSync(join(tmpdir(), 'clipper-'))); },
  context: async ({ profile }, use) => {
    const context = await launch(profile);
    await use(context);
    await context.close();
  },
  panel: async ({ context }, use) => { await use(await panelIn(context)); },
```

3. Append the helpers and tests:

```ts
const ARTICLE = readFileSync('extension/tests/fixtures/article.html', 'utf8');
const HOSTILE = readFileSync('extension/tests/fixtures/hostile.html', 'utf8');
const words = (panel: Page) => panel.getByLabel('Your words');

/** Playwright cannot click Chrome's context menu; the e2e build's hook calls the same handler (Plan 3b ruling). */
async function clip(context: BrowserContext, pattern: string, kind: 'selection' | 'page' = 'selection') {
  await (await workerOf(context)).evaluate(async ({ pattern, kind }) => {
    const g = globalThis as unknown as {
      chrome: { tabs: { query(q: { url: string }): Promise<{ id?: number; url?: string; title?: string }[]> } };
      __clipperTest: { menu(info: { menuItemId: string; frameId: number }, tab: object): Promise<void> };
    };
    const [tab] = await g.chrome.tabs.query({ url: pattern });
    if (!tab) throw new Error('no tab matches ' + pattern);
    await g.__clipperTest.menu({ menuItemId: kind === 'page' ? 'clip-page' : 'quote-selection', frameId: 0 }, tab);
  }, { pattern, kind });
}
async function select(page: Page, text: string) {
  await page.evaluate((text) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = node.textContent!.indexOf(text);
      if (at < 0) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + text.length);
      getSelection()!.removeAllRanges();
      getSelection()!.addRange(range);
      return;
    }
    throw new Error('not on the page: ' + text);
  }, text);
}
async function selectParagraph(page: Page, id: string) {
  await page.evaluate((id) => {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById(id)!);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  }, id);
}
/** Everything the worker has stored, as text: the judge for durability reads storage, not the panel. */
async function storedDraft(context: BrowserContext) {
  return (await workerOf(context)).evaluate(async () => {
    const g = globalThis as unknown as { chrome: { storage: { local: { get(keys: null): Promise<Record<string, unknown>> } } } };
    return JSON.stringify(await g.chrome.storage.local.get(null));
  });
}
async function open(context: BrowserContext, url: string, body: string) {
  await context.route(`${new URL(url).origin}/**`, (route) => route.fulfill({ contentType: 'text/html', body }));
  const page = await context.newPage();
  await page.goto(url);
  return page;
}

test('a selection clipped from a page arrives quoted, with its source (spec §4.3)', async ({ context, panel, mint }) => {
  await connectWithToken(panel, await mint(['owner:read', 'owner:draft']));
  await expect(panel.getByText('Quote in Blygger')).toBeVisible();
  const page = await open(context, 'https://news.example/2026/10/post', ARTICLE);
  await select(page, 'Use *stars* and [brackets](not a link) literally.');
  await clip(context, 'https://news.example/*');
  await expect.poll(() => words(panel).inputValue()).toContain('> Use \\*stars\\* and \\[brackets\\](not a link) literally.');
  await expect(panel.locator('.source-title')).toHaveText('A Post About Things');
  await expect(panel.getByLabel('Source')).toHaveValue('News Example');
  await expect(panel.getByLabel('Author')).toHaveValue('Ada Writer');
  await expect(panel.getByText('Saved on this device.')).toBeVisible();
});

test('a clip survives the panel never opening and a browser restart (L1)', async ({ context, panel, mint, profile }) => {
  await connectWithToken(panel, await mint(['owner:read', 'owner:draft']));
  await expect(panel.getByText('Quote in Blygger')).toBeVisible();
  await panel.close();
  const page = await open(context, 'https://news.example/2026/10/post', ARTICLE);
  await selectParagraph(page, 'one');
  await clip(context, 'https://news.example/*');
  await context.close();
  const again = await launch(profile);
  try {
    const reopened = await panelIn(again);
    await expect.poll(() => words(reopened).inputValue(), { message: 'every accepted capture survives a restart (L1)' }).toContain('First quoted paragraph with _emphasis_ and `code`.');
  } finally {
    await again.close();
  }
});

test('typed words survive a reload once the worker has stored them (L1)', async ({ context, panel, mint }) => {
  await connectWithToken(panel, await mint(['owner:read', 'owner:draft']));
  const page = await open(context, 'https://news.example/2026/10/post', ARTICLE);
  await selectParagraph(page, 'one');
  await clip(context, 'https://news.example/*');
  await expect.poll(() => words(panel).inputValue()).toContain('First quoted paragraph');
  await words(panel).press('ControlOrMeta+End');
  await panel.keyboard.type('My own words.');
  // The durability boundary itself: the worker's storage holds the words (spec §4.6).
  await expect.poll(() => storedDraft(context), { message: 'the worker stores each acknowledged edit (L1)' }).toContain('My own words.');
  await expect(panel.getByText('Saved on this device.')).toBeVisible();
  await panel.reload();
  await expect.poll(() => words(panel).inputValue(), { message: 'an acknowledged edit is never lost (L1)' }).toContain('My own words.');
});

test('rapid captures all arrive, in order (spec §4.1)', async ({ context, panel, mint }) => {
  await connectWithToken(panel, await mint(['owner:read', 'owner:draft']));
  const page = await open(context, 'https://news.example/2026/10/post', ARTICLE);
  for (const id of ['one', 'two', 'three']) {
    await selectParagraph(page, id);
    await clip(context, 'https://news.example/*');
  }
  await expect.poll(() => words(panel).inputValue(), { message: 'none overwrites another' }).toContain('Use \\*stars');
  const text = await words(panel).inputValue();
  const at = [text.indexOf('First quoted'), text.indexOf('Second quoted'), text.indexOf('Use \\*stars')];
  expect(at.every((i) => i >= 0), 'every capture arrived').toBe(true);
  expect([...at].sort((a, b) => a - b), 'in the order clipped').toEqual(at);
});

test('a second window is read-only until Edit here, and nothing is lost (spec §4.6)', async ({ context, panel, mint }) => {
  await connectWithToken(panel, await mint(['owner:read', 'owner:draft']));
  const page = await open(context, 'https://news.example/2026/10/post', ARTICLE);
  await selectParagraph(page, 'one');
  await clip(context, 'https://news.example/*');
  await expect.poll(() => words(panel).inputValue()).toContain('First quoted paragraph');
  const second = await panelIn(context);
  await expect(second.getByText('This draft is open in another window.')).toBeVisible();
  await expect(words(second)).toHaveJSProperty('readOnly', true);
  await second.getByRole('button', { name: 'Edit here' }).click();
  await expect(words(second)).toHaveJSProperty('readOnly', false);
  await expect(panel.getByText('This draft is open in another window.')).toBeVisible();
  await words(second).press('ControlOrMeta+End');
  await second.keyboard.type('From the second window.');
  await expect(second.getByText('Saved on this device.')).toBeVisible();
  await expect.poll(() => words(panel).inputValue(), { message: 'the read-only window mirrors the saved draft' }).toContain('From the second window.');
});

test('a clip of a blyg item becomes a transclusion of it (L8)', async ({ context, panel, mint, owner }) => {
  const created = await owner.post(`${BLYG}/api/items`, { data: { kind: 'fragment', content_md: 'A published thought worth quoting.' } });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };
  expect((await owner.post(`${BLYG}/api/items/${id}/publish`, { data: {} })).status()).toBe(200);
  await connectWithToken(panel, await mint(['owner:read', 'owner:draft']));
  const page = await context.newPage();
  await page.goto(`${BLYG}/f/${id}/`);
  await select(page, 'A published thought worth quoting.');
  await clip(context, `${BLYG}/*`);
  await expect.poll(() => words(panel).inputValue(), { message: 'transclusion only for the captured origin and id (L8)' }).toContain(`![[${id}]]\n> A published thought worth quoting.`);
  await expect(panel.getByText('Quoting v1 as a transclusion.')).toBeVisible();
});

test('hostile page values stay inert in the panel (L6)', async ({ context, panel, mint }) => {
  await connectWithToken(panel, await mint(['owner:read', 'owner:draft']));
  const page = await open(context, 'https://hostile.example/p', HOSTILE);
  await selectParagraph(page, 'bait');
  await clip(context, 'https://hostile.example/*');
  await expect(panel.locator('.source-title')).toContainText('Hostile');
  await expect.poll(() => words(panel).inputValue()).toContain('click me');
  await expect(panel.locator('.preview')).toBeVisible();
  expect(await panel.evaluate(() => document.documentElement.dataset.compromised), 'page values stay inert in the panel (L6)').toBeUndefined();
  expect(await panel.locator('.compose script, .compose svg, .compose [onerror], .compose [onclick]').count(), 'page values stay inert in the panel (L6)').toBe(0);
  expect(await panel.locator('.preview a[href^="javascript:"], .preview a[href^="data:"]').count(), 'page values stay inert in the panel (L6)').toBe(0);
  expect(await words(panel).inputValue()).not.toMatch(/javascript:|data:text/);
});

test('a clip while disconnected waits, and connecting keeps it (Review Focus 5)', async ({ context, panel, mint }) => {
  const page = await open(context, 'https://news.example/2026/10/post', ARTICLE);
  await selectParagraph(page, 'one');
  await clip(context, 'https://news.example/*');
  await expect(panel.getByText('1 clip is waiting. Connect to keep it.')).toBeVisible();
  await connectWithToken(panel, await mint(['owner:read', 'owner:draft']));
  await expect.poll(() => words(panel).inputValue(), { message: 'connecting delivers the waiting clip (L1)' }).toContain('First quoted paragraph');
});

test('"Clip this page" starts an empty body under the citation (spec §4.3)', async ({ context, panel, mint }) => {
  await connectWithToken(panel, await mint(['owner:read', 'owner:draft']));
  await open(context, 'https://news.example/2026/10/post', ARTICLE);
  await clip(context, 'https://news.example/*', 'page');
  await expect(panel.locator('.source-title')).toHaveText('A Post About Things');
  await expect(words(panel)).toHaveValue('');
});
```

- [ ] **Step 8: Run the browser tests**

Run: `PATH=/usr/local/bin:$PATH npm run ext:build:e2e && PATH=/usr/local/bin:$PATH node node_modules/@playwright/test/cli.js test e2e/clipper.spec.ts --project=desktop`

Expected: all 12 tests pass (3 from Plan 3a, 9 new).

Real Chromium may differ from what these tests assume. Fix the smallest thing that keeps the law, and record exactly what you changed and why. Three likely cases:
- `chrome.tabs.query` with a port in the pattern.
- The published page's path.
- Whether a routed page's favicon request matters.

Never weaken a law assertion, meaning any line with "(L1)", "(L6)" or "(L8)" in its message. If one fails for a reason in the product, report DONE_WITH_CONCERNS with the evidence.

- [ ] **Step 9: Commit**

```bash
git add extension/panel extension/tests/panel.test.ts extension/vitest.config.ts e2e/clipper.spec.ts
git commit -m "Panel: compose from clips, edit under a lease, survive restarts"
```

---

### Task 8: The clipper's mutation controls, CI and docs

**Files:**
- Create: `scripts/mutation-engine.ts`, `scripts/verify-clipper-mutations.ts`
- Modify:
  - `scripts/verify-auth-security-mutations.ts` (it uses the engine)
  - `package.json`, `.github/workflows/check.yml`, `extension/README.md`, `docs/client-access.md`

**Interfaces:**
- Produces:
  - `scripts/mutation-engine.ts` exports `interface Control { name; changes: { file; from; to }[]; kind: 'worker' | 'browser' | 'race' | 'ext'; test; pattern; checkpoint }` and `runControls(controls: Control[], options: { prefix: string; log: string; selector?: string }): void`.
  - The script `npm run test:clipper:mutations`.

- [ ] **Step 1: Extract the engine**

Create `scripts/mutation-engine.ts`:
- Move into it everything in `scripts/verify-auth-security-mutations.ts` from `const root = resolve('.'), temporary = …` to the end of the file, **except** the `const controls = [ … ];` array.
- Wrap the moved code in `export function runControls(controls: Control[], options: { prefix: string; log: string; selector?: string }) { … }`.
- Move the imports it needs with it.
- Make exactly these edits inside the function:
  - `mkdtempSync(join(tmpdir(), 'blygger-security-controls-'))` becomes `mkdtempSync(join(tmpdir(), options.prefix))`.
  - `const selector = process.argv[2];` becomes `const selector = options.selector;`.
  - The log file name `'security-mutant-' + controls.indexOf(control) + '.log'` becomes `options.log + controls.indexOf(control) + '.log'`.
  - In `execute`, add an `ext` kind ahead of the default: `control.kind === 'ext' ? [join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--config', 'extension/vitest.config.ts', control.test, '-t', control.pattern] : …`.
  - The "Baseline ran no tests" check applies to `ext` as it does to `worker`.

Start the engine file with:

```ts
/**
 * The engine both mutation runners share; each runner's header states its
 * model. Per control: an isolated baseline passes and runs at least one
 * test; the mutant then fails at the named semantic checkpoint, with no
 * setup error or timeout. The working checkout is never changed.
 */
export interface Control {
  name: string;
  changes: { file: string; from: string; to: string }[];
  kind: 'worker' | 'browser' | 'race' | 'ext';
  test: string;
  pattern: string;
  checkpoint: string;
}
```

In `scripts/verify-auth-security-mutations.ts`:
- Keep its header comment and the `controls` array, typed as `const controls: Control[] = [`.
- Import `{ runControls, type Control }` from `./mutation-engine.ts`.
- Delete the moved code and the imports only it used.
- End the file with:

```ts
runControls(controls, { prefix: 'blygger-security-controls-', log: 'security-mutant-', selector: process.argv[2] });
```

- [ ] **Step 2: Check the auth runner still runs**

Run: `PATH=/usr/local/bin:$PATH node --import tsx scripts/verify-auth-security-mutations.ts clipper`

Expected: `Caught:` for each control whose name contains "clipper", with exit 0.

Then run one browser-kind control by its full name. Take the first `kind: 'browser'` entry in the array and pass its name. Expected: `Caught:` for it, with exit 0.

- [ ] **Step 3: Write the clipper runner**

Create `scripts/verify-clipper-mutations.ts`:

```ts
/**
 * The clipper's laws (spec §7.1) are useful only if they reject a plausible
 * broken extension. Each control below removes one defence from the code
 * Plan 3b built, the realistic regression named in spec §7.4, and must be
 * caught by its law's own assertion message. Plan 3c adds the save, queue
 * and publish controls. Engine and rules: scripts/mutation-engine.ts.
 */
import { runControls, type Control } from './mutation-engine.ts';

const ext = (name: string, file: string, from: string, to: string, test: string, pattern: string, checkpoint: string): Control => ({ name, changes: [{ file, from, to }], kind: 'ext', test, pattern, checkpoint });

const controls: Control[] = [
  ext('clipper inbox cleared before the draft write lands', 'extension/lib/draft-store.ts',
    'await this.local.set({ [draftKey(base)]: next, [INBOX]: [] });',
    'await this.local.set({ [INBOX]: [] });\n      await this.local.set({ [draftKey(base)]: next });',
    'extension/tests/draft-store.test.ts', 'terminated mid-delivery', 'an accepted capture is in exactly one place (L1)'),
  ext('clipper recovery appends without checking uuids', 'extension/lib/draft-store.ts',
    'if (!(await this.isKnown(draft, c.uuid)) && !fresh.some((f) => f.uuid === c.uuid)) fresh.push(c);',
    'fresh.push(c);',
    'extension/tests/draft-store.test.ts', 'never appends a capture twice', 'recovery never appends a capture twice (L1b)'),
  ext('clipper non-holder edit accepted', 'extension/lib/draft-store.ts',
    "if (this.holder !== port) return { ok: false, reason: 'lease', draft };", '',
    'extension/tests/draft-store.test.ts', 'non-holder cannot write', 'a non-holder cannot write the draft (L1b)'),
  ext('clipper stale edit accepted', 'extension/lib/draft-store.ts',
    "if (edit.baseRevision !== draft.revision) return { ok: false, reason: 'stale', draft };", '',
    'extension/tests/draft-store.test.ts', 'stale base cannot overwrite', 'a stale base cannot overwrite the draft (L1b)'),
  ext('clipper worker appends under a lease', 'extension/lib/draft-store.ts',
    '      if (this.holder) return;\n', '',
    'extension/tests/draft-store.test.ts', 'never changes the body under a lease holder', 'the worker never changes the body under a lease holder (L1b)'),
  ext('clipper second edit while one is in flight', 'extension/lib/edit-queue.ts',
    'if (this.inflight || !this.pending || this.refused || this.offline) return;',
    'if (!this.pending || this.refused || this.offline) return;',
    'extension/tests/edit-queue.test.ts', 'fast typing', 'one edit in flight at a time (L1b)'),
  ext('clipper saved before the worker acknowledges', 'extension/lib/edit-queue.ts',
    "return this.refused ? 'unsent' : this.inflight || this.pending ? 'saving' : 'saved';",
    "return this.refused ? 'unsent' : this.pending ? 'saving' : 'saved';",
    'extension/tests/edit-queue.test.ts', 'waits for the acknowledgement', '"saved" waits for the acknowledgement (L1)'),
  ext('clipper edit here resends unsent text', 'extension/lib/edit-queue.ts',
    '    this.pending = undefined;\n    this.settle();',
    '    this.pending = unsent;\n    this.pump();\n    this.settle();',
    'extension/tests/edit-queue.test.ts', 'never resends it', '"Edit here" never resends unsent text (L1b)'),
  ext('clipper page title rendered as HTML', 'extension/panel/SourceCard.tsx',
    '<strong className="source-title">{capture.title}</strong>',
    '<strong className="source-title" dangerouslySetInnerHTML={{ __html: capture.title }} />',
    'extension/tests/panel.test.ts', 'render as text in the panel', 'page values render as text in the panel (L6)'),
  ext('clipper link scheme not checked', 'extension/lib/capture.ts',
    'return schemes.includes(url.protocol) ? url.href : undefined;', 'return url.href;',
    'extension/tests/capture.test.ts', 'inventory sweep', 'every page URL is http(s) or dropped (L6)'),
  ext('clipper fragment link from unescaped text', 'extension/lib/capture.ts',
    "const term = (s: string) => encodeURIComponent(s).replace(/[-!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());",
    'const term = (s: string) => s;',
    'extension/tests/capture.test.ts', 'directive characters', 'the fragment link decodes to the quote (L7)'),
  ext('clipper excerpt not capped', 'extension/lib/compose.ts',
    'excerpt: graphemePrefix(first.quote.text, 200)', 'excerpt: first.quote.text',
    'extension/tests/compose.test.ts', 'capped excerpt', 'the excerpt is a caption, at most 200 characters (L7)'),
  ext("clipper answers a page context", 'extension/lib/messages.ts',
    "return sender.id === runtimeId && typeof sender.url === 'string' && sender.url.startsWith(extensionBase);", 'return true;',
    'extension/tests/messages.test.ts', "own pages are answered", "only the clipper's own pages are answered"),
  { name: 'clipper preview identity check skipped', changes: [{ file: 'extension/lib/transclusion.ts', from: "if (!right) return { state: 'fallback', reason: REASONS.identity };", to: '' }], kind: 'worker', test: 'test/clipper-oauth.test.ts', pattern: 'transclusion identity', checkpoint: 'transclusion only for the captured origin and id (L8)' },
];

runControls(controls, { prefix: 'blygger-clipper-controls-', log: 'clipper-mutant-', selector: process.argv[2] });
```

Add `"test:clipper:mutations": "node --import tsx scripts/verify-clipper-mutations.ts"` to `package.json` scripts. In `.github/workflows/check.yml`, add `- run: npm run test:clipper:mutations` directly after the `test:auth:security:mutations` step.

- [ ] **Step 4: Run the clipper runner**

Run: `PATH=/usr/local/bin:$PATH npm run test:clipper:mutations`

Expected: `Caught:` for all 14 controls, then exit 0.
- A "Missing exact mutation anchor" means the source drifted from this plan. Fix the anchor to match the code as committed (not the other way round), and confirm the mutant still reproduces the regression named in the control.
- A "Survived" means the law's test is too weak. Strengthen the test, never the control.
- A "Missing semantic checkpoint" means the test fails for a reason other than its law. Fix it until it fails on the law's own message.

- [ ] **Step 5: Docs**

Rewrite the opening and the Privacy and Permissions sections of `extension/README.md` to say what this release does, in plain words:

```markdown
# Blygger Clipper

A Chrome extension that quotes what you read into a draft on your own blyg.
Select text on any page, right-click and choose **Quote in Blygger** (or press
Alt+Shift+Q). The side panel opens with the selection quoted and the page
cited, and you write your own words below it. **Clip this page** cites a page
with no quote.

Your clip and your words are kept on this device as you type, and survive
closing the panel or restarting the browser. Saving the draft to your blyg
arrives in the next release.

## Permissions

- `contextMenus` and `scripting` with `activeTab`: the menu items, and reading
  the page you clip when you clip it. Nothing runs on a page until then.
- `sidePanel`: the panel. `identity`: signing in to your blyg. `storage`: the
  connection, the clip and your words.
- `alarms` is reserved for retrying saves.

No host permissions. The extension reaches your blyg through CORS.

## Privacy

Clipped text, the page's title, address and author, and your words stay on
this device, and are sent only to the blyg you connect: to preview the quote
and, once saving lands, to save it. Nothing else is collected or sent anywhere.
```

Keep the README's Develop section. Add the line `npm run ext:build:e2e   # the e2e build: reaches its test hosts and exposes a test hook` to it.

In `docs/client-access.md`, add this paragraph to the end of the clipper section:

```markdown
Clipping uses no new route. The clipper previews with `POST /api/preview`
(`owner:draft`), and quotes a blyg item as a transclusion only when that
preview resolves the captured origin and id. It subscribes to another blyg
only when the owner presses "Subscribe" (`createSubscription` with
`confirm: true`, `owner:manage`).
```

- [ ] **Step 6: The full suite**

Run, and paste each summary line in the report:

```bash
PATH=/usr/local/bin:$PATH npm run typecheck
PATH=/usr/local/bin:$PATH npm run test:ext
PATH=/usr/local/bin:$PATH npm run test:ui
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run --maxWorkers=2
PATH=/usr/local/bin:$PATH npm run test:e2e
PATH=/usr/local/bin:$PATH npm run test:clipper:mutations
```

Expected:
- Everything passes.
- The Worker suite has grown by the eight clip-composition tests. The extension units have grown from 17 to about 60.
- The e2e count has grown by nine.

- [ ] **Step 7: Commit**

```bash
git add scripts/mutation-engine.ts scripts/verify-auth-security-mutations.ts scripts/verify-clipper-mutations.ts package.json .github/workflows/check.yml extension/README.md docs/client-access.md
git commit -m "Clipper mutation controls for capture, the draft and the panel; docs and CI"
```

---

## Plan 3c carries forward

- A Save draft or Publish must flush the `EditQueue` (`flush()`) and freeze exactly the revision it resolves with.
- `DraftDeps.known` must also report a capture's uuid while it sits in a save operation or recent clips.
- From Plan 3a's ledger:
  - discovery edge-case tests and the RFC 8414 issuer equality check;
  - JSON-null OAuth bodies;
  - `Cache-Control: no-store` on raw OAuth responses (a separate server fix);
  - a POST probe of `/consent` CORS;
  - a hint that the runner's `.wxt` copy needs `ext:prepare`;
  - a guard on `serve` for a handler that throws synchronously;
  - `remember()` throwing after `saveOAuth`;
  - fixing `sdk/README` where it still calls OAuth "planned".
- The narrower worker-only fault (CDP `ServiceWorker.stopWorker`) for the lifecycle campaign.
- The panel's own SDK requests (preview, subscribe) have no 20 s timeout yet (spec §5.5); the worker's do.

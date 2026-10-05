# Blygger Clipper — Chrome extension design

Status: design approved in conversation, 2026-10-05. Awaiting spec review.
Branch: `chrome-clipper`, from `codex/oauth-mcp` (PR #34), which it depends on.

## 1. Purpose

A Chrome extension for any blyg owner, published on the Chrome Web Store.
The owner highlights text on any page, right-clicks, and a side panel opens
with the selection quoted and the source cited. The owner adds their own
words and saves a draft or publishes to their own blyg. It is the first
third-party client of the OAuth flow in PR #34, so it also proves that flow
works for clients the server has never seen.

Success means:

- Clipping to a draft takes one right-click and one button.
- A clip is never lost: not on panel close, browser restart, network loss or
  grant expiry.
- It works against any conforming Blygger Studio node, discovered from the
  blyg URL alone, with no host permissions.
- Hostile pages cannot inject markup into the panel or the saved item.

### Decisions made in conversation

| Question | Decision |
|---|---|
| Audience | Any blyg owner, via the Chrome Web Store |
| Main action | Save draft is the default; Publish beside it; "Open in Studio" after |
| Compose surface | Chrome side panel |
| v1 scope | Rich quote + text-fragment link; shortcut + multiple clips; blyg-aware transclusion; recent clips + retry queue |
| Code layout | WXT + React in `extension/` in this repo, reusing Studio code and the SDK |
| Scopes | Request all of `owner:read owner:draft owner:publish owner:manage offline_access` up front; adapt to what consent grants |
| Manual token | "Advanced: use a token" on the connect screen (useful beyond tests) |
| New test files | Approved: unit tests under `extension/`, `test/clipper-oauth.test.ts`, `e2e/clipper.spec.ts` |
| Retry safety | Server `Idempotency-Key` on create and publish (§9); no automatic retry after dispatch against a node that does not advertise it, past the key's deadline, or under a new grant |

### Out of scope for v1

- More than one connected blyg (storage is keyed by origin so this needs no
  migration later).
- Firefox and Safari builds.
- Image clipping, full-page article capture, highlights that persist on the
  page, tags.
- Any server change beyond the shared-UI refactor, the `Idempotency-Key`
  support in §9, and stale doc fixes.

## 2. Architecture

Three extension parts, each with one job:

| Part | Job | Talks to |
|---|---|---|
| Background service worker | Context menu, shortcut, OAuth + token store, single-flight refresh, retry queue, panel handoff | `chrome.*` APIs, the blyg's OAuth and API endpoints |
| Capture script | Read the selection and page; return a capture record | Injected on demand into the clicked frame; returns a value, holds nothing |
| Side panel (React) | Connect, compose, save, recent clips, queue | The worker by message; the blyg API through the SDK with tokens from the worker |

The capture script is injected with `scripting.executeScript` under
`activeTab`. There is no standing content script.

### 2.1 Reuse from the Studio

Three targeted refactors in `src/ui/`. Studio behaviour is unchanged; its
existing unit, UI-state and e2e suites are the check.

1. **`data.ts` becomes `createStudioData(client)`.** Every collection is built
   around the SDK client it is given. The Studio keeps its current exports by
   calling it with its cookie client. The extension passes a bearer client
   whose `auth` callback asks the worker for a token.
2. **`mount` and `basepath` leave `components.tsx`** for a small host module
   each app sets: the Studio from its root element, the extension from the
   connected blyg. Links such as "Open in Studio" then point at the user's
   blyg.
3. **A shared composer core comes out of `authoring.tsx`:** the textarea with
   its insert helpers, the Markdown preview via `POST /api/preview`, and image
   paste. Studio `Compose` and the extension panel both use it.

Reused unchanged: `sheets.tsx`, `theme.ts`, `Button`/`Html`/`Failure`,
`polling.ts`, `scoped.ts`, the CSS tokens. The SDK is imported from the
workspace, so contract drift fails CI in the same PR.

## 3. Connecting and OAuth

Verified against the server on `codex/oauth-mcp`:

- A request to `/api` without `Authorization` gets no CORS header; one with
  any `Authorization: Bearer …` gets `Access-Control-Allow-Origin: *` and an
  exposed `WWW-Authenticate` (`src/index.ts:59-68`).
- OAuth metadata, registration and token routes send CORS `*`
  (`src/oauth-routes.ts:16-37`).
- Registration is unauthenticated, accepts public clients
  (`token_endpoint_auth_method: "none"`) and `https://<id>.chromiumapp.org/`
  redirects under `application_type: web`; PKCE is S256-only.

### 3.1 Discovery (RFC 9728 → RFC 8414)

1. The owner types their blyg URL, for example `venkateshrao.com/blyg/`.
   Normalize to `https`, with a trailing slash.
2. `GET {origin}/api/settings` with `Authorization: Bearer discovery` → 401
   with `WWW-Authenticate: … resource_metadata="…/studio/auth/resources/api"`.
3. Fetch the resource metadata → `authorization_servers[0]` (the issuer).
4. Fetch `{issuer}/.well-known/oauth-authorization-server` → authorize,
   token, registration and revocation endpoints.

Nothing is host-rooted and nothing reads `blyg.json` (invariant 2). Each step
that fails names the step in the connect screen's error.

### 3.2 Registration

`POST {registration_endpoint}`:

```json
{
  "client_name": "Blygger Clipper",
  "redirect_uris": ["https://<extension-id>.chromiumapp.org/"],
  "token_endpoint_auth_method": "none",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"]
}
```

The extension ID is pinned with the manifest `key`, so development and store
builds share one redirect URI. `client_id` is stored per blyg origin. The
server reclaims unapproved clients after its grace period; on
`invalid_client` the extension registers again, once.

### 3.3 Authorization

`chrome.identity.launchWebAuthFlow({ interactive: true })` with
`response_type=code`, PKCE S256 (verifier 64 random URL-safe characters),
`state`, `resource={origin}/api`, and scope
`owner:read owner:draft owner:publish owner:manage offline_access`.

If the owner is not signed in, the Studio login appears inside that window.
The consent page lets the owner untick scopes. The extension reads the granted
`scope` from the token response and adapts:

| Missing scope | Effect |
|---|---|
| `owner:publish` | Publish button hidden |
| `owner:manage` | No subscribe offer; unsubscribed blygs fall back to URL quotes |
| `owner:read` | No recent-clip status, no duplicate check in the queue, no subscription lookup |
| `owner:draft` | Cannot clip; connect screen explains and offers Reconnect |

### 3.4 Tokens

Only the service worker reads or writes tokens. Refresh tokens rotate and a
replay revokes the whole grant, so two contexts refreshing at once would lock
the owner out.

- Access token (1 hour) in `chrome.storage.session`; refresh token, client id
  and endpoints in `chrome.storage.local`.
- The panel asks the worker for an access token by message. The worker
  refreshes when the token is within 60 seconds of expiry, with one
  in-flight refresh shared by all callers.
- The worker can be terminated at any moment (Chrome stops idle workers).
  Refresh state lives in storage, never only in memory: a refresh marks
  itself in flight, writes the new refresh token before it releases waiting
  callers, then clears the mark. If the worker dies after the server rotated
  the token but before the new one was stored, the stored token is spent, and
  this server treats reuse as replay and revokes the grant
  (`src/oauth-routes.ts:162`). A worker that wakes to find the mark set tries
  the stored token once: if the earlier request never reached the server it
  succeeds; if it did, the grant was already unusable to us and its
  revocation is the clean outcome. On failure it shows Reconnect, and queued
  clips wait. The queue and inbox are likewise read from storage on every wake.
- Grants end 30 days after the owner's Studio session began. When refresh
  fails with `invalid_grant`, the panel shows Reconnect; queued clips wait.

### 3.5 Manual token

"Advanced: use a token" accepts a token the owner mints in Studio → Client
access. The extension reads the granted scope from the token's JWT payload (for
choosing a probe and for display; the server enforces) and verifies the token
with a request that scope allows and that changes nothing:

- with `owner:read`: `GET /api/settings`;
- else with `owner:draft`: `POST /api/preview` with `{ kind: "thread", content_md: "" }`;
- else: refuse, saying the token cannot clip (it needs `owner:draft`).

A 401 means the token is invalid or expired. A 403 on the chosen probe means
the payload's scope claim is wrong; the extension trusts the server and
refuses. No refresh: when it expires, the panel asks for a
new one. Playwright uses this path, since it cannot drive Chrome's OAuth
window.

### 3.6 Disconnect

Calls the revocation endpoint with the refresh token, then clears local
state. The grant also appears in Studio → Client access for revocation there.

## 4. Capture and compose

### 4.1 Triggers

- Context menu on `selection`: "Quote in Blygger: "%s"".
- Context menu on `page`: "Clip this page", which makes a link post with no
  quote.
- Command `clip-selection`, default `Alt+Shift+Q`, remappable at
  `chrome://extensions/shortcuts`.

On a trigger the worker calls `sidePanel.open({ tabId })` before any `await`
(the call needs the user gesture), then injects the capture script into
`info.frameId`.

**Capture inbox.** Captures are durable before anything else sees them:

1. The worker validates the record (§6), gives it a UUID and a capture time,
   and appends it to an **inbox** in `storage.local`. Rapid captures queue in
   order; none overwrites another.
2. Only after that write resolves does the worker notify the panel.
3. The worker, which owns the draft (§4.6), moves each entry into the draft
   and records the capture's UUID in the draft. The draft write and the inbox
   deletion are one `storage.local.set` call, so they land together.
4. On every wake the worker drains the inbox in order. An entry whose UUID is
   already in the draft, in a save operation or in recent clips is deleted
   without being appended again, so recovery never duplicates a quote. A
   capture survives a panel that never opened, closed at once, or a browser
   restart.

If the worker is terminated between steps, the inbox write either happened or
did not: a capture is never half-delivered. A capture lost before step 1 is
one the owner sees fail (the panel shows "Clip failed, try again").

### 4.2 Capture record

```ts
interface Capture {
  url: string;            // tab URL
  canonical: string;      // <link rel=canonical> or og:url, else url without fragment
  title: string;          // og:title, else <title>
  siteName?: string;      // og:site_name, else host
  author?: string;        // JSON-LD author, meta[name=author], article:author
  published?: string;     // JSON-LD datePublished, article:published_time
  favicon?: string;       // absolute URL, displayed only as an <img src> after http(s) check
  quote?: {
    markdown: string;     // selection HTML → Markdown (Turndown)
    text: string;         // normalized plain text
    selector: { exact: string; prefix?: string; suffix?: string }; // ~32 chars each side
    fragmentUrl: string;  // canonical + #:~:text=prefix-,exact,-suffix
  };
  blyg?: { origin: string; id: string; version: number; kind: "fragment" | "thread" };
  degraded?: boolean;     // injection blocked; only selectionText + tab url/title
}
```

Markdown conversion keeps links (made absolute), emphasis, code, lists and
blockquotes. It drops images (keeping alt text), scripts, styles, iframes and
forms, and any link whose scheme is not http, https or mailto.

Blyg detection: if the page has `<link rel="alternate" type="application/json">`
and that document (fetched same-origin by the capture script) has a string
`id`, an integer `version` and `kind` of fragment or thread, record it, with
`origin` taken from the document's own origin.

When injection is blocked (Chrome's PDF viewer, `chrome://` pages, the Web
Store), the record uses `info.selectionText` (line breaks flattened), the
tab's URL and title, and `degraded: true`. The panel says so.

### 4.3 URL quote

The panel shows a source card (favicon, title, site, author, date). Source and
author are editable, since they become the citation. The body is the shared
composer core, prefilled with the quote as a `>` block, with the cursor below
it.

Saved as a thread:

```ts
{
  kind: "thread",
  content_md,
  stub_of: {
    url: capture.canonical,
    cited: {
      source: siteName,
      author,
      excerpt,                 // first 200 characters of quote.text
      url: quote.fragmentUrl,  // http(s), as the server requires
      retrieved: capturedAt,   // ISO time of the clip
    },
  },
}
```

The Studio renders `stub_of` as the "In response to" citation, so the body
carries no attribution line.

**Page-only clip** ("Clip this page", no selection): `quote` is absent. The
body starts empty and may be saved empty. The item is the same thread with
`stub_of: { url: canonical, cited: { source, author?, url: canonical,
retrieved } }`. There is no `excerpt`, and `cited.url` is the canonical URL,
not a fragment link.

### 4.4 Blyg-aware transclusion

When the capture has `blyg`, the body is `![[id]]` followed directly by the
quote as an attached blockquote (the partial grammar), with
`stub_of: { origin, id, version }`. At clip time the panel calls
`POST /api/preview` with that body:

- **No errors, and the right item:** preview's `transclusions[0]` must name
  the captured item. If the captured origin is the connected blyg, expect a
  local entry (no `origin`) with the captured `id`. Otherwise expect `origin`
  equal to the captured origin and the captured `id`. The resolver matches on
  `id` alone and prefers local items (`src/transclusion.ts:206`), so anything
  else falls back to a URL quote and says why.
- **Versions:** the bake uses the snapshot we hold, which may be older or
  newer than the page the owner is reading. A different version is accepted
  when the selection validates against the held snapshot. The panel says
  "quoting v{held}; this page shows v{captured}", and `stub_of.version` is the
  held version, the one actually quoted.
- **Unknown target, and the blyg is not subscribed:** if `owner:manage` was
  granted, offer "Subscribe to {site} to quote it as a transclusion". This is
  an explicit button, since subscribing changes the owner's reading list. After
  `createSubscription`, poll preview every 3 seconds for up to 60 seconds,
  then switch modes. Otherwise, or if the owner declines, fall back to a URL
  quote.
- **Selection does not match the stored snapshot** (the author has edited
  since): fall back to a URL quote and say why.

### 4.5 Multiple clips

While the panel holds an unsaved draft, a new clip appends a quote block
instead of replacing it:

- Same page: the quote joins the body.
- Different page: the quote gets an inline `— [title](fragmentUrl)` line,
  because `stub_of` names one source, the first.

### 4.6 Local draft

**The worker is the single authority for the draft.** The draft (capture
UUIDs and records, body, mode, citation edits) lives in `storage.local` with
a revision number. Panels never write it; they send mutations to the worker
(`appendCapture`, `setBody { baseRevision, text }`, `editCitation`), which
applies them one at a time and persists them.

- **One sequencer for the body.** While a panel holds the editing lease
  (below), every change to the body goes through that panel, including
  captures: the worker hands a new capture to the lease holder, which inserts
  its quote into the text itself. Only when no panel holds the lease does the
  worker append a capture to the stored body directly. So the worker never
  changes body text underneath a panel that is typing.
- **Edit queue.** The panel keeps at most one `setBody` in flight. Input that
  arrives meanwhile updates a single pending value, the latest full text. When
  the in-flight call is acknowledged with revision N+1, the panel sends the
  pending text with `baseRevision: N+1`. Normal typing therefore never sends a
  stale base. A refusal (lease lost to another window) stops sending and keeps
  the panel's unsent text on screen, marked unsent. "Edit here" takes the
  lease back and **reloads the current draft**; it never resends the unsent
  text as a replacement, because the other window may have saved edits or
  captures since. If the unsent text differs from the reloaded draft, the
  panel shows it beside the draft as a conflict, with "Copy" and "Append to
  draft". Appending goes through the edit queue like any input.
- **Durability boundary:** a mutation is durable when the worker's
  `storage.local.set` has resolved and it has replied with the new revision.
  The panel queues `setBody` on every input event, with no timer, and shows
  "saved locally" only when nothing is pending. Closing the panel before a reply can
  lose the input sent after the last reply, and never anything before it. The
  draft is never torn or rolled back past an acknowledged revision.
- **Several panels** (one per window): one panel instance holds the editing
  lease for the draft. Others show it read-only with "Edit here", which takes
  the lease. A `setBody` from a non-holder, or with a stale `baseRevision`, is
  refused, so concurrent windows cannot overwrite each other. The lease is
  released when the holder's port disconnects.

The server draft is created only on Save draft or Publish.

## 5. Saving, recent clips and the queue

### 5.1 Save draft

Pressing Save draft (or Publish) first **flushes the edit queue**: the
button shows "saving…" until the in-flight `setBody` and the pending text are
both acknowledged, giving revision N. The panel then asks the worker to
freeze exactly revision N, and the worker refuses if the draft is no longer at
N. Since only the lease holder changes the body, that refusal means the lease
moved, and the panel follows the lease rules above. So pressing Save straight
after typing submits the text as typed.

Freezing asks the worker to take revision N. In
one storage write, the worker moves the draft's payload into a new **save
operation** and empties the draft slot. The operation holds a UUID, the
payload, the capture UUIDs, the grant id it will be sent under, and its
status. The payload never changes after that. A clip that arrives while the
save is in flight starts a new draft, so a response can never erase newer
work. `POST /api/items` carries `Idempotency-Key: {uuid}:create` (§9).

Each operation moves through persisted phases. Every phase change, including
the created item's id, is written to storage before the next request is sent:

| Phase | Meaning | Next |
|---|---|---|
| `creating` | Create may be in flight | `created` on 201 (id stored) |
| `created` | Item exists; a publish was requested | `publishing` |
| `publishing` | Publish may be in flight | `done` on success |
| `done` | Finished | joins recent clips |
| `needs-reconciliation` | Uncertain past key validity (§5.4) | owner resolves |
| `needs-review` | The item changed in Studio before publish (§5.2) | owner resolves |
| `discarded` | Owner discarded it | removed after display |

A Save-draft operation goes `creating` → `done`. A worker that wakes with an
operation in `created` sends the publish; the operation is never forgotten
between the two requests.

On 201 a Save-draft operation is marked done and joins recent clips, a toast offers
"Open in Studio" (`{blyg}/studio/edit/{id}`), and the panel shows the draft
slot: empty, or the clip that arrived meanwhile. If the request was refused
without being dispatched, or with a 400, 403 or 413 (§5.4), the payload
returns to the draft slot if it is empty, and otherwise becomes a separate
draft in the queue list.

### 5.2 Publish

**Only on nodes that advertise the publish precondition** (§9). Older nodes
refuse the `expected` field, because publish bodies are strict
(`src/contract/routes.ts:47`), and a publish without it could make later
Studio edits public. On those nodes, Publish saves the draft and the toast
says "Saved. Publish it in Studio", linking there; the extension does not
publish.

Where it is advertised: create as above, then `POST /api/items/{id}/publish` with
`Idempotency-Key: {uuid}:publish` and the frozen payload's expected working
copy (§9, "Publish precondition"). If the owner edited the item in Studio
after it was created, the publish refuses with 409 `changed`, nothing is
published, and the operation moves to `needs-review`: the panel says the item
changed since the clip and offers "Open in Studio". The extension never
publishes text the owner did not freeze. The server makes a new version on every
publish call, so a blind retry would publish twice, and could publish edits
made in Studio meanwhile. With the key, a retry replays the first response
instead. If creation succeeds and publish fails, the clip is a saved draft and
only the publish step is queued, with the same key. The toast links to the
public page.

### 5.3 Recent clips

The ids the extension created, up to 50, in `storage.local`. When the panel
opens, their status refreshes through the shared `itemDetail` collection.
Rows show a draft or published badge, the quote's first line, and Open in
Studio, Open public page and Copy link. An item deleted in Studio shows as gone
and is then dropped.

### 5.4 Retry queue

Owned by the service worker (it holds the tokens), stored in `storage.local`,
retried with `chrome.alarms` at 1 minute, backing off to 30 minutes. The
toolbar badge shows the count.

Any failure after a request was dispatched is **uncertain**: the server may
have committed even if no response arrived. Retries are safe only because
they reuse the operation's key.

| Failure | Node supports keys (§9) | Node does not |
|---|---|---|
| Request never dispatched (offline at send) | Queue | Queue |
| Network error, timeout or 5xx after dispatch | Queue; retry with the same key while the key is valid (below) | Do not retry; needs reconciliation |
| 409 "operation in progress" (§9) | Queue; retry after `Retry-After` | n/a |
| 429 | Queue, honouring `Retry-After` | Queue, honouring `Retry-After` |
| 401 after refresh fails | Queue and show Reconnect | Same |
| 400, 403, 413, 422 | Not queued; inline error, payload back to a draft | Same |

Support is read from the resource metadata at connect (§9), never guessed:
sending the header to a node that does not allow it fails CORS preflight.

**A key is valid** only under the grant the operation was first dispatched
with, and until 23 hours after that first dispatch (the server keeps keys 24
hours). Past either boundary (expiry, or Reconnect under a new grant) an
uncertain operation stops retrying and **needs reconciliation**. The panel
shows the owner recent drafts from the blyg (with `owner:read`). The owner
either marks one as this clip, which completes the operation, or chooses
"Save again", which starts a new operation with a new key. An operation that
was never dispatched has no such boundary and is simply sent under the
current grant.

**Queued operations are immutable once dispatched.** From the badge list the
owner can:

- open a never-dispatched operation back into a draft, to edit it;
- retry or reconcile an uncertain one, but not edit it, because a changed
  body under the same key is refused (§9) and a new key could duplicate the
  save;
- discard any operation. Discarding an uncertain one warns that it may
  already be saved.

Once an operation is resolved as saved, further edits happen in Studio.



### 5.5 Errors

Every request times out after 20 seconds. Errors show inline with the shared
`Failure` component and the draft kept. A 403 with
`WWW-Authenticate: … error="insufficient_scope"` names the missing scope and
offers Reconnect. Nothing is dropped silently.

## 6. Security

The extension creates a new path from hostile page content to the owner's
drafts. Rules:

- The panel never renders page HTML. It shows only text the capture script
  extracted, rendered as text, or the server's sanitized `POST /api/preview`
  HTML.
- The capture record is data. The worker validates its shape and types
  before storing it, and caps sizes (quote 50 KB, other fields 2 KB).
- Every URL taken from the page (canonical, fragment link, favicon, links in
  the quote) must parse as absolute http(s) (mailto allowed in quote links)
  or is dropped. The server checks `cited.url` and renders through
  `escapeHref` as a second layer.
- Tokens never reach the capture script or the page, and are never logged.
- No remote code; Content Security Policy is the MV3 default.

## 7. Oracles and tests

Tests follow the repo's oracle contract (`docs/oracle-tests.md`, ORC-001 to
ORC-014): each oracle leads with a sourced law, judges with an independent
model rather than production helpers, drives production code paths, and
proves its sensitivity with mutation controls. These rules come from this
branch's security rounds:

- A mutation control's baseline must run at least one test, and its
  checkpoint is the law's own assertion message.
- A law about absence ("no active markup") gets a contrast case showing that
  safe input survives unchanged.
- Fixtures hold only states production can produce, in the formats
  production stores. Storage fakes serialize like `chrome.storage` (JSON
  values only, so `Date` becomes text); server truth comes from the real
  Worker, never a stub.
- Laws about hostile input are inventory sweeps over every input field, not
  lists of known sinks.

### 7.1 Laws

| Law | Statement | Source |
|---|---|---|
| L1 Capture durability | Every capture the worker accepted is, after any sequence of panel closes, worker terminations and browser restarts, in exactly one place: the inbox, the draft, a save operation (in any phase), a saved item, or explicitly discarded by the owner | §1 success criteria; [Chrome worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) |
| L2a At most once | Under any fault schedule, a save operation yields at most one item and a publish operation at most one new version | §5, §9; [IETF Idempotency-Key header](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) |
| L2b Eventual completion | If a valid request can complete before its key expires on a node that advertises keys, the operation reaches `done`; otherwise it ends in `needs-reconciliation`, `needs-review` or `discarded`, never silently | §5.4 |
| L2c Frozen publish | A publish makes public exactly the frozen payload, or nothing | §5.2, §9 |
| L3 No unsafe retry | No request is re-sent after dispatch unless the node advertises keys, the grant is unchanged and the key is within its deadline | §5.4 |
| L1b No lost or duplicated work | A save response never removes a capture or edit made after the frozen revision; recovery never appends a capture twice | §4.1, §5.1 |
| L4 Refresh safety | At most one refresh is in flight; a stored refresh token is reused only by the single post-restart attempt in §3.4 | [RFC 9700 §4.14](https://www.rfc-editor.org/rfc/rfc9700#section-4.14); `src/oauth-routes.ts:162` |
| L5 Scope fit | The panel offers only actions the granted scope allows, and every request it sends is one that scope permits | §3.3; decision #52 invariant 3 |
| L6 Inert page content | No page-sourced value activates markup in the panel DOM, the saved item or any public page; safe formatting and links survive | §6; OWASP XSS prevention |
| L7 Citation fidelity | Saved `stub_of` matches the capture, validates against the contract's Zod schemas, and its fragment link selects the quoted text | §4.3; [WICG text fragments](https://wicg.github.io/scroll-to-text-fragment/) |
| L8 Transclusion identity | Transclusion mode is used only when preview resolves the captured origin and id; otherwise a URL quote | §4.4; decision #26 |
| L9 Discovery | Connection uses only the RFC 9728 → RFC 8414 chain under the mount; nothing host-rooted | §3.1; invariant 2 |

### 7.2 Models and campaigns

- **Clip lifecycle model** (ORC-008: only state that can matter): inbox
  entries, draft revision and lease holder, save operations (`pending`,
  `dispatched`, `done`, `uncertain`, `needs-reconciliation`) with their grant
  and key deadline, and the expected server items. The commands are capture,
  edit, close panel, open panel, kill worker, restart browser, save, publish,
  fault before dispatch, fault after commit, advance clock, reconnect, and
  respond. L1–L3 are checked after every command.
- **Token model:** stored token generation, in-flight mark, waiting callers.
  The commands are request token, kill worker, server rotates, response lost.
  L4 is checked after every command.
- **Campaigns** (ORC-007): a fixed lane with one named history per row of the
  §5.4 table, and per §3.4 restart case; and a random lane (fast-check) with
  printed seed and shrink path, replayable from those values alone. The
  fixed lane names these histories in particular:
  - commit, then the response is lost, then retry (replays, no second item);
  - crash after the work batch commits, before the response is sent;
  - a reclaimed key while the older attempt is still running (the older one
    commits nothing);
  - retry 24 hours after the first dispatch (stops; needs reconciliation);
  - Reconnect under a new grant with an uncertain operation queued (stops;
    needs reconciliation; a never-dispatched one is sent);
  - worker terminated between the draft write and the inbox deletion (one
    storage call, so neither or both), and recovery draining an inbox entry
    whose UUID is already in the draft or a save operation (no duplicate);
  - an edit or a new clip arriving while a save is in flight (kept);
  - two panels editing (the non-holder is refused; nothing lost);
  - panel closed after a keystroke's acknowledgement (kept) and before it
    (at most the unacknowledged input lost, never earlier text);
  - a node that does not advertise keys (header never sent; preflight passes);
  - worker restart after the create's 201, before the publish is sent
    (publishes on wake);
  - create succeeds, publish fails before commit, the owner edits in Studio,
    then the queued publish runs (409 `changed`, nothing published,
    `needs-review`);
  - attempt A running, reclaimed by B, B fails and deletes its claim, C
    claims fresh, then A tries to commit (A's token matches nothing);
  - fast typing: several inputs before the first acknowledgement (none
    refused, final text kept);
  - a capture arriving while the owner types (quote and typed text both
    kept);
  - several keystrokes then Save before the first acknowledgement (the
    frozen payload holds the last keystroke);
  - lease to window B, B makes an acknowledged edit, lease back to A (A
    reloads B's text; A's unsent text appears as a conflict, never replaces);
  - a node without the publish precondition (Publish saves a draft and points
    to Studio; no publish request is sent).
- **Fault driver** (control the event, not the Promise): a transport that
  forwards to the real Worker and then, on schedule, drops the response after
  the server committed. "Commit then drop" is the case the reviewer found a
  body-search could not resolve.

### 7.3 Harnesses

- **Unit (vitest, `extension/`):** worker modules with storage fakes that
  serialize like Chrome, against the real Worker in the Workers pool for
  every law about server state (L2, L3, L5, L7, L8). Also covers Markdown
  conversion, metadata extraction from saved real-page fixtures, selector and
  fragment-link building, blyg detection and discovery.
- **Integration (`test/clipper-oauth.test.ts`):** the real OAuth flow (L9,
  L4): discovery through the 401 header, registration with a chromiumapp.org
  redirect, PKCE, consent with unticked scopes, token exchange, refresh
  rotation, and replay revocation after a simulated lost rotation.
- **Server idempotency (in the same file):** replay returns the same status,
  body and `Location` with `Idempotent-Replayed: true`; same key with a
  different body gives 422; a duplicate held at the commit point gives 409
  (controlled premise, ORC-014); keys are isolated per principal; expiry
  after 24 hours.
- **Browser (`e2e/clipper.spec.ts`, Playwright with the unpacked extension):**
  real Chrome lifecycle for L1: close the panel immediately after a capture
  and after a keystroke, stop the worker via CDP `ServiceWorker.stopWorker`,
  restart the browser context, and fire rapid repeated captures. Also: a
  page-only clip saved without typing, a manual draft-only token connection,
  and the hostile page sweep (L6).
- **L6 inventory sweep:** every `Capture` field set to each hostile payload
  from the server sweeps (attribute breakouts, `javascript:` and `data:`
  URLs, script and SVG tags, entity-encoded schemes), checked in the panel
  DOM, the saved item and every public page. Contrast: a fixture with
  emphasis, code and an https link keeps them exactly.
- **Contrast cases** for the other laws: the right transclusion is accepted
  (L8); a valid draft-only token connects (L5); two clips with identical text
  and different citations both save as separate items (L2).

### 7.4 Mutation controls

`scripts/verify-clipper-mutations.ts` follows the auth runner's rules
(baseline ran tests, exact anchor, semantic checkpoint, restore after each).
Each control reproduces a realistic regression:

| Control | Must be caught by |
|---|---|
| Inbox entry deleted before the draft write lands | L1 |
| Recovery appends without checking existing UUIDs | L1b |
| Save clears the draft slot instead of freezing a revision | L1b |
| Non-holder or stale-base `setBody` accepted | L1b |
| "Saved locally" shown before the storage write resolves | L1 (close after keystroke) |
| Retry after the key deadline or under a new grant | L3 |
| Replay record written outside the work batch | L2a (crash after commit) |
| Attempt guard missing on reclaim | L2a (older attempt commits) |
| Attempt token reused after a delete (counter instead of token) | L2a (reclaim, fail, reinsert) |
| Publish without the working-copy precondition | L2c (Studio edit before queued publish) |
| Phase `created` not persisted before publish | L2b (restart after 201) |
| Panel sends a second `setBody` while one is in flight | L1b (fast typing) |
| Save freezes without flushing the edit queue | L1b (type then Save) |
| "Edit here" resends unsent text as a replacement | L1b (lease round trip) |
| `expected` sent to a node that does not advertise it | L2c, L5 (older node) |
| Worker appends a capture to the body while a panel holds the lease | L1b (capture during typing) |
| CORS allowlist lacks `Idempotency-Key` | L2a (browser preflight) |
| Create or publish sent without `Idempotency-Key` | L2a |
| Server ignores the key, or keys are not per principal | L2a, idempotency tests |
| Uncertain failure retried against a node that does not advertise keys | L3 |
| Refresh without single-flight; refresh mark not stored | L4 |
| Publish button shown without `owner:publish` | L5 |
| Page title or quote rendered as HTML in the panel | L6 |
| Favicon or link scheme not checked | L6 |
| Excerpt not capped, or fragment link built from unescaped text | L7 |
| Preview identity check skipped | L8 |
| Discovery falls back to host-root `/.well-known` | L9 |

CI runs the extension unit tests, the integration file and the browser spec
in the existing `check` job, and the mutation runner beside the existing
ones.

## 8. Packaging and docs

- Manifest permissions: `contextMenus`, `sidePanel`, `activeTab`, `scripting`,
  `identity`, `storage`, `alarms`. No `host_permissions`.
  `minimum_chrome_version: "116"`.
- Scripts: `npm run ext:dev`, `ext:build`, `ext:zip`.
- The extension has its own version, independent of `CLIENT.version`.
- Docs: `extension/README.md`; a privacy disclosure (page text and metadata go
  only to the owner's own blyg; nothing else is collected); a clipper section
  in `docs/client-access.md`; fixes to `docs/api.md:7` and the SDK README,
  which still call OAuth and cross-origin clients planned.
- Web Store: the developer account and listing are the owner's to set up; the
  repo carries the listing copy, screenshots and icon.

## 9. Server change: `Idempotency-Key`

A change to this client's own `/api` contract (decision #31 lists
idempotency in its direction), not to the protocol. Shape follows the IETF
`Idempotency-Key` header draft.

- **Where:** `POST /api/items` and `POST /api/items/{id}/publish`. Other
  routes ignore the header for now.
- **Key:** the header value, 1–255 printable ASCII characters. Scoped per
  principal: the grant id for a bearer token, `owner` for the cookie. One
  token cannot read another's replays.
- **Fingerprint:** SHA-256 of method, path and canonical JSON body.
- **Claim before work:** an atomic insert of `(principal, key, fingerprint,
  'pending')`.
  - Existing row, same fingerprint, completed: replay the stored status, body
    and `Location`, with `Idempotent-Replayed: true`.
  - Existing row, same fingerprint, pending: 409 with `Retry-After: 1`.
  - Existing row, different fingerprint: 422.
- **Atomic completion:** the work and its replay record commit in one D1
  batch, for both operations. `publish()` already writes in one batch, and
  the replay write joins it. Create changes from its standalone `INSERT` to a
  batch. A crash before the batch commits leaves nothing done; a crash after
  it leaves the replay ready.
- **Attempt token:** every claim, first or reclaimed, writes a fresh random
  `attempt` token (a UUID), never a counter, so a token is never reused even
  after a row is deleted and claimed again. Every write in the work batch is
  guarded by `EXISTS (… WHERE principal=? AND key=? AND attempt=? AND
  state='pending')`, and the replay write sets `state='done'` under the same
  guard. A pending row older than 60 seconds may be reclaimed with a new
  token. An older attempt that is still running then commits nothing: it sees
  zero changes and answers with the winner's replay, or 409 if the winner is
  still running.
- **Failure:** a 4xx, or an exception before the batch, deletes the pending
  row if its token still matches, so a retry runs again.
- **Publish precondition:** `POST /api/items/{id}/publish` accepts
  `expected: { content_md, stub_of }`. When present, the handler compares it
  with the item's working copy and the publish batch is guarded by the same
  values (`… WHERE id=? AND content_md=? AND stub_of IS ?`), so a concurrent
  edit cannot slip between check and commit. A mismatch answers 409
  `{ error: "changed" }` and publishes nothing. Without `expected`, publish
  behaves as today, so the Studio is unaffected.
- **Echo:** every keyed response echoes `Idempotency-Key`.
- **Advertised support:** the protected resource metadata at
  `{base}/auth/resources/api` gains two extension members (RFC 9728 allows
  them): `"idempotency_key_operations": ["createItem", "publishItem"]` and
  `"publish_preconditions": ["expected"]`. Clients send the header and the
  `expected` field only to nodes that list them. Both ship in the same
  release, but clients check each separately.
- **CORS:** `/api` preflight allows `Idempotency-Key` beside `Authorization`
  and `Content-Type`, and responses expose `Idempotency-Key`,
  `Idempotent-Replayed` and `Retry-After` beside `WWW-Authenticate` and
  `Location`. Older nodes keep the old lists and don't advertise support, so
  clients never send them the header.
- **Retention:** 24 hours; expired rows are deleted on write.
- **Storage:** migration `0023_idempotency_keys.sql` (after this branch's
  0021 and 0022).
- **Contract:** the header and the 409/422 responses go into `src/contract/`,
  so `openapi.json` and the SDK carry them.

## 10. Open questions

None blocking. Two to watch during implementation:

- `chrome.identity.launchWebAuthFlow` cookie behaviour: if its window does not
  share the profile's cookies, the owner signs in to Studio inside it each
  time a grant is created. That is acceptable, but the connect screen should
  say so.
- Turndown in an injected script adds roughly 30 KB to each injection; if
  that proves slow on large selections, convert in the panel from sanitized
  HTML instead.

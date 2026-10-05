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

### Out of scope for v1

- More than one connected blyg (storage is keyed by origin so this needs no
  migration later).
- Firefox and Safari builds.
- Image clipping, full-page article capture, highlights that persist on the
  page, tags.
- Any server change beyond the shared-UI refactor and stale doc fixes.

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
- Grants end 30 days after the owner's Studio session began. When refresh
  fails with `invalid_grant`, the panel shows Reconnect; queued clips wait.

### 3.5 Manual token

"Advanced: use a token" accepts a token the owner mints in Studio → Client
access. The extension verifies it with `GET /api/settings` and reads its granted
scope from the token's JWT payload, for display only (the server enforces). No refresh: when it expires, the panel asks for a
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
`info.frameId` and writes the capture record to `storage.session` under the
tab id. The panel listens for that key.

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

### 4.4 Blyg-aware transclusion

When the capture has `blyg`, the body is `![[id]]` followed directly by the
quote as an attached blockquote (the partial grammar), with
`stub_of: { origin, id, version }`. At clip time the panel calls
`POST /api/preview` with that body:

- **No errors:** compose continues in transclusion mode.
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

The panel writes its draft (capture, body, mode) to `storage.local` on every
change, debounced 500 ms. Closing the panel or the browser keeps it. The
server draft is created only on Save draft or Publish.

## 5. Saving, recent clips and the queue

### 5.1 Save draft

`POST /api/items` with the body from §4. On 201 the local draft is cleared, a
toast offers "Open in Studio" (`{blyg}/studio/edit/{id}`), and the panel
returns to its home view: a "Clip something" hint and the recent clips list.

### 5.2 Publish

Create, then `POST /api/items/{id}/publish`. If creation succeeds and publish
fails, the clip is a saved draft and only the publish step is queued (a
repeat publish of the same item changes nothing). The toast links to the
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

| Failure | Action |
|---|---|
| Network error before any response | Queue |
| 429 | Queue, honouring `Retry-After` |
| 401 after refresh fails | Queue and show Reconnect |
| Timeout after sending, or 5xx | Before retrying, search `GET /api/items` for the same body created after the clip; if found, mark done. Without `owner:read`, stop and ask the owner to retry. |
| 400, 403, 413 | Not queued; inline error, draft kept |

Queued clips can be opened, edited or discarded from the badge list.

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

## 7. Testing

- **Unit (vitest, `extension/`):** Markdown conversion, metadata extraction
  from fixture HTML, selector and fragment-link building, blyg detection,
  discovery client against recorded responses, single-flight refresh (two
  concurrent requests make one refresh call), queue classification for every
  status in §5.4, and body builders checked against the Zod schemas in
  `src/contract/`.
- **Integration (`test/clipper-oauth.test.ts`, Workers pool):** the real flow
  against the Worker, reusing `test/oauth-flow-driver.ts`: discovery through
  the 401 header, registration with a chromiumapp.org redirect, PKCE,
  consent with unticked scopes, token exchange, create, publish and refresh
  rotation.
- **Browser (`e2e/clipper.spec.ts`, Playwright):** load the unpacked
  extension in Chromium, connect with a minted token (§3.5), select text on a
  fixture page, run the command, drive the panel page, and check the saved
  item through the API. Includes a hostile fixture page (script-laden
  selection, `javascript:` links, hostile title, author and meta) that must
  leave the panel DOM and the saved item inert.
- CI: the existing `check` job builds and tests the extension.

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

## 9. Open questions

None blocking. Two to watch during implementation:

- `chrome.identity.launchWebAuthFlow` cookie behaviour: if its window does not
  share the profile's cookies, the owner signs in to Studio inside it each
  time a grant is created. That is acceptable, but the connect screen should
  say so.
- Turndown in an injected script adds roughly 30 KB to each injection; if
  that proves slow on large selections, convert in the panel from sanitized
  HTML instead.

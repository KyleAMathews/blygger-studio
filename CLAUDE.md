# Blygger Studio — Project Instructions

> **Environment rules, keys & safety policies:** see [`Code/CLAUDE.md`](../../CLAUDE.md), `warnings.md`, `warnings-node.md`, `warnings-keys.md`, `security-policy.md` at the `Code/` level. Read before starting work.
> **The protocol lives elsewhere:** [`../blygger-spec/`](../blygger-spec/). This repo is **one implementation**, not where protocol decisions get made.

Blygger Studio is the reference client for the Blygger protocol — a Cloudflare Worker
that publishes a blyg, subscribes to others, and threads, transcludes and responds
across them. Public repo: `blygger/blygger-studio` (branch `main`).

Split out of `blygger-spec/worker/` at session 26 (2026-09-28) with all 59 commits of
history, when six independent client implementations made a combined spec+implementation
repo untenable. Named `blyg-ref` until then; `CLIENT` in `src/types.ts` is the one place
the name and version live.

## Where the process lives

**This repo has no session ritual and no devlog of its own.** Both stay in
`blygger-spec`, which remains the program's log across all four repos:

| Thing | Where |
|---|---|
| Session-start ritual, session numbering, carry-overs | [`../blygger-spec/CLAUDE.md`](../blygger-spec/CLAUDE.md) |
| `DEVLOG.md` — one log for the whole program | [`../blygger-spec/DEVLOG.md`](../blygger-spec/DEVLOG.md) |
| Locked protocol decisions (#1–#29) | `../blygger-spec/CLAUDE.md` |
| Model routing (⚠️ FABLE gates) | `../blygger-spec/CLAUDE.md` |
| Four-track program roadmap | [`../blygger-spec/docs/roadmap-tracks.md`](../blygger-spec/docs/roadmap-tracks.md) — this repo is **Track 2** |
| Plan docs (`v0.3-plan.md` etc.) | `../blygger-spec/docs/` |

**Model routing applies here too.** This repo implements semantics; it does not set
them. If a task touches protocol semantics, cross-client invariants, security/crypto or
API-surface design, it is ⚠️ FABLE — stop and say so rather than improvising. Two live
examples: the `/api` write contract (roadmap-tracks 1.8) and whether a citation's human
half goes on the wire (1.2).

## Stack conventions

- Cloudflare Workers + D1 + R2, TypeScript, wrangler. Node: `/usr/local/bin/node` (see `warnings-node.md`; **no `node_modules/` synced by Dropbox** — follow the policy there).
- **`npm install` needs `--legacy-peer-deps`.** npm 10.9.0's peer resolver crashes on vitest's optional peer graph; the environment, not this repo. A fresh clone hits it, an incremental install does not.
- Server-rendered HTML + vanilla JS on the page; Hono allowed in the worker; no client-side framework.
- **Inline page scripts live inside TS template literals, so escapes are a live hazard**: write `\\n` (not `\n`) inside a `confirm()`/string in `actionScript`/`composerScript`/`FEED_SCRIPT`, or the emitted JS gets a real newline inside a string literal and the whole script fails to parse. Session 19 shipped a studio where every button was dead this way, **with the full suite green** — assertions about HTML pass whether or not the `<script>` in it is valid JavaScript. `test/inline-scripts.test.ts` compiles every inline script via `new Function`; keep new pages covered by it.
- **Page scripts need behaviour tests, not just markup tests.** The same blind spot produced a second session-19 bug: the shared action handler ends in `location.reload()`, correct for every action that leaves the item in place and wrong for `discard`, which deletes it (reloading an editor URL 404s). Assert on what a handler *does* — where it navigates, what it calls — not only that the button rendered.
- Secrets: wrangler secrets only; register every key in `Code/.env.keys` per `warnings-keys.md`. Never commit secrets.

## Identity and versioning

`CLIENT` in `src/types.ts` is the single source of truth for this client's name and
version, and `GENERATOR` derives from it. Both user-agent strings
(`IMPORTER_USER_AGENT`, `MENTION_USER_AGENT`) derive from `GENERATOR` — before session
26 they were hand-written and had drifted to `blyg-ref/0.2` and `blyg-ref/0.3` on a
0.3.0 client.

**Client version ≠ protocol version, always.** `PROTOCOL_VERSION` is what the wire
carries and is governed by decision #18d; `CLIENT.version` is this software's identity
and the wire is indifferent to it. Do not couple them, and do not derive `CLIENT.name`
from `BRAND` — `BRAND` is the protocol's vocabulary, which this client does not own.

Bumping `CLIENT.version` is what blygger.com's directory census reads to decide a node
is behind (roadmap-tracks Track 3.1), so a release that changes behaviour operators
should adopt must bump it.

## Deployment

`npm run deploy:all` drives every deployment in `deploy-targets.json`, each against its
own pinned Cloudflare account, with a tsc+test gate, migration preflight and post-deploy
live verification. Protocol and rationale: `../blygger-spec/docs/deploy-protocol.md`
(built session 17 after incident `2026-09-12-01`, a wrong-account deploy).

**Authenticate with `wrangler login`, not `CLOUDFLARE_API_TOKEN`.** Both registry tokens
are single-account and the personal one has no D1 scope, so the migration preflight
cannot run from either; an env token silently overrides the OAuth session, so **unset it**
before deploying. One OAuth session reaches both accounts.

## `/api` is private and unversioned

30 endpoints across `src/api.ts`, `src/importer/api.ts` and `src/mentions/api.ts`, all
behind one owner cookie (`verifySession`, a 30-day HMAC over a single shared
`OWNER_PASSWORD`). There is exactly one principal and no scopes, tokens, revocation or
audit, and `/api` gets no CORS.

**Third-party authoring tools are already writing to it** — a native macOS studio, a
Drafts action, an Obsidian plugin. Making this a real contract (tokens, scopes,
versioning, idempotency) is ⚠️ FABLE-gated on **two** counts and tracked as
roadmap-tracks 1.8 / 2.9. Do not design it here, and do not quietly harden it in a way
that breaks the tools now depending on it without saying so.

## Status

Live on five nodes as of 2026-09-28, two of them Venkat's
(`venkateshrao.com/blyg/`, `blyg.protocol-institute.org`) and three strangers'
self-hosts. 508 tests, `tsc` clean.

## Backlog — from Venkat's issue list (session 26, 2026-09-28)

Triaged against the code, not the report. **Six items from that list turned out to touch
the wire and are not here** — they are parked in
[`../blygger-spec/docs/v0.3-plan.md`](../blygger-spec/docs/v0.3-plan.md) §8b for the Fable
round: plain `[[id]]` links, TK sources from another blyg, partial quotation, `impyrt`
(externally generated spans), `#`-heading-as-title, and the write-surface question (1.8).
**Two of the five reported "bugs" are not bugs** — see §8b; the client is doing what it
was specified to do in both cases.

### Bugs

- [ ] **Reader view doesn't roll up entries** the way the published surface does. Reading
  feed presentation only; the published surface is the reference for what it should look
  like.
- [ ] **Transclusion picker stops after a few items and has no search.** `studioFragmentSearch`
  + the `![[` palette in `studio.ts` exist but are unpaged. Needs paging and a query box.
  Worth doing early: it is the most-used authoring affordance and the ceiling is silent.

### Feature refinements

- [ ] **Switch fragment → thread in the composer before first publish.** `kind` is a wire
  field, but a pre-publish draft has no wire presence, so this is purely studio state.
- [ ] **Bulk-update stale transcluded snapshots in a stub.** The UI half is here; *learning*
  that a target has a newer version is the "staleness-over-DAG" v0.4 item in
  `roadmap.md` and 1.7 in `roadmap-tracks.md`. Build the UI against whatever those settle,
  and don't invent a freshness probe here.
- [ ] **Show second-degree references within a stubbed item.** Presentation is this client's
  call (§8.4 does not constrain presentation — session 20). **Check the data exists first:**
  we hold a snapshot of the target, not the target's own reference list, so this may need a
  fetch we don't currently make — in which case say so rather than half-rendering it.
- [ ] **Open a reader item in a new tab.** No affordance today.
- [ ] **Offer plain linking in the reader**, alongside stub and fork. The `[anchor](url)`
  half is ordinary markdown and can ship now for both blygs and RSS. The `[[id]]` half is
  blocked on §8b.
- [ ] **Discard button for an unpublished new version.** Note the session-19 trap recorded
  above: the shared action handler ends in `location.reload()`, which is wrong for any
  action that removes the thing being viewed.
- [ ] **Reorder the tabs** — reading first, compose second, subscriptions moved to just
  before settings.

### New features

- [ ] **Reset the owner password in settings.** **Sequence this with roadmap-tracks 1.8,**
  not before it. Auth today is one shared `OWNER_PASSWORD` behind a 30-day HMAC cookie; if
  1.8 brings tokens, a reset flow has to invalidate those too, and a password-only reset
  shipped first would be rebuilt immediately. Security-touching: if the design goes beyond
  "change the secret and invalidate sessions", flag it rather than improvising.
- [ ] **Timezone localization for displayed dates.** The complaint is real — dates render in
  UTC. **The wire must not change:** feed dates stay RFC-822, item documents stay ISO-8601
  UTC, and `toIsoUtc()` keeps normalizing at the parse boundary. A `timezone` setting
  localizes *rendering only*, studio and public pages. Writing local time into a feed would
  reintroduce the session-18 reading-list sort bug on every subscriber.

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
examples, both **ruled session 27 (2026-09-28)**: the `/api` write contract (roadmap-tracks
1.8 → decision #31: the client's own contract, never the protocol's; auth direction fixed)
and whether a citation's human half goes on the wire (1.2 → decision #30: yes, `cited`).
The rulings and their build consequences are in `../blygger-spec/docs/v0.3-plan.md` §8c.

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
versioning, idempotency) **was** ⚠️ FABLE-gated on two counts and is now **unblocked**
(decision #31, session 27): it is this client's contract, not the protocol's. Direction
is fixed — per-client bearer tokens with coarse verb scopes, owner-minted and revoked in
the studio, the owner password as root credential that no tool ever holds, revoke-all,
CORS for token-bearing requests, endpoint discovery via an HTML `rel` link on the studio
page (never a manifest key). Build within that direction; anything beyond it is still
Fable. Do not harden it in a way that breaks the tools now depending on it without
saying so.

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
**All six ruled session 27** — see §8c there and the "From the session-27 Fable round"
block below.
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
- [ ] **Bulk-update stale transcluded snapshots in a stub.** **Unblocked (decision #33):**
  freshness is direct and needs nothing new on the wire — fetch `{origin}items/{id}.json`
  and compare `version` to the reference's. Build the probe and the UI against that.
  Transitive ("over the DAG") staleness is undefined and stays out.
- [ ] **Show second-degree references within a stubbed item.** Presentation is this client's
  call (§8.4 does not constrain presentation — session 20). **Check the data exists first:**
  we hold a snapshot of the target, not the target's own reference list, so this may need a
  fetch we don't currently make — in which case say so rather than half-rendering it.
- [ ] **Open a reader item in a new tab.** No affordance today.
- [ ] **Offer plain linking in the reader**, alongside stub and fork. The `[anchor](url)`
  half is ordinary markdown and can ship now for both blygs and RSS. The `[[id]]` half is
  **unblocked (decision #32)** — see the session-27 block below for the grammar.
- [ ] **Discard button for an unpublished new version.** Note the session-19 trap recorded
  above: the shared action handler ends in `location.reload()`, which is wrong for any
  action that removes the thing being viewed.
- [ ] **Reorder the tabs** — reading first, compose second, subscriptions moved to just
  before settings.

### From the session-27 Fable round (2026-09-28) — wire-adjacent, now buildable

These four are what promote `protocol-v0.3.md` §16.1/§16.2 from "ruled" to normative
(strict #21: the spec text follows the build). Shapes are fixed; do not vary them.

- [ ] **Emit `cited` on every reference** (decision #30, spec §16.1): serialize the existing
  `StubCite` — `source`, `author`, `excerpt` (cap ~200 chars), `url`, `retrieved`
  (REQUIRED) — as `cited` inside `stub_of`, each remote `transclusions[]` entry, and
  `forked_from`, on live and pinned documents. **Read side:** when importing a document
  that carries `cited`, use it as the frozen citation (it is more correct than a later
  lookup, not a fallback) and never as verification input; `verifyMention` reads the bare
  reference only. Never render it into `content_html`. The stale-byline finding for remote
  transclusions is the same fix.
- [ ] **Render `[[id]]` as a plain internal link** (decision #32, spec §16.2): inline
  anywhere in `content_md`, resolve by the `![[id]]` order (#26), render `<a href>` to the
  target's `page` (remote: origin + page), anchor text is ours to choose. Unresolvable is a
  publish error. **No** `transclusions[]` entry, **no** mention, **no** wire class — it is
  invisible on the wire by ruling, not by omission.
- [ ] **`[TK]impyrt=<text>[/TK]` in the composer** (decision #37, spec §5.7 rule 7): a
  studio-private TK form whose output is the pasted text verbatim, wrapped as an ordinary
  `blyg-tk-gen` span, with a `generated[]` entry carrying `sources: []` and `model`/`at`
  only if the author supplies them. No new wire member and no "external" flag. The
  composer may offer a model picker for the entry; it must not invent one.
- [ ] **Agent-contract hooks, direction only** (decision #39, roadmap-tracks 1.10/2.10):
  when 2.9's tokens land, include a **read scope** for studio-private material (drafts,
  hoppers, signals, mentions) so an agent can poll `/api` for staleness, inbound mentions
  and new imports. Poll first; no webhooks until a need is measured. The public state
  plane needs nothing — it is already the corpus.
- [ ] **Generate a changelog note when the author leaves it blank** (decision #40,
  roadmap-tracks 2.12, spec §5.2 + §16.6c): at publish, diff the locally held prior
  version against the new one and draft a note through the existing generation provider.
  **Pin-bounded depth is the one hard rule:** if the prior version is unpinned the note
  describes and MUST NOT quote it; between two pinned versions it may be as full as it
  likes. Editable before publish. Emit `"generated": true` on the changelog entry for such
  notes — that emission is what promotes §16.6c into §5.2.
- [ ] **History view on a rolled-up item** (#40): notes as a timeline; where two
  consecutive versions are both pinned, a local diff of the two pinned files ("see the
  change"). Needs nothing from the wire; works on any imported 0.2+ blyg with pins.
- [ ] **Discovery surfaces from references** (decision #41, roadmap-tracks 2.13). Four,
  none touching the wire, in this order of payoff:
  1. **Chain view.** Parse the stored `content_html` of an imported thread for nested
     `blockquote.blyg-transclusion` and read `data-blyg-id/version/origin` at every depth;
     render the chain with a provenance line per layer (today only the direct layer gets
     one) and a subscribe affordance per origin not in `subscriptions`. **Absent
     `data-blyg-origin` on a nested layer means the origin of the layer that baked it**,
     not ours — carry origin context down the tree. One cached manifest fetch per unknown
     origin for its title. `importer/sanitize.ts` is allowlist-by-removal and keeps
     `data-blyg-*` (verified session 27), and stored HTML is verbatim anyway.
  2. **"Responds to" walk.** From an imported item's `stub_of`, fetch
     `{origin}items/{id}.json`, show the target and follow *its* `stub_of`; bounded
     (~6), cached, each origin subscribable. Works for chains you are not in.
  3. **The conversation around you.** Verified inbound mentions ∪ your outbound
     references, grouped by origin; "responded to you, not subscribed" at the top.
  4. **Second-degree blogrolls + cited origins.** Fetch each subscription's
     `blogroll.opml` (§11) and aggregate every `origin` in imported provenance; list
     origins minus subscriptions, ordered by how many of your reads list/cite them.
     Local ordering only — never published, never shown as a count on a public page.
  **Do not** scrape another blyg's public responses list for the forward direction; it is
  presentation, and #28 keeps verified mentions off the wire by decision (spec §16.6d).
- [ ] **Emit `generator_url`** (decision #34, spec §16.6a): one absolute URL beside
  `generator` in the manifest — `https://github.com/blygger/blygger-studio`, derived from
  `CLIENT` like `GENERATOR` is. Same commit as the level fix below; together they promote
  §16.6a into §6.1.
- [ ] **`PROTOCOL_LEVEL` → `2`.** Live nodes emit `"level": 1` while publishing 0.3
  constructs; 0.3's §3 defines L2 as this specification. One line. (Readers may not gate
  on it — §3.2 — so this is honesty, not compatibility.)
- [ ] **Store the target version per outbound mention** (roadmap-tracks 1.7, decision #33):
  `enqueueOutbound` resets every row to `pending` on republish because `mentions_out`
  holds no target version; spec §15.2 says unchanged references are not re-sent. Same
  missing fact as the freshness probe above — build them together.

### New features

- [ ] **Reset the owner password in settings.** **Design is fixed (decision #31), build with
  or after tokens:** a reset rotates the root secret and invalidates sessions; tokens are
  independent and survive, and the reset flow MUST list them and offer revoke-all, because
  compromise is exactly when an attacker has minted one. Auth today is one shared
  `OWNER_PASSWORD` behind a 30-day HMAC cookie. Anything beyond that shape is Fable.
- [ ] **Timezone localization for displayed dates.** The complaint is real — dates render in
  UTC. **The wire must not change:** feed dates stay RFC-822, item documents stay ISO-8601
  UTC, and `toIsoUtc()` keeps normalizing at the parse boundary. A `timezone` setting
  localizes *rendering only*, studio and public pages. Writing local time into a feed would
  reintroduce the session-18 reading-list sort bug on every subscriber.

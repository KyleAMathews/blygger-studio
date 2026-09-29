# Changelog — Blygger Studio

Client releases, newest first. **The client version is not the protocol version**
(README § Versioning): an entry here says what this program does, and names the
protocol version it implements rather than changing it. Protocol versions are
released separately, as `/spec/{version}/` documents in
[`blygger-spec`](https://github.com/blygger/blygger-spec).

Every entry states **Migrations** explicitly, because that is the one line an
operator needs before deciding how careful an upgrade has to be. Upgrade
instructions are in the README under
[Releases and upgrading](README.md#releases-and-upgrading).

This file starts at 0.4.1, the first tagged release. Everything before it is in
the [program devlog](https://github.com/blygger/blygger-spec/blob/main/DEVLOG.md) —
sessions 1–26, which is where the client's history lives because the client did
not have its own repo until session 26.

---

## 0.8.0 — 2026-09-29

**Migrations: one — `0012_responses_default.sql`.** It adds a nullable
per-item override for the responses list; the backfill is written so that an
upgrade changes nothing that is currently visible on your pages (see below).
Run `npm run upgrade`, or apply migrations and deploy as usual.

**No wire changes.** Everything in this release is presentation, studio
behaviour or packaging. `PROTOCOL_VERSION` is unchanged and no published
document is affected.

### Reading

**A two-pane reader.** Sources on the left, one stream on the right, with
per-source filtering and "Add feed" at the top. Subscriptions left the nav
because the list of them is now where you read them — the page stays, and owns
pause, resume, resync, delete, blogroll membership and poll diagnostics, all of
which the sidebar deliberately does not try to hold.

**Reading entries show the item's address, not an "open" label.** Several
origins stubbing one item were indistinguishable from each other: the body is
what they share and the origin is what they do not.

**The entry's controls are split by what they do.** Composition (`stub`,
`fork`, and the new `link post`, which starts a fragment containing `[[id]]`)
sits apart from the rest (`copy [[id]]`, `copy url`, the address). `stub ↗`
remains the one control that means "I am responding".

### Titles

A titled item is now named the same way on every surface that names it. A
leading heading becomes the linked title on the feed page, in the studio
reader, on the permalink, **and** — new here — in the archive listing and in
the page's own `<head>`. Before this, the archive ran the heading into the body
("On Protocols Protocols are the thin layer…") and so did every social card.
Items remain titleless on the wire (§5.3): all of this is derivation from the
item's own first block, never a new field.

### Social cards

The head has carried `description`, `og:*` and `twitter:card` since 0.4.1. This
release fixes what they *said*: `og:title` is the declared heading where there
is one (and carries no site suffix — `og:site_name` is the tag that says
where), and the description is taken from what follows the heading rather than
repeating it. The pinned-version page and the archive gained an `og:image`;
a pinned page uses the blyg's avatar rather than the item's current
attachments, because its whole promise is the bytes from when it froze.

### Studio chrome

**The nav is a top menu.** Sections are real targets with a hover state and a
filled current tab; `public page` and `log out` are a separate group. Below
640px the bar collapses behind a hamburger.

**A mobile pass over every studio and public page at phone width.** Horizontal
overflow is gone (a single pasted URL used to set the page's minimum width, so
every page scrolled sideways), tap targets are ~44px where they were 18–26px,
and the reading sidebar collapses behind a control that names the source you
are filtered to.

Both collapses are gated on a marker that only a scripted browser sets, so a
browser with JavaScript off gets the full navigation rather than a button that
does nothing.

### Settings

**A timezone for displayed dates.** A Worker's clock is UTC, so an evening post
could show tomorrow's date. The picker is filled by your *browser's* list of
zones and preselects your device's. The wire is unchanged and tested — feed
dates stay RFC-822 in GMT and item documents ISO-8601 UTC; this is what a human
reads on the page.

**A global default for whether items show their responses, overridable per
item.** The old column was two-valued, so "off" and "no opinion" were the same
row and a default could never take effect. Migration 0012 adds the override.
**The backfill is conservative on purpose:** existing explicit opt-ins become
hard overrides and everything else inherits a default that is off, which
reproduces exactly what your pages show today. An upgrade that newly exposed
other people's responses on someone's pages would be a bad day.

**Update alerts, on by default.** The studio compares its own `CLIENT.version`
against the public releases feed and says when you are behind. Nothing about
your deployment is sent — it is a version comparison against a feed, not a
check-in. Dismissable, and switchable off in settings.

### Packaging

**`npm run init` and `npm run upgrade`.** `init` provisions a new deployment
idempotently, picks the Cloudflare account explicitly even when there is only
one, and never sees your owner password (`COOKIE_SECRET` is generated and piped
on stdin). `upgrade` shows what is coming, calls out changed migrations, keeps
your `wrangler.jsonc` on conflict, and gates on typecheck and tests before
offering to deploy.

**The shipped client names no deployment.** The committed `wrangler.jsonc`
carried two Cloudflare accounts, three D1 databases, bucket and worker names,
zones with route patterns, and a comment describing a live production API
surface — a copy of this repo inherited all of it. None of it was a credential
and all of it was already public, so this removes nothing from the world; what
it does is make the artifact honest. Configure your instance in
`wrangler.jsonc` and nothing under `src/`; if you ever have to edit `src/` to
configure an instance, that is a bug in this client, because it breaks your
upgrade path. Please report it.

---

## 0.7.0 — 2026-09-28

**Migrations: none.** Studio UI only; nothing on the wire changes and no
published document is affected.

**The `[[` picker now exists, in all three composers.** `[[id]]` has rendered and
resolved since 0.6.0, but the only way to find an id for one was to know it:
the picker lived inside the thread editor and fired only on `![[` at the start of
a line, while `[[id]]` is legal **inline and in a fragment**. The one construct
you can write anywhere was the one construct with no way to look anything up.

- The palette is now shared by the quick composer, the fragment editor and the
  thread editor, and it distinguishes the two bracket forms: `![[` with only
  whitespace before it on the line inserts a directive over the whole line;
  `[[` anywhere inserts a link in place and leaves the rest of the sentence
  alone. The `!` guard that separates them is the client-side spelling of the
  negative lookbehind the renderer already uses, so an inline `![[` — which
  inside a `[TK]` scope means a source reference — still opens nothing.
- **The directive form is offered in the thread editor only**, because only a
  thread resolves transclusions at publish. In a fragment `![[id]]` publishes as
  literal text, so a picker there would have written a line that does nothing.
  `[[id]]` resolves for both kinds and is offered everywhere.
- One panel serves both forms and both use the same candidate list, because
  `[[id]]` resolves through the same order as the directive — the same set of
  ids, by construction rather than by coincidence.
- A hint line in the palette names which form you are in and what it will do.

**Removed: the palette's dead search box.** It looked like the query field, took
focus and keystrokes, and was wired to nothing — the query has always been the
text you are typing in the editor. It is replaced by the hint line above. This
is half of the "picker has no search" report; the other half, paging past the
first 20 candidates, is still open.

**The thread editor had no discard button at all.** `threadEditPage` computed
`discardBtn` — both branches, with the comment explaining the distinction — and
then never interpolated it, so a thread draft could not be discarded and a
thread's unpublished changes could not be thrown away. The fragment editor
rendered the same control correctly, and every case in the discard test block
used the fragment editor, so the whole control could go missing from half the
studio with the suite green. Fixed, with thread cases added and
`noUnusedLocals` turned on so a control that is built and then dropped is a
compile error rather than a silent gap.

**The picker pages, and says how many there are.** `/fragments/search` capped
at 20 silently, so a blyg with more than 20 quotable items had a picker that
just stopped — indistinguishable from having nothing more to offer. The
response now carries `total`/`offset`/`limit`, the palette states "showing 20
of 63" (or "26 matches, all shown"), and ArrowDown at the bottom of a partial
list fetches the next page instead of sticking. Clicking the count line does
the same. This closes the rest of the reported picker bug.

**Reading entries link out.** Every entry rendered its body and linked to
nothing, so the most ordinary next move — read the whole thing where it lives —
had no affordance and meant copying an origin out of the byline. Each entry now
carries `open ↗`, derived from `sourceTitleAndUrl`, the same rule the stub
gesture already used: the origin's declared `page` wins (§2.3.2, decision #29),
the `f/`·`t/` convention is only a fallback, an L0 entry points at the anchor
its feed supplied, and an own entry points at our own public page. Always a new
tab — the studio holds unsaved composer text. A withdrawn own item offers no
link, because sending a reader to an endcap as "open" promises the text and
delivers its absence.

**Nav order: reading now leads.** Then compose, hoppers, mentions,
subscriptions, settings, syntax. The order follows the shape of a session
rather than the order the features were built in — you arrive to read, and most
writing is a response to something read. Subscriptions moved down beside
settings because it configures the reading feed rather than being a place you
work. The order was never asserted, so it is now.

**A draft can change its mind about what it is.** `PUT /api/items/:id` now
accepts `kind` on a never-published draft, and both editors offer "make this a
thread" / "make this a fragment". The composer's toggle always worked by
deleting the draft and recreating it — safe only because the text lives in the
textarea it was typed into — so past the Full Editor door, where the draft has
attachments, TK scopes and a save history, choosing the wrong kind meant
retyping. The row changes in place instead.

- **Never-published only**, guarded in the handler and again in the SQL. Once
  an item is published its `kind` is a field readers have and history records;
  moving it would make the archive disagree with itself. A **withdrawn** item
  is published by this test — its endcap and its versions are both out there.
- **A stub thread is refused (409), not silently converted.** Only threads
  carry a citation, and a stub is a claim the author made about what they are
  responding to; dropping it as a side effect of a kind switch would discard
  that claim. The error names "clear the stub" as the way through, which is a
  button already in the editor.
- Switching a long thread to a fragment is allowed and publish still enforces
  the 1000-char cap, so the editor's counter shows you are over rather than the
  switch pretending the text is fine.

**`copy [[id]]` in the reader (decision #50).** `[[id]]` has been publishable
since 0.6.0 and pickable from inside a composer since earlier in this release,
but it was unreachable from the one place authors actually meet other people's
items: the reading feed. Raised as a possible collision with decision #27
("one affordance, no lighter sibling") and ruled otherwise — #27's forbidden
sibling was a *response* gesture that did not declare itself, and #32 ruled
`[[id]]` declares nothing, so this is a different act: citing without
responding.

- It is named for what it does, and it sits in the byline beside `open ↗`
  where a copy-permalink would. It is **not** in the actions row with
  `stub ↗` and `fork ↗`: `stub ↗` remains the one affordance meaning "I am
  responding", and a peer in that row would say otherwise by position alone.
  #50 makes that placement semantic rather than cosmetic, so it is pinned by
  tests.
- Offered only where the link would resolve at publish, by `resolveTarget`'s
  order: our own published items, and imported non-L0 blyg items that are
  current or pin-retained. An L0 row has no item document and no version, so it
  gets `open ↗` and nothing else — offering a link there would hand you a
  construct that fails your whole publish later.
- It copies the construct, `[[id]]`, not the bare id: an id alone would make
  you remember a grammar you came to the reader to look up. Where
  `navigator.clipboard` is unavailable (an insecure context), the text appears
  in a selected field instead of failing silently.

**Verification:** 578 tests, `tsc --noEmit` clean, and everything above
exercised by hand against a local node — each bracket form in each composer,
arrow-key paging past the 20-item boundary (no duplicates, selection held), the
thread editor's restored discard button, the reader's new link, and a draft
switched from fragment to thread in place with its text intact, and a real
click on `copy [[id]]` putting `[[<id>]]` on the clipboard.

## 0.6.1 — 2026-09-28

**⚠️ Migrations: one — `0011_outbound_target_version.sql`.** The first release
that needs a database step, which is what that line in every entry is for:

```bash
npx wrangler d1 migrations apply <your-db> --remote
```

**A republish no longer re-notifies every origin it quotes.** Spec 0.3 §15.2 says
a republish re-sends "only for references that are new or whose target version
changed", and adds that "the reference client records the target version per
outbound reference for this purpose" — which was not true. `mentions_out` is keyed
`(item_id, target)` and held only *our* version, so `enqueueOutbound` reset every
row to `pending` on every publish: fixing a typo in a thread re-notified every
blyg it quoted. Harmless at two nodes, rude at eleven, and the spec vouched for
behaviour that did not exist.

- The queue now stores `target_version`, and delivery state resets only when the
  row is new, when the target's version actually changed, or when the caller
  forces it. The comparison is null-safe (`IS NOT`), because a `{url}` stub has
  no target version and two nulls must read as *unchanged* — otherwise a stub of
  a plain web page would re-send on every republish forever.
- **Withdrawal forces a re-send**, and is the only caller that may. §15.7 owes
  the receiver one notification precisely *because* nothing about the target
  changed: it re-verifies, finds a withdrawn document, and marks the mention
  gone. Without the override the new rule would have swallowed the one mention a
  withdrawal exists to send.
- Rows written before the migration have a null target version; a null-to-value
  transition counts as a change, so each pre-existing row re-sends at most once.
  §15.2 allows that explicitly — "a sender that re-sends everything on every
  republish is conformant but noisy" — and one noisy round beats a silent wrong
  answer.

Decision #33's staleness probe needs the same stored fact and is still unbuilt;
the roadmap asks for them together, and this is the half the spec freeze needed.

**Verification:** 531 tests, `tsc --noEmit` clean.

## 0.6.0 — 2026-09-28

**The three constructs the 0.3 freeze was waiting on.** Protocol 0.3 records
them in its §16 as *ruled but not built* — the project's rule is that testing
precedes prose (#21), so the spec text follows this release rather than leading
it. Level moves to **2**, which 0.3 §3 defines as this specification.

- **`[[id]]` is a plain internal link** (§16.2). Inline anywhere in a document,
  resolved at publish by the same order a `![[id]]` directive uses, rendered as
  an ordinary anchor to the target's own page — absolute, because `content_html`
  travels to subscribers. An unresolvable link fails the publish, like an
  unresolvable directive. It is **silent on the wire**: no `transclusions[]`
  entry, no Webmention, no class. In a medium where every other way of citing
  notifies the other side, this is the one that does not, deliberately.
- **`cited` carries a reference's human half** (§16.1). A frozen
  `{source, author?, excerpt?, url, retrieved}` inside `stub_of`, each **remote**
  `transclusions[]` entry, and `forked_from`, on live and pinned documents. It is
  additive and optional: own-origin transclusions are byte-identical to before,
  so every 0.2 document is still a valid 0.3 one. It is self-asserted and never
  authoritative — never read by mention verification, never rendered into
  `content_html`, and a reader that ignores it stays conformant. Why it exists:
  a reference carries identity and no words, so a reader whose target has
  disappeared was shown an id and nothing else, and seven client
  implementations would each have had to invent a label cache.
  - **This also fixes a stale byline.** The provenance line under a baked remote
    quote was rendered from a live join against the subscription, so renaming or
    deleting a subscription silently rewrote what an already-published document
    said about its source. It now reads the frozen citation. A citation that
    changes after publication was never a citation.
  - An **imported** document's own `cited` values are retained verbatim rather
    than recomposed from local guesses. Nothing renders them yet — the
    second-degree reference view does not exist — but a citation discarded on
    import could never be recovered.
- **`generator_url` in the manifest** (§16.6a): one absolute URL to this
  client's source, derived from `CLIENT` exactly as `generator` is. SHOULD, never
  MUST, and readers may not gate on it. It exists because five of the seven
  live client implementations have no locatable repository, and a manifest is
  the one place every blyg is required to be public — so it is the only channel
  through which a directory could ever point an operator at a release page.
- **`level` 1 → 2.** Live nodes were publishing 0.3 constructs while announcing
  level 1. Readers may not gate on the level (§3.2), so this is honesty rather
  than compatibility — it was wrong in the only way a self-report can be, by
  understating what is there.

**Migrations: none.** `cited` rides the reference objects and the two citation
columns migrations 0008 and 0010 already added.

**Verification:** 528 tests, `tsc --noEmit` clean. Documents published before
this release are unchanged and still conformant; nothing is rewritten in place.

## 0.5.0 — 2026-09-28

**A blyg can now decline to receive Webmentions.** Protocol 0.3, unchanged —
§15 is OPTIONAL at every level, and this release is the client catching up to
that. Until now `blygger-studio` had no way to express it: `buildManifest` took
a `webmention: false` option that no caller ever passed, so every deployment
served the endpoint whether its operator wanted one or not. That is the wrong
default to impose on somebody who stood a node up by following a start page.

- **Settings → "Accept Webmentions"**, on by default, so nothing changes for an
  existing node until its operator changes it. Unchecked, the endpoint is
  *withdrawn rather than guarded*: the manifest omits its `webmention` key,
  pages omit both the `<link rel="webmention">` element and the `Link` header,
  and a POST gets **404** — the same answer a static export gives, rather than a
  403 that would imply an endpoint with a policy.
- **A setting, not an `Env` var**, because it has to survive the way these nodes
  actually upgrade: a re-clone carries `wrangler.jsonc` across by hand, and a D1
  setting is never in that path.
- **Sending is unaffected.** A blyg that does not receive mentions still sends
  them when it quotes, stubs or forks someone — the two halves were always
  independent and stay so. Responses already collected stay in the studio.
- `accept_mentions` accepts a boolean, or the strings `"on"`/`"off"`, and
  **rejects anything else with 400** instead of storing it. Any stored value but
  `"off"` reads as on, so a silently-accepted typo would re-open the endpoint an
  operator meant to close.

**Migrations: none** — settings are key/value rows in an existing table.

**Verification:** 515 tests, `tsc --noEmit` clean.

## 0.4.1 — 2026-09-28

**Security hardening of the Webmention endpoint. Recommended for every live node,
and the reason this release exists.** `POST {mount}/webmention` is the only
unauthenticated public endpoint in this program, and as of this month the origins
that advertise it are published in a public directory — so the defaults shipped
here are the ones strangers now find. Protocol 0.3, unchanged. Level 1, unchanged.

- **Rate limit now also counts the registrable domain**, not just the source host,
  at 120/hour. The existing per-host cap of 60/hour was defeated by wildcard DNS:
  `a.spam.example` and `b.spam.example` are different hosts, so a flooder paid one
  DNS label per 60 accepted claims. Both caps apply; the domain cap is the higher
  of the two on purpose, because the domain grouping is a documented heuristic and
  a hosting suffix it does not know about would otherwise cap every site behind
  that suffix collectively.
- **A global cap of 300 accepted claims/hour on the endpoint as a whole.** No
  per-source limit bounds a total: fifty domains sending 119 each sat inside every
  previous cap while spending up to ~11,900 outbound fetches at URLs strangers
  chose — on the deployer's Cloudflare account. Once this cap binds, further new
  claims in that window are refused, so the refusal now carries `Retry-After`.
- **`failed` inbound claims are deleted after 30 days**, on the existing cron.
  They previously accumulated forever, which made an endpoint anyone can POST to
  into an unbounded write surface. `verified`, `gone` and `pending` rows are
  untouched — `gone` in particular is kept deliberately, so that a responder who
  withdraws and republishes is recognized as the same relationship.

**Migrations: none.** Every cap counts columns that already exist, so upgrading is
a redeploy with no database step.

**Verification:** 512 tests, `tsc --noEmit` clean.

## 0.4.0 — 2026-09-28 (untagged)

The rename and the split, recorded here for continuity; there is no tag, because
this changelog did not exist yet.

- This client moved out of `blygger-spec/worker/` into its own repository with all
  59 of its commits, and was renamed **`blyg-ref` → `blygger-studio`**, the name
  people were already using for it in public.
- `CLIENT` (name + version) became a constant of its own, deliberately decoupled
  from `BRAND`: the brand is the protocol's vocabulary, and a client renaming
  itself must not read as a protocol change. This release is the first where the
  client version and the protocol version differ.
- Both outbound user-agent strings are now derived from `GENERATOR`. They had been
  written by hand and had drifted to `blyg-ref/0.2` and `blyg-ref/0.3` on a 0.3.0
  client.
- **Nodes reporting `blyg-ref/0.3.0` are this same software under its old name.**
  Nothing about such a deployment is wrong or broken; it is simply behind, and as
  of 0.4.1 it is behind on the Webmention hardening above.

**Migrations: none.**

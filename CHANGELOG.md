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

**Verification:** 544 tests, `tsc --noEmit` clean, and all three composers
exercised by hand against a local node — each bracket form, the arrow-key
selection, the insertion, and the preview re-render.

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

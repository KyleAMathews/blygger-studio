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

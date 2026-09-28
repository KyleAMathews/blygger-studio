# Blygger Studio

The reference client for the [Blygger protocol](https://github.com/blygger/blygger-spec) —
a Cloudflare Worker that publishes a blyg, subscribes to others, and threads,
transcludes and responds across them.

**Protocol implemented:** `blyg 0.3`, level 2 · **Client version:** 0.6.0 ·
`generator: blygger-studio/0.6.0` · [releases + upgrading](#releases-and-upgrading)

> **This is one client, not the protocol.** As of 2026-09-28 there are at least
> **seven** client implementations publishing live blygs, six of which are not this
> one. Blygger is a protocol over static files and RSS; if this client's choices
> don't suit you, the spec is short and writing your own is a normal thing to do —
> several people already have. What makes a blyg a blyg is in
> [`blygger-spec`](https://github.com/blygger/blygger-spec), not here.

## What it does

Two halves, on purpose:

- **Studio** (private, owner-only) — composing fragments and threads, hoppers,
  subscriptions, signals, TK generation. **Implementation-defined:** the protocol
  does not constrain any of it, and a different client is free to do all of this
  differently.
- **Page** (public) — the conformant `blyg` artifact: manifest, feed, item
  documents, permalinks, pinned snapshots, archives. Served by the Worker directly
  **or exported to any dumb static host**, byte-identically. That export is the
  protocol's core invariant, not a convenience feature.

## Quick start

```bash
npm install --legacy-peer-deps    # see "npm" below — the flag is not optional here
npm run dev                       # wrangler dev
npm test                          # 528 tests
npx tsc --noEmit
npm run export -- --out DIR --base https://example.com/blyg/
```

New deployment from scratch: follow [`blygger.org/start/`](https://blygger.org/start/),
which is the path every third-party node so far has taken.

## The one public endpoint, and how to turn it off

Everything this Worker serves is either static output or password-gated —
**except `{mount}/webmention`**, which accepts an unauthenticated POST from
anyone, because that is how another blyg tells yours that it has quoted or
responded to you. Claims are structurally verified (the source's own item
document must name your item) and no content of theirs is ever stored, but the
endpoint is still open by necessity.

It is also **optional**: protocol 0.3 §15 is OPTIONAL at every level. In
**Settings → Accept Webmentions** you can switch it off, and off means gone —
no manifest key, no `rel="webmention"` on your pages, 404 on the endpoint. You
still *send* mentions when you quote other people. Rate limits, if you leave it
on, are per source host, per registrable domain, and per endpoint per hour; the
numbers are in [`src/mentions/store.ts`](src/mentions/store.ts) with the
reasoning for each.

## Releases and upgrading

Releases are git tags `v{version}` with a GitHub release, and every one has an
entry in [`CHANGELOG.md`](CHANGELOG.md). **Each entry states `Migrations:`
explicitly** — that is the line to read before upgrading, because it decides
whether a deploy is the whole job.

**What you are running now** is in your own manifest, which is public:
`curl https://your-origin/blyg/blyg.json` → `generator` is this client's name and
version (`blygger-studio/0.6.0`). A node reporting `blyg-ref/0.3.0` is this same
software under its pre-2026-09-28 name.

### Upgrading a node you stood up by hand

Which is every third-party node so far, since the template and `npm run init` in
`self-host-plan.md` §4 are still unbuilt.

```bash
git pull                          # only if you cloned blygger-studio — see below
npm ci --legacy-peer-deps
npm test                          # optional, ~20s, and worth it
npm run deploy                    # wrangler deploy, your account, your config
```

Then re-read the changelog entry's `Migrations:` line. If it lists any:

```bash
npx wrangler d1 migrations apply DB --remote
```

**If your copy came from `blygger-spec` rather than from this repo** — i.e. you
cloned before 2026-09-28 and worked in `worker/` — `git pull` will not bring you
here. The client left that repo by `git subtree split`, so this history is the
same *content* with different commit ids, and `worker/` no longer exists there at
all. Clone this repo fresh and carry over what is yours:

- **`wrangler.jsonc`** — your D1 `database_id`, your R2 bucket, your routes and
  your `vars` (`MOUNT`, and `SITE_URL` if you set one). Nothing in the committed
  file is yours; all of it names our deployments.
- **Nothing else.** Your secrets (`OWNER_PASSWORD`, `COOKIE_SECRET`, any AI
  provider key) live in Cloudflare, not in the repo, and a redeploy does not touch
  them. Your D1 database and R2 bucket are likewise untouched — an upgrade
  replaces the Worker's code and nothing else.

Keep your fork's own `CLIENT` name if you have modified the client (see
[If you fork this](#if-you-fork-this)); an upgrade should not quietly rename you
back to us.

**There is no notification channel yet.** Nothing tells you a release exists — the
directory-side update feed is item 3.1 on
[the roadmap](https://github.com/blygger/blygger-spec/blob/main/docs/roadmap-tracks.md)
and is not built. Until it is, watching this repo's releases on GitHub is the only
mechanism there is, and for a security release we have no way to reach you at all.

## Layout

```
src/index.ts        routes — studio and /api registered before the public sub-app
src/protocol.ts     the wire: manifest, feed, item documents
src/model.ts        publish/withdraw/pin/restore, the state machine
src/importer/       subscribe side — resolve, feed parse, poll, hoppers, L0
src/mentions/       Webmention in and out, structural verification
src/tk.ts           TK scope grammar · src/tk-generate.ts  instructed generation
src/stub.ts         stubs (respond) · src/fork.ts  forks and lineage
src/pages.ts        public pages · src/studio.ts  the authoring UI
migrations/         D1 schema, 0001–0010
scripts/            export, deploy-all
deploy-targets.json every live deployment this repo knows how to deploy
```

## Versioning

**Client version and protocol version are independent, deliberately.** This client
is 0.6.0 and implements protocol 0.3. The manifest carries both — `blyg` is the
protocol version, `generator` is this client's identity — and per the spec's
decision #18d `generator` is *informative*: no reader may gate behaviour on it.

Nodes running the older `blyg-ref/0.3.0` build are unaffected and keep reporting
that string truthfully. It is the same software; the name changed when the client
moved out of the spec repo at session 26 (2026-09-28).

## If you fork this

People already do, and that is fine. Two requests, both so that the upgrade path
keeps working for you:

1. **Change `CLIENT` in `src/types.ts`.** A fork that keeps reporting
   `blygger-studio/0.6.0` makes the ecosystem census wrong for everyone, and it is
   the census that drives update notices. Give your fork its own name and version —
   that is what `Blynger`, `blyg-publisher` and the rest do.
2. **Tell us it exists**, so it can be listed at `blygger.org` and so a breaking
   change to an extension point can be announced rather than discovered. Our repos
   have zero GitHub forks, which means copies are invisible to us by default.

A stable publishing API — so that tools can write to a blyg without modifying its
client — is the open design question tracked as item 1.8 in
[`roadmap-tracks.md`](https://github.com/blygger/blygger-spec/blob/main/docs/roadmap-tracks.md).
Until it lands, `/api` is **private and unversioned**: 30 endpoints behind a single
owner cookie. Build against it and expect it to move.

## npm

`npm install` **needs `--legacy-peer-deps`** on this project. npm 10.9.0's peer
resolver crashes on vitest's optional peer graph
(`TypeError: Cannot read properties of null (reading 'edgesOut')`), reproducible with
a bare `npm install vitest` in an empty directory — the environment, not this repo.
An existing lockfile masks it, so a fresh clone hits it and an incremental install
does not.

## History

This repo was split out of
[`blygger/blygger-spec`](https://github.com/blygger/blygger-spec) at session 26
(2026-09-28), preserving all 59 commits of `worker/`'s history via
`git subtree split`. The spec repo is now normative-only. The split happened because
one repo holding both the protocol and one implementation of it stopped working the
moment strangers began filing "transclusion is broken" meaning "your Worker has a
bug" — there are six other implementations that could mean the first thing.

## License

[MIT](LICENSE). The protocol documents live in `blygger-spec` under CC-BY-4.0.

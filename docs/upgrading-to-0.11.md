# Upgrading to Blygger Studio 0.11

This guide is for anyone running Blygger Studio **0.8.x or earlier** who wants
to move to 0.11.0. Releases 0.9.0, 0.10.0 and 0.11.0 shipped within three
days of each other, and between them they change how the Studio is built and
how its private API works. Your published blyg does not change: the public
pages, the feed, the item documents and the rest of the protocol output stay
compatible, and other blygs need nothing from you.

If you are already on **0.10.0**, skip to [From 0.10.0](#from-0100).

## What changed, in one paragraph each

**The Studio is now a React app (0.10.0).** The editor, reading feed,
subscriptions, hoppers, mentions and settings pages were rebuilt as a
single-page app. Layout, themes and features are the same. Saving is more
careful: a failed save keeps your text, publishing waits for a successful
save, and leaving the editor saves first. The app is compiled when you
install, so **a source install now has a build step** (it runs automatically;
see below). Your blyg's public pages are still plain server-rendered HTML.

**The owner API is a documented contract (0.9.0).** `/api` is described by an
OpenAPI file and has a generated JavaScript SDK. It is resource-shaped: POST
creates, PATCH edits, PUT pins. **Several old routes were removed with no
aliases.** If you use a third-party tool that writes to your blyg's `/api`, read
[For tool authors](#for-tool-authors-api-changes) before upgrading. The Studio
itself and the public protocol are unaffected.

**Releases come with downloads (0.9.0).** Each release on GitHub carries a
ready-to-deploy Worker archive, the OpenAPI file, the SDK package and
checksums, so you can upgrade without building from source.

**0.11.0** fixes image URLs between blygs, shows full threads on the public
feed, and lets you insert images anywhere while writing. See the
[changelog](../CHANGELOG.md).

## Before you start

1. **Check your version.** Open `https://YOUR-BLYG/blyg.json` (include your path
   mount, e.g. `/blyg/blyg.json`) and read `generator`. It says
   `blygger-studio/0.8.3` or similar.
2. **Back up your database.** Run
   `npx wrangler d1 export DB --remote --output backup.sql` from your
   deployment directory. The upgrade adds one index and changes no stored
   values, but a backup is cheap.
3. **Node 22.18 or newer** is required for a source install (the build uses
   it). `node -v` to check. A Worker-archive install needs only `npx wrangler@4`.
4. **Commit or stash local changes**, including your `wrangler.jsonc`.

## Database migrations

| Coming from | Apply |
|---|---|
| 0.7.x or earlier | `0012` (from 0.8.0) **and** `0013` |
| 0.8.x | `0013_signal_poll_index.sql` |
| 0.10.0 | none |

`0013` adds an index for the reading view's signal order. It changes no data.
Both upgrade paths below apply pending migrations for you. To do it by hand:

```sh
npx wrangler d1 migrations apply DB --remote
```

Apply migrations **before** deploying the new code.

## Upgrade a source install (you cloned the repository)

```sh
npm run upgrade
```

This is the same script you used for 0.8.x. It fetches the release tags,
merges the newest release, keeps your `wrangler.jsonc` if it conflicts,
runs `npm install` (which now also **builds the SDK and the Studio app**),
applies pending migrations, runs the type checks and tests, and asks before
deploying. Answer `y` to deploy, or deploy yourself later with
`npx wrangler deploy`.

If `npm install` fails with a peer-dependency error, run
`npm install --legacy-peer-deps` yourself and re-run the script. Some npm
versions need the flag; the script already passes it.

If you deploy with your own command rather than the script, run
`npm run build` first. The `deploy` npm scripts do this automatically; a bare
`wrangler deploy` does not. With no build it fails to bundle, which is safe. With
a `build/` folder left over from an earlier build, it **deploys the old Studio
app without any error**, which is not.

## Upgrade a Worker-archive install (no source checkout)

1. Download `blygger-worker-0.11.0.tar.gz` and `SHA256SUMS` from the
   [0.11.0 release](https://github.com/blygger/blygger-studio/releases/tag/v0.11.0).
   Check the digest: `shasum -a 256 -c SHA256SUMS --ignore-missing`.
2. Extract it somewhere new. Copy its `worker.js` and `migrations/` into your
   deployment directory. **Keep your own config**; do not use the archive's
   generic template.
3. From your deployment directory:

   ```sh
   npx wrangler@4 d1 migrations apply DB --remote
   npx wrangler@4 deploy
   ```

The archive has the Studio app built in, so there is no build step.

## Path-mounted blygs

If your blyg lives under a path (for example `example.com/blyg/`), the Studio
is still at `{mount}/studio` and the API is still at `/api`. The Studio's app
files are served from `{mount}/studio/app.js` and `app.css`, inside the same
range, so **your existing routes or forwarding rules keep working**: you need
`{mount}/*` (plus the bare `{mount}` if you route it separately) and `/api/*`,
as before. Nothing new needs to be routed.

## Check it worked

1. `blyg.json` reports `generator: "blygger-studio/0.11.0"`. Public responses
   are cached for up to 60 seconds, so add `?x=1` if you still see the old one.
2. Open `{mount}/studio/`. You should get the login page, then the compose
   page. If the Studio looks like the old one or misbehaves, the deploy
   probably used a stale build: run `npm run build` and deploy again.
3. Write a short draft and save it; open Reading and page past the first 25
   entries; publish something small and see it on your public page.
4. Within an hour, your reading feed's images from other blygs start loading
   (the background repair below). Nothing to do for this.

## Rolling back

Redeploy the previous version's Worker. The `0013` index is harmless to older
code and can stay. Image URLs repaired by 0.11.0 stay repaired, which older
code also handles. Old routes that tools used come back with the old code.

## From 0.10.0

No migrations. Run `npm run upgrade` (source) or replace `worker.js` and deploy
(archive). What changes for you:

- **Images resolve correctly between blygs.** Studio used to publish image
  paths like `/blyg/media/x.png` inside the item's HTML. Another blyg imported
  that HTML, resolved the path against *its own* address and showed a broken
  image. 0.11.0 publishes absolute URLs, resolves relative URLs in what it
  imports against the source blyg, and quietly repairs items you already
  imported: up to 200 per 15-minute poll. Versions you published before stay as
  they were (published versions are frozen), but any subscriber on 0.11.0
  repairs them on their side.
- **Thread cards on your public page** show the top of each thread as it looks
  on its own page, quotes and formatting included, faded out at a fixed height,
  with "thread" as its own label line.
- **Images can go anywhere while you write**: the attach button inserts at the
  cursor, typing `/image` on its own line opens the picker, and you can paste
  or drop an image into the text.

## For tool authors: API changes

If you maintain a tool that writes to a blyg's `/api`, the routes below changed
in 0.9.0. Authentication did not change: it is still the owner session cookie
from `{mount}/studio/login`. Request bodies are now validated strictly, so
unknown fields are rejected, and preferences are JSON booleans. The full
contract is at `/api/openapi.json` on any 0.9+ blyg (signed in), and in
[the API guide](api.md).

| Before (0.8.x) | Now |
|---|---|
| `PUT /api/items/:id` | `PATCH /api/items/{id}` (only the fields you send change) |
| `PUT /api/items/:id/responses` | `PATCH /api/items/{id}` with `{"responses": "default" \| "show" \| "hide"}` |
| `POST /api/items/:id/pin` `{"version": n}` | `PUT /api/items/{id}/versions/{n}/pin` |
| `POST /api/fork` `{origin, id, version}` | `POST /api/items` `{"mode": "fork", "source": {origin, id, version}}` |
| `POST /api/stubs` `{subscription_id, remote_id, selection?}` | `POST /api/items` `{"mode": "response", "source": {subscription_id, remote_id}, "selection"?}` |
| `PUT /api/subscriptions/:id` | `PATCH /api/subscriptions/{id}` |
| `POST /api/subscriptions/:id/pause` / `resume` | `PATCH /api/subscriptions/{id}` `{"paused": true \| false}` |
| `PUT /api/hoppers/:id` | `PATCH /api/hoppers/{id}` |
| `PUT /api/mentions/:id/hidden` | `PATCH /api/mentions/{id}` `{"hidden": true \| false}` |
| `PUT /api/settings` | `PATCH /api/settings` |
| `POST {studio}/preview`, `/preview-thread` | `POST /api/preview` |
| `GET {studio}/fragments/search` | `GET /api/search` |
| `GET {studio}/versions/:id/:v` | `GET /api/items/{id}/versions/{v}` |

Unchanged: `POST /api/items` (blank drafts), publish, withdraw, generate,
restore, `DELETE /api/items/{id}`, `POST /api/media`, subscription create,
resync and delete, hopper create and delete, hopper items, and signals.
`POST /api/items` now returns status 201 with the full item and a `Location`
header. Collection reads return `{ items, total, offset, limit }`.

Bearer tokens and OAuth for third-party tools are planned but **not in 0.11**.

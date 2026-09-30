# Blygger Worker download

This archive contains the bundled Worker, D1 migrations, and a generic Wrangler
config. It needs no source build. Install Node.js 22 or newer and Wrangler 4.

For a new instance, create a D1 database and R2 bucket. Edit `wrangler.jsonc` with
your Worker name, account, D1 database name/ID, R2 bucket, and custom domain.
The `DB` and `MEDIA` binding names must stay the same. Set `MOUNT` for your site.
Keep `main` set to `worker.js` and `no_bundle` set to `true`.

```sh
npx wrangler@4 secret put OWNER_PASSWORD
npx wrangler@4 secret put COOKIE_SECRET
npx wrangler@4 d1 migrations apply DB --remote
npx wrangler@4 deploy
```

Use a strong, distinct cookie secret. Visit `/studio` to sign in. Configure AI
provider keys in your deployment if you use text generation.

When upgrading, read the release's changelog entry and its `Migrations:` line.
Keep your existing deployment config and Cloudflare secrets. Replace `worker.js`
and `migrations/` with the new release's files, apply any required migrations,
and deploy. Back up D1 before applying migrations.

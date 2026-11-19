# Contributing to Blygger Studio

Before you write code, decide where your change belongs. Answer these in order and stop at the first yes:

1. Would it change the bytes another blyg or reader receives, or would another client have to change? → **a spec question**: an issue on [blygger-spec](https://github.com/blygger/blygger-spec/issues/new/choose), ruled before anything is built.
2. Is it a bug, or something every blyg would want with no setting? → **a pull request here.**
3. Can it be done from outside, on a token, through `{mount}/api`? → **a tool** in your own repository.
4. Is it interface for one owner, in a slot that exists? → **an extension** ([`docs/extensions.md`](docs/extensions.md)).
5. Does it need a slot or setting any blyg could use? → **a hook**, proposed here as a pull request.
6. Is it several of these together, making a kind of blyg? → **a mod** ([`docs/mods.md`](docs/mods.md)).
7. Does it only make sense on your node? → **a local patch**, kept as a `local:` commit.
8. Does it change what the Studio is? → **another client**, a fork with its own name.

The full page, with the test for each rung, a first hour on a local node and the rules for local patches, is **[where does my change belong?](docs/where-does-it-go.md)**.

## Pull requests

- The Studio is the reference client and stays plain. A pull request that adds an opinion will be asked to become an extension.
- `npm test` and `npm run typecheck` must pass. CI also runs the browser suite and `npm run check:template`.
- If you change a route in `src/contract/`, run `npm run sdk:generate` and commit the result.
- Say in the description what a reviewer should check or try. It is read in full before merge.
- Never develop against a live blyg. Use `npm run dev` and a local database.
- Venkat Rao merges by default. Kyle Mathews and Aneesh Sathe are also maintainers. They work through pull requests like everyone else, and push to `main` or merge only when Venkat is unavailable or hands a merge to them.

Bugs go in an issue with the **Bug** template, which asks for your client version and any local patches.

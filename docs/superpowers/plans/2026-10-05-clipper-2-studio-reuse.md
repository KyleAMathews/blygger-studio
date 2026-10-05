# Clipper Plan 2: Studio Code Reuse Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a second host (the Chrome clipper's side panel) reuse the Studio's TanStack DB collections, presentational components and composer core, without changing anything the Studio does.

**Architecture:** Today the Studio's modules build one cookie client against `location.origin`, start polling, and read `#studio-root` as soon as they are imported. This plan moves the reusable parts into five modules with no import-time Studio state: `data-core.ts` (collections built around a client the host passes in), `host.ts` (where links point, set by each host), `primitives.tsx` (presentational components), `text-edit.ts` (pure text helpers) and `composer.tsx` (textarea tools, preview and upload, with their Studio-specific dependencies injected). The existing `data.ts`, `components.tsx` and `authoring.tsx` keep their exports by delegating, so no other Studio file changes.

**Tech Stack:** React 19, TanStack DB (`@tanstack/react-db`, `@tanstack/query-db-collection`), TanStack Router, Base UI, the generated SDK (`sdk/dist/browser.js`), esbuild (`scripts/build-spa.ts`), vitest (`test-ui`, node environment), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-chrome-clipper-design.md`, §2.1. Plan 2 of 3. Plan 1 (server) is complete on this branch; Plan 3 builds the extension on these modules.

## Global Constraints

- **Studio behaviour unchanged.** The existing suites are the check: `npm run typecheck`, `npm run test:ui`, `npm test`, and `npm run test:e2e` (254 tests at the branch point).
- **Reuse boundary:** `src/ui/data-core.ts`, `src/ui/host.ts`, `src/ui/primitives.tsx`, `src/ui/text-edit.ts` and `src/ui/composer.tsx`, and everything they import, must never import `src/ui/data.ts`, `src/ui/components.tsx`, `src/ui/app.tsx` or `@tanstack/react-router`. A test enforces this (Task 3).
- **Every existing import keeps working.** `data.ts`, `components.tsx` and `authoring.tsx` re-export what moved, so no other file's imports change.
- **Moves are verbatim.** Moved code keeps its comments and logic. The only edits are the injected dependencies named in each task.
- **No new test files.** Add tests to the existing `test-ui/state.test.ts` and `test-ui/links.test.ts`.
- Node is `/usr/local/bin/node`. Prefix commands with `PATH=/usr/local/bin:$PATH`. The SPA type-checks with `tsconfig.ui.json` (inside `npm run typecheck`). UI unit tests run with `npm run test:ui`.
- Work in `/Users/kylemathews/programs/blygger-studio/.worktrees/chrome-clipper` on branch `chrome-clipper`. Dependencies are installed.

## Review Focus

1. **A path-mounted Studio** (`/blyg/studio`) must still build every link and image URL under its mount after `mount` moves to `host.ts`. `e2e/mounted-studio.spec.ts` must pass (Task 2 runs it).
2. **An image pasted mid-upload, then navigating away**, must still ask before leaving. The leave guard is now injected; `e2e/image-insert.spec.ts` must pass (Task 3).
3. **The editor's preview** must still debounce, abort stale requests and show errors in place, after it moves into `usePreview`. `e2e/studio.spec.ts` and `e2e/save-oracle.spec.ts` must pass (Task 3).
4. **Importing a reusable module in a page with no `#studio-root`** must not throw. Task 2's node test imports `host.ts` with no `document`; Task 1's imports `data-core.ts`.
5. **Two hosts must not share a cache.** Each `createStudioData` call gets its own `QueryClient`. Task 1's test builds data around a host client and checks its reads go to that host only.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/ui/data-core.ts` (create) | `createStudioData(client)`: every collection and cache helper, built around the given client; pure lens helpers and types |
| `src/ui/data.ts` (rewrite) | The Studio's instance: a cookie client against `location.origin`, polling started, the same exports as today |
| `src/ui/host.ts` (create) | `origin`, `mount`, `basepath` as live bindings; `configureHost`; `onBlyg` |
| `src/ui/primitives.tsx` (create) | `Button`, `SourceLink`, `Html`, `Failure`, `Modal`, `ActionBar`, moved from `components.tsx` |
| `src/ui/components.tsx` (modify) | Re-exports from `host.ts` and `primitives.tsx`; keeps the Studio layout, chrome and hooks |
| `src/ui/text-edit.ts` (create) | `insertBlock`, `imageCommandAt` (pure) |
| `src/ui/composer.tsx` (create) | `useAction`, `placeCaret`, `linkInto`, `pourOver`, `getPreview`, `usePreview`, `useUpload` with injected `UploadDeps` |
| `src/ui/authoring.tsx` (modify) | Imports the moved code; supplies the Studio's `UploadDeps`; Editor uses `usePreview` |
| `test-ui/state.test.ts` (modify) | Host-client data test, host test, reuse-boundary test |
| `test-ui/links.test.ts` (modify) | `insertBlock` and `imageCommandAt` tests |

---

### Task 1: `createStudioData(client)`

**Files:**
- Create: `src/ui/data-core.ts`
- Rewrite: `src/ui/data.ts`
- Test: `test-ui/state.test.ts`

**Interfaces:**
- Produces:
  - `createStudioData(client: BlyggerClient)`, returning `{ client, queryClient, polling, items, settings, subscriptions, hoppers, signals, itemDetail, reading, readingView, refreshReading, hopperDetail, changed, updates, hopperPreview, authorizations }`. The polling is created but **not started**; the host calls `polling.start(window, document)`.
  - `type StudioData = ReturnType<typeof createStudioData>`.
  - From `data-core.ts`: `LENSES`, `type Lens`, `lensKind`, `readingKey`, `type Detail`, `type Reading`.
  - `data.ts` exports exactly the names it exports today.

- [ ] **Step 1: Write the failing test**

Append to `test-ui/state.test.ts`:

```ts
import { createBlyggerClient } from '../sdk/dist/browser.js';
import { createStudioData } from '../src/ui/data-core.ts';

test('collections read through the client their host supplies, with their own cache', async () => {
  const seen: Request[] = [];
  const client = createBlyggerClient({
    baseUrl: 'https://blyg.example',
    headers: { Authorization: 'Bearer host-token' },
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      seen.push(request);
      return Response.json({ site_title: 'From the host' });
    },
  });
  const data = createStudioData(client);
  await data.settings.preload();
  expect(seen.map((r) => r.url), 'reads go to the host the client names').toEqual(['https://blyg.example/api/settings']);
  expect(seen[0].headers.get('authorization')).toBe('Bearer host-token');
  expect([...data.settings.values()][0]?.site_title).toBe('From the host');
  const other = createStudioData(client);
  expect(other.queryClient, 'each host gets its own cache').not.toBe(data.queryClient);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `PATH=/usr/local/bin:$PATH npm run test:ui`
Expected: FAIL, `Failed to load url ../src/ui/data-core.ts`.

- [ ] **Step 3: Create `src/ui/data-core.ts`**

Build it from the current `src/ui/data.ts` like this:

1. Copy lines 1–30 (the imports) unchanged, except: remove `createBlyggerClient` from the SDK value import, and add `import type { BlyggerClient } from '../../sdk/dist/browser.js';`.
2. Add this header comment above the imports:

   ```ts
   // The Studio's collections, built around whichever SDK client a host passes
   // in: the Studio's cookie client, or the clipper's bearer client. Nothing
   // here reads the page or starts work at import time; the host decides.
   ```
3. Put the pure lens helpers and the types at module level, unchanged: the `Detail` type (line 233), the `Reading` type and its comment (259–261), `LENSES`, `Lens` and `lensKind` with their comment (262–270), and `readingKey` with its comment (271–278).
4. Add the function. Its body is lines 33–51, 54–232, 234–258, 279–408 of the current file, moved verbatim and in that order. The only changes:
   - `export const` and `export function` inside the body become `const` and `function`.
   - `queryClient.mount();` stays inside the body.
   - `polling.start(window, document);` (line 52) is **not** copied.

   ```ts
   export function createStudioData(client: BlyggerClient) {
     // …moved body…
     return { client, queryClient, polling, items, settings, subscriptions, hoppers, signals, itemDetail, reading, readingView, refreshReading, hopperDetail, changed, updates, hopperPreview, authorizations };
   }
   export type StudioData = ReturnType<typeof createStudioData>;
   ```

- [ ] **Step 4: Rewrite `src/ui/data.ts`**

```ts
// The Studio's own data: the cookie client against this origin, polling while
// the tab is visible. Other hosts build theirs with createStudioData.
import { createBlyggerClient } from '../../sdk/dist/browser.js';
import { createStudioData } from './data-core.ts';
export { LENSES, lensKind, readingKey } from './data-core.ts';
export type { Detail, Lens, Reading, StudioData } from './data-core.ts';

const studio = createStudioData(createBlyggerClient({ baseUrl: location.origin }));
studio.polling.start(window, document);
export const {
  client,
  queryClient,
  polling,
  items,
  settings,
  subscriptions,
  hoppers,
  signals,
  itemDetail,
  reading,
  readingView,
  refreshReading,
  hopperDetail,
  changed,
  updates,
  hopperPreview,
  authorizations,
} = studio;
```

- [ ] **Step 5: Run the tests and type-check**

```bash
PATH=/usr/local/bin:$PATH npm run test:ui
PATH=/usr/local/bin:$PATH npm run typecheck
PATH=/usr/local/bin:$PATH npm run build
```

Expected: test:ui passes, including the new test; typecheck prints no errors; the build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/ui/data-core.ts src/ui/data.ts test-ui/state.test.ts
git commit -m "Build the Studio's collections around a client the host supplies"
```

---

### Task 2: Host module

**Files:**
- Create: `src/ui/host.ts`
- Modify: `src/ui/components.tsx:23-25`
- Test: `test-ui/state.test.ts`

**Interfaces:**
- Produces: `export let origin: string`, `export let mount: string`, `export let basepath: string` (live bindings); `configureHost(next: { origin: string; mount: string }): void`; `onBlyg(path: string): string`, the absolute URL `origin + mount + path`.
- `components.tsx` still exports `mount` and `basepath`, now re-exported from `host.ts`.

- [ ] **Step 1: Write the failing test**

Append to `test-ui/state.test.ts`:

```ts
import * as host from '../src/ui/host.ts';

test('a host with no studio root sets where its links point', () => {
  expect(host.mount, 'no #studio-root: an empty mount, not a crash').toBe('');
  host.configureHost({ origin: 'https://example.com', mount: '/blyg' });
  expect(host.mount).toBe('/blyg');
  expect(host.basepath).toBe('/blyg/studio');
  expect(host.onBlyg('/studio/edit/abc')).toBe('https://example.com/blyg/studio/edit/abc');
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `PATH=/usr/local/bin:$PATH npm run test:ui`
Expected: FAIL, `Failed to load url ../src/ui/host.ts`.

- [ ] **Step 3: Create `src/ui/host.ts`**

```ts
// Where this app's blyg lives, for links and image URLs. The Studio reads it
// from its root element; another host (the clipper) calls configureHost
// before it renders. These are live bindings: importers read the value in
// force when they use it.
const root = typeof document === 'undefined' ? null : document.getElementById('studio-root');
export let origin = typeof location === 'undefined' ? '' : location.origin;
export let mount = root?.dataset.mount ?? '';
export let basepath = `${mount}/studio`;

export function configureHost(next: { origin: string; mount: string }) {
  origin = next.origin;
  mount = next.mount;
  basepath = `${mount}/studio`;
}

/** An absolute URL on the blyg, for links that leave the host's own page. */
export const onBlyg = (path: string) => new URL(`${mount}${path}`, origin).href;
```

- [ ] **Step 4: Point `components.tsx` at it**

Replace lines 23–25:

```ts
export const mount =
  document.getElementById('studio-root')!.dataset.mount ?? '';
export const basepath = `${mount}/studio`;
```

with:

```ts
import { basepath, mount } from './host.ts';
export { basepath, mount };
```

Move the new `import` line up with the other imports at the top of the file.

- [ ] **Step 5: Run the tests, the build and the mounted e2e spec**

```bash
PATH=/usr/local/bin:$PATH npm run test:ui
PATH=/usr/local/bin:$PATH npm run typecheck
PATH=/usr/local/bin:$PATH npm run build
PATH=/usr/local/bin:$PATH node node_modules/@playwright/test/cli.js test e2e/mounted-studio.spec.ts
```

Expected: all pass (Review Focus 1).

- [ ] **Step 6: Commit**

```bash
git add src/ui/host.ts src/ui/components.tsx test-ui/state.test.ts
git commit -m "Move mount and basepath into a host module any app can set"
```

---

### Task 3: Primitives, text helpers and the composer core

**Files:**
- Create: `src/ui/primitives.tsx`, `src/ui/text-edit.ts`, `src/ui/composer.tsx`
- Modify: `src/ui/components.tsx` (move six components out), `src/ui/authoring.tsx` (lines 58–89, 110–172, 540–657, 1411–1476, 2291–2302 and the import block)
- Test: `test-ui/links.test.ts`, `test-ui/state.test.ts`

**Interfaces:**
- Consumes: Task 2's `mount` (`host.ts`).
- Produces:
  - `primitives.tsx`: `Button`, `SourceLink`, `Html`, `Failure`, `Modal`, `ActionBar`, with the same signatures as today.
  - `text-edit.ts`: `insertBlock(text, start, end, block): { text: string; caret: number }` and `imageCommandAt(text, caret): { start: number; end: number } | null`.
  - `composer.tsx`:
    - `useAction()` and `placeCaret(el, start, end?)`.
    - `linkInto(el, raw, at, change)` and `pourOver(event, change): boolean`.
    - `getPreview(client, text, itemId: string | undefined, kind, signal?)` and `type Preview`.
    - `usePreview(client, text, itemId: string | undefined, kind): Preview | undefined`.
    - `interface UploadDeps { client: BlyggerClient; mediaUrl: (url: string) => string; onUploaded?: (itemId: string) => Promise<void>; useLeaveGuard: (busy: () => boolean) => void }`.
    - `useUpload(id, textarea, setText, deps: UploadDeps)`, which returns what it returns today.
    - Re-exports `insertBlock` and `imageCommandAt`.
  - `authoring.tsx` still exports `insertBlock` and `imageCommandAt`.

- [ ] **Step 1: Write the failing tests**

Append to `test-ui/links.test.ts`:

```ts
import { imageCommandAt, insertBlock } from '../src/ui/text-edit.ts';

test('insertBlock puts a block on its own paragraph with only the blank lines needed', () => {
  expect(insertBlock('', 0, 0, 'B')).toEqual({ text: 'B', caret: 1 });
  expect(insertBlock('a', 1, 1, 'B')).toEqual({ text: 'a\n\nB', caret: 4 });
  expect(insertBlock('a\n', 2, 2, 'B')).toEqual({ text: 'a\n\nB', caret: 4 });
  expect(insertBlock('a\n\nc', 3, 3, 'B')).toEqual({ text: 'a\n\nB\n\nc', caret: 4 });
  expect(insertBlock('a b', 1, 2, 'B'), 'a selection is replaced').toEqual({ text: 'a\n\nB\n\nb', caret: 4 });
});

test('imageCommandAt finds only a /image line ending at the caret', () => {
  expect(imageCommandAt('x\n/image', 8)).toEqual({ start: 2, end: 8 });
  expect(imageCommandAt('/image\nmore', 6)).toEqual({ start: 0, end: 6 });
  expect(imageCommandAt('see /image', 10)).toBeNull();
  expect(imageCommandAt('/imagex', 7)).toBeNull();
  expect(imageCommandAt('/image more', 6)).toBeNull();
});
```

Append to `test-ui/state.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

test('reusable modules never reach the Studio instance or the router', () => {
  const forbidden = [/\/src\/ui\/data\.ts$/, /\/src\/ui\/components\.tsx$/, /\/src\/ui\/app\.tsx$/, /^@tanstack\/react-router$/];
  const roots = ['data-core.ts', 'host.ts', 'primitives.tsx', 'text-edit.ts', 'composer.tsx'].map((f) => resolve('src/ui', f));
  const seen = new Set<string>(), stack = [...roots], violations: string[] = [];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(/^\s*(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]/gm)) {
      const target = spec.startsWith('.') ? resolve(dirname(file), spec) : spec;
      if (forbidden.some((f) => f.test(target))) violations.push(`${file} -> ${spec}`);
      else if (spec.startsWith('.') && /\.tsx?$/.test(target)) stack.push(target);
    }
  }
  expect(seen.size, 'the walk reached every reusable module').toBeGreaterThanOrEqual(roots.length);
  expect(violations, 'a reusable module imports the Studio instance or the router').toEqual([]);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `PATH=/usr/local/bin:$PATH npm run test:ui`
Expected: FAIL, `Failed to load url ../src/ui/text-edit.ts`. The reuse test fails with `ENOENT` for `primitives.tsx`.

- [ ] **Step 3: Create `src/ui/text-edit.ts`**

Move `insertBlock` and `imageCommandAt`, with their doc comments, verbatim from `src/ui/authoring.tsx` (lines 110–131) into a new file headed:

```ts
// Pure text edits shared by every composer. No React, no DOM.
```

- [ ] **Step 4: Create `src/ui/primitives.tsx`**

Header:

```ts
// Presentational pieces any host can render. No Studio data, no router.
```

Move these verbatim from `src/ui/components.tsx`:
- the `Button` re-export (`import { Button } from '@base-ui/react/button'; export { Button };`)
- `SourceLink` (with its `displayUrl` import from `'../importer/util.ts'`)
- `Html`
- `Failure`
- `Modal` (with `import { Sheet } from './sheets.tsx';`)
- `ActionBar`
- the `ReactNode` type import

In `components.tsx`, delete the moved definitions and add:

```ts
import { ActionBar, Button, Failure, Html, Modal, SourceLink } from './primitives.tsx';
export { ActionBar, Button, Failure, Html, Modal, SourceLink };
```

Remove any `components.tsx` import that is now unused (for example `displayUrl` or the Base UI `Button` import). `tsc` with `noUnusedLocals` will name them.

- [ ] **Step 5: Create `src/ui/composer.tsx`**

```tsx
/*
 * The composer core shared by the Studio and the clipper: textarea tools
 * (caret, link, pour-over), the Markdown preview, and image upload. The
 * Studio-specific parts (which client, where media lives, what to refresh,
 * how to guard leaving mid-upload) arrive as arguments.
 */
import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { BlyggerClient } from '../../sdk/dist/browser.js';
import { BlyggerApi, unwrap } from '../../sdk/dist/browser.js';
import { toast } from './sheets.tsx';
import { insertLink, isUrl, linkToast } from './links.ts';
import { uploadToken } from './upload-tokens.ts';
import { imageCommandAt, insertBlock } from './text-edit.ts';
export { imageCommandAt, insertBlock };
```

Then move these from `src/ui/authoring.tsx`, verbatim except where noted:

1. `useAction` (lines 58–89), now `export function useAction()`.
2. `placeCaret`, `linkInto` and `pourOver` (lines 133–172, with their comments), each now `export function`.
3. `getPreview` (lines 2291–2302), changed to take the client and an optional item:

   ```tsx
   export const getPreview = (
     client: BlyggerClient,
     text: string,
     itemId: string | undefined,
     kind: 'fragment' | 'thread',
     signal?: AbortSignal,
   ) =>
     unwrap(
       BlyggerApi.preview({
         client,
         body: { content_md: text, ...(itemId ? { item_id: itemId } : {}), kind },
         signal,
       }),
     );
   export type Preview = Awaited<ReturnType<typeof getPreview>>;
   ```
4. The preview effect from `Editor` (lines 1454–1476), as a hook. Its body is the moved effect:

   ```tsx
   /** The server's preview of `text`, 150 ms after typing stops; stale requests are aborted. */
   export function usePreview(client: BlyggerClient, text: string, itemId: string | undefined, kind: 'fragment' | 'thread') {
     const [preview, setPreview] = useState<Preview>();
     useEffect(() => {
       const controller = new AbortController();
       const timer = setTimeout(() => {
         void getPreview(client, text, itemId, kind, controller.signal)
           .then(setPreview)
           .catch((error) => {
             if (!controller.signal.aborted)
               setPreview({
                 html: '',
                 scopes: [],
                 errors: [
                   {
                     reason:
                       error instanceof Error ? error.message : String(error),
                   },
                 ],
               });
           });
       }, 150);
       return () => {
         clearTimeout(timer);
         controller.abort();
       };
     }, [client, text, itemId, kind]);
     return preview;
   }
   ```
5. `useUpload` (lines 540–657, with its doc comment), now `export function useUpload(id, textarea, setText, deps: UploadDeps)`, and these as its only changes:
   - Above it, add:

     ```tsx
     /** What a host supplies to useUpload: its client, where uploaded media is served, and its own refresh and leave guard. */
     export interface UploadDeps {
       client: BlyggerClient;
       mediaUrl: (url: string) => string;
       onUploaded?: (itemId: string) => Promise<void>;
       useLeaveGuard: (busy: () => boolean) => void;
     }
     ```
   - `BlyggerApi.uploadMedia({ client, …` becomes `BlyggerApi.uploadMedia({ client: deps.client, …`.
   - `` setText(current().replace(token, `![](${mount}/${media.url})`)); `` becomes `` setText(current().replace(token, `![](${deps.mediaUrl(media.url)})`)); ``.
   - `if (itemId) await changed('item');` becomes `if (itemId) await deps.onUploaded?.(itemId);`.
   - The `useBlocker({...})` block becomes `deps.useLeaveGuard(() => action.busy);`. Its comment ("Leaving mid-upload strands…") moves with it.
   - `textarea` keeps its type, now written `RefObject<HTMLTextAreaElement | null>`.

- [ ] **Step 6: Rewire `src/ui/authoring.tsx`**

1. Delete the moved definitions: `useAction`, `insertBlock`, `imageCommandAt`, `placeCaret`, `linkInto`, `pourOver`, `useUpload` and `getPreview`.
2. Add imports, and keep the old exports:

   ```tsx
   import { getPreview, imageCommandAt, insertBlock, linkInto, placeCaret, pourOver, useAction, usePreview, useUpload, type UploadDeps } from './composer.tsx';
   export { imageCommandAt, insertBlock };
   ```

   Drop `getPreview` from the import if nothing still uses it after step 4.
3. Add the Studio's upload dependencies near the top of the file, after the imports:

   ```tsx
   /** Leaving mid-upload asks first (studio#24), through the router's blocker. */
   function useRouterLeaveGuard(busy: () => boolean) {
     useBlocker({
       enableBeforeUnload: busy,
       shouldBlockFn: async () =>
         busy() &&
         !(await confirm({
           title: 'An image is still uploading. Leave anyway? It will not be placed in the text.',
           ok: 'leave',
           danger: true,
         })),
     });
   }
   const studioUpload: UploadDeps = {
     client,
     mediaUrl: (url) => `${mount}/${url}`,
     onUploaded: async () => { await changed('item'); },
     useLeaveGuard: useRouterLeaveGuard,
   };
   ```
4. Every `useUpload(x, input, y)` call becomes `useUpload(x, input, y, studioUpload)`. There are two, in Compose and Editor.
5. In `Editor`:
   - Delete the `preview` `useState` (lines 1411–1412) and the preview `useEffect` (lines 1454–1476).
   - Add `const preview = usePreview(client, text, item.id, item.authored_kind);` where the state was declared.
   - Leave `preview?.scopes`, `preview?.link_errors`, `preview?.errors` and `preview?.html` as they are.
6. Remove any import `tsc` now reports as unused. `useBlocker` stays, because the Editor's own draft guard and `useRouterLeaveGuard` use it.

- [ ] **Step 7: Run the checks and the composer e2e specs**

```bash
PATH=/usr/local/bin:$PATH npm run test:ui
PATH=/usr/local/bin:$PATH npm run typecheck
PATH=/usr/local/bin:$PATH npm run build
PATH=/usr/local/bin:$PATH node node_modules/@playwright/test/cli.js test e2e/image-insert.spec.ts e2e/save-oracle.spec.ts e2e/studio.spec.ts e2e/spa-studio.spec.ts e2e/compose-pwa.spec.ts e2e/mounted-studio.spec.ts
```

Expected: everything passes (Review Focus 2 and 3).

- [ ] **Step 8: Commit**

```bash
git add src/ui/primitives.tsx src/ui/text-edit.ts src/ui/composer.tsx src/ui/components.tsx src/ui/authoring.tsx test-ui/links.test.ts test-ui/state.test.ts
git commit -m "Extract the composer core, text helpers and primitives for reuse"
```

---

### Task 4: Full verification

**Files:** none changed unless a check fails.

- [ ] **Step 1: Run every suite CI runs**

```bash
PATH=/usr/local/bin:$PATH npm run typecheck
PATH=/usr/local/bin:$PATH npm run test:ui
PATH=/usr/local/bin:$PATH node node_modules/.bin/vitest run --maxWorkers=2
PATH=/usr/local/bin:$PATH npm run release:build && PATH=/usr/local/bin:$PATH npm run release:verify
PATH=/usr/local/bin:$PATH npm run test:e2e
```

Expected:
- typecheck: clean
- test:ui: all pass
- Worker suite: all pass
- release verify: all four "verified" lines
- e2e: all pass (254 or more)

A failure means a move was not verbatim or a dependency was not injected. Fix it in the task that caused it.

- [ ] **Step 2: Commit any fix**

If Step 1 needed a fix, commit it with a message naming the failing check. If not, there is nothing to commit.

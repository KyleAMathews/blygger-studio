// The design system first, so each screen's own stylesheet (imported by its
// module below) comes after it in the bundle and wins ties.
import './studio.css';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
  RouterContextProvider,
  RouterProvider,
} from '@tanstack/react-router';
import { Layout, basepath } from './components.tsx';
import { Compose, EditorPage } from './authoring.tsx';
import { ReadingArticle, ReadingPage, loadArticleEntry } from './reading.tsx';
import { PeekPage, loadPeek } from './peek.tsx';
import { AuthorizationsPage } from './authorizations.tsx';
import { SettingsPage } from './settings.tsx';
import {
  HoppersPage,
  HopperPage,
  MentionsPage,
  ForkPage,
  loadForkOptions,
} from './catalog.tsx';
import {
  itemDetail,
  hopperInfo,
  readingView,
  readingKey,
  readingSummaryView,
  LENSES,
  type Lens,
  queryClient,
  listViews,
  preloadView,
  preloadDetail,
  preloadHopperPreviews,
  preloadHopperInfos,
  preloadHopperManagement,
  preloadMentions,
  preloadStaleThreads,
  preloadSignals,
} from './data.ts';
import { Button } from './components.tsx';
import { SyntaxPage } from './syntax.tsx';
import { MorePage } from './more.tsx';
import { UpdatesPage } from './updates.tsx';
import { SignalsPage } from './signals.tsx';
import { SheetHost } from './sheets.tsx';
import { ExtensionPage } from './extension-page.tsx';
import { SetupPage } from './setup.tsx';
import { ComponentLibraryPage } from './component-library.tsx';
import { componentGalleryEnabled } from './build-flags.ts';
import { applyCachedTheme } from './theme.ts';
import { applyCachedTitle } from './tab.ts';
import { errorLog, watchUncaughtErrors } from './error-log.ts';
import { TooltipProvider } from './primitives.tsx';
// Paint the last theme this device saw before the first render; settings
// repaint it once they load (see theme.ts).
applyCachedTheme();
applyCachedTitle();
watchUncaughtErrors();
/** A failed route load replaces the page, banners included: log it from here. */
function RouteErrorLogged({ error }: { error: unknown }) {
  useEffect(() => { errorLog.record(error, 'route'); }, [error]);
  return null;
}
/** Start loads a page shows its own pending state for; their errors surface in that page. */
function background(loads: Promise<unknown>[]) {
  for (const load of loads) void load.catch(() => undefined);
}
const rootRoute = createRootRoute({
  // Settings shape the layout; the update check only feeds a badge, so it
  // loads beside the page instead of holding it (session 79).
  loader: () => {
    void preloadView(listViews.updates).catch(() => undefined);
    return preloadView(listViews.settings);
  },
  pendingComponent: () => <p>Loading Studio…</p>,
  errorComponent: ({ error }) => (
    <div role="alert">
      <p>{error instanceof Error ? error.message : String(error)}</p>
      <RouteErrorLogged error={error} />
      <Button
        onClick={() =>
          void queryClient
            .resetQueries({
              predicate: (query) => query.state.status === 'error',
            })
            .then(() => router.invalidate())
        }
      >
        retry
      </Button>
    </div>
  ),
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
  notFoundComponent: () => <p>Studio page not found.</p>,
});
const compose = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === 'string' && search.q ? { q: search.q } : {},
  loader: () => preloadView(listViews.items),
  component: () => <Compose {...compose.useSearch()} />,
});
function readingOffset(search: Record<string, unknown>) {
  if (
    typeof search.offset === 'number' &&
    Number.isSafeInteger(search.offset) &&
    search.offset >= 0
  ) {
    return Math.floor(search.offset / 25) * 25;
  }
  if (
    typeof search.page === 'number' &&
    Number.isSafeInteger(search.page) &&
    search.page > 0
  ) {
    return (search.page - 1) * 25;
  }
  return 0;
}
/**
 * /reading is the feed (every source); ?view=sources is the sources list,
 * ?sub=X one source's timeline and ?hopper=H a hopper's. A bookmark that pages
 * without naming a source (?page=2, ?offset=25) still means "all".
 */
function readingSearch(search: Record<string, unknown>): ReturnType<typeof readingLocation> & { q?: string } {
  // ?q= is a search over the picker's scope (docs/search.md); it rides along
  // with any view so clearing it returns to where the reader was.
  const view = readingLocation(search);
  return typeof search.q === 'string' && search.q ? { ...view, q: search.q } : view;
}
function readingLocation(search: Record<string, unknown>): {
  sub?: string;
  hopper?: string;
  offset?: number;
  lens?: Lens;
  view?: 'sources';
  from?: 'feed';
} {
  const offset = readingOffset(search);
  // Smart Feed was renamed Agentic feed (session 77); old links still land there.
  const named = search.lens === 'smart' ? 'agentic' : search.lens;
  const lens =
    typeof named === 'string' && (LENSES as readonly string[]).includes(named) && named !== 'all'
      ? (named as Lens)
      : undefined;
  const withLens = lens ? { lens } : {};
  if (search.view === 'sources') return { view: 'sources', ...withLens };
  if (typeof search.hopper === 'string' && search.hopper)
    return { hopper: search.hopper, offset, ...withLens };
  // from=feed: one source's view reached from an entry's source name, whose back link returns to the feed.
  if (typeof search.sub === 'string') return { sub: search.sub, offset, ...withLens, ...(search.from === 'feed' ? { from: 'feed' as const } : {}) };
  if ('page' in search || 'offset' in search) return { sub: 'all', offset, ...withLens };
  return withLens;
}
const reading = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reading',
  validateSearch: readingSearch,
  loaderDeps: ({ search }) => ({
    sub: search.sub,
    hopper: search.hopper,
    offset: search.offset ?? 0,
    lens: search.lens,
    view: search.view,
  }),
  loader: async ({ deps }) => {
    if (deps.hopper) {
      background([
        ...(deps.lens === 'agentic' ? [] : [preloadView(readingView(readingKey('hopper:' + deps.hopper, deps.lens), deps.offset))]),
        preloadView(listViews.subscriptions),
        preloadView(listViews.hoppers),
        preloadView(listViews.signals),
      ]);
      await Promise.all([
        preloadDetail(hopperInfo(deps.hopper), 'Hopper'),
        ...(deps.offset > 0 ? [preloadView(readingSummaryView(readingKey('hopper:' + deps.hopper, deps.lens)))] : []),
      ]);
      const summary = readingSummaryView(readingKey('hopper:' + deps.hopper, deps.lens)).toArray[0];
      if (deps.offset > 0 && summary && deps.offset >= summary.total) throw redirect({ to: '/reading', search: { hopper: deps.hopper, offset: 0, ...(deps.lens ? { lens: deps.lens } : {}) } });
      return;
    }
    // The feed and sources list share a summary under the selected lens.
    // The sources list needs counts without loading a feed page.
    const sub = deps.sub ?? 'all';
    const offset = deps.view === 'sources' ? 0 : deps.offset;
    const key = readingKey(sub, deps.lens);
    const view = readingView(key, offset);
    // The page draws as soon as it can: the feed shows "Loading reading…"
    // while its rows arrive, and the side lists fill in after (session 79; a
    // deep offset walks the cursor pages, which held the page blank for
    // seconds). Only the summary is awaited, and only when it decides a redirect.
    background([
      ...(deps.view === 'sources' ? [] : [preloadView(view)]),
      preloadView(listViews.subscriptions),
      preloadView(listViews.hoppers),
      ...(deps.view === 'sources' ? [] : [preloadView(listViews.signals)]),
      ...(deps.view === 'sources' && deps.lens !== 'background' && deps.lens !== 'agentic'
        ? [preloadHopperInfos()]
        : []),
    ]);
    if (deps.sub === undefined || deps.lens === 'agentic') {
      background([preloadView(readingSummaryView(key))]);
      return;
    }
    await preloadView(readingSummaryView(key));
    const page = readingSummaryView(key).toArray[0];
    if (
      page &&
      (page.selected !== sub || (offset > 0 && offset >= page.total))
    )
      throw redirect({
        to: '/reading',
        search: {
          sub: page.selected,
          offset: offset >= page.total ? 0 : offset,
          ...(deps.lens ? { lens: deps.lens } : {}),
        },
      });
  },
  component: () => <ReadingPage {...reading.useSearch()} />,
});
/**
 * One entry full screen: /reading/{sub}/{id}, `~own` as the sub for your own
 * items. "more" on a card opens it; reloading stays on it.
 */
const article = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reading/$sub/$id',
  loader: async ({ params }) => {
    await Promise.all([
      preloadView(listViews.subscriptions),
      preloadView(listViews.hoppers),
      preloadView(listViews.signals),
    ]);
    // The article keeps its inline failure and held-item fallback UI.
    await loadArticleEntry(params.sub, params.id).catch(() => undefined);
  },
  component: () => {
    const { sub, id } = article.useParams();
    return <ReadingArticle key={`${sub}/${id}`} sub={sub} id={id} />;
  },
});
/**
 * An item of a blyg you do not subscribe to, read from its origin: where a
 * link or a quoted layer in the reader leads when the blyg is not held.
 */
const peek = createRoute({
  getParentRoute: () => rootRoute,
  path: '/peek',
  validateSearch: (search: Record<string, unknown>) => ({
    origin: typeof search.origin === 'string' ? search.origin : '',
    id: typeof search.id === 'string' ? search.id : '',
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => Promise.all([
    preloadView(listViews.subscriptions),
    loadPeek(deps.origin, deps.id).catch(() => undefined),
  ]),
  component: () => {
    const { origin, id } = peek.useSearch();
    return <PeekPage key={`${origin}/${id}`} origin={origin} id={id} />;
  },
});
const edit = createRoute({
  getParentRoute: () => rootRoute,
  path: '/edit/$id',
  loader: ({ params }) => preloadDetail(itemDetail(params.id), 'Item'),
  component: () => {
    const { id } = edit.useParams();
    return <EditorPage id={id} />;
  },
});
const settings = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});
const setup = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  // new=1: the what's-new walk, only the steps with settings added since the owner last saw setup.
  validateSearch: (search: Record<string, unknown>): { new?: true } => (search.new === true || search.new === 1 || search.new === '1' || search.new === 'true' ? { new: true } : {}),
  component: SetupPage,
});
// Feeds are managed from reading now (each source's inspector sheet).
const subs = createRoute({
  getParentRoute: () => rootRoute,
  path: '/subs',
  beforeLoad: () => {
    throw redirect({ to: '/reading', search: { view: 'sources' }, replace: true });
  },
});
const hoppers = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hoppers',
  loader: () => Promise.all([preloadHopperPreviews(), preloadView(listViews.subscriptions)]),
  component: HoppersPage,
});
const hopper = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hoppers/$id',
  loader: ({ params }) =>
    Promise.all([preloadHopperManagement(params.id), preloadView(listViews.subscriptions)]),
  component: () => {
    const { id } = hopper.useParams();
    return <HopperPage id={id} />;
  },
});
const mentions = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mentions',
  loader: preloadMentions,
  component: MentionsPage,
});
// Quotes that have fallen behind their sources, stalest first (0.23.0).
const updates = createRoute({
  getParentRoute: () => rootRoute,
  path: '/updates',
  loader: preloadStaleThreads,
  component: UpdatesPage,
});
// Thumbs and the private interaction log (0.25.0).
const signalsPage = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signals',
  loader: preloadSignals,
  component: SignalsPage,
});
const fork = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fork',
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    id: string;
    sub?: string;
    origin?: string;
  } => ({
    id: typeof search.id === 'string' ? search.id : '',
    sub: typeof search.sub === 'string' ? search.sub : undefined,
    origin: typeof search.origin === 'string' ? search.origin : undefined,
  }),
  loaderDeps: ({ search }) => ({
    id: search.id,
    sub: search.sub,
    origin: search.origin,
  }),
  loader: ({ deps }) => loadForkOptions(deps.id, deps.sub, deps.origin),
  component: () => (
    <ForkPage id={fork.useSearch().id} options={fork.useLoaderData()} />
  ),
});
const access = createRoute({ getParentRoute: () => rootRoute, path: '/access', loader: () => preloadView(listViews.authorizations), component: AuthorizationsPage });
const more = createRoute({
  getParentRoute: () => rootRoute,
  path: '/more',
  component: MorePage,
});
// A page an enabled Studio extension owns (docs/extensions.md).
const extensionPage = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ext/$name',
  component: () => <ExtensionPage name={extensionPage.useParams().name} />,
});
const syntax = createRoute({
  getParentRoute: () => rootRoute,
  path: '/syntax',
  component: SyntaxPage,
});
const components = componentGalleryEnabled
  ? createRoute({
      getParentRoute: () => rootRoute,
      path: '/components',
      component: ComponentLibraryPage,
    })
  : null;
export const router = createRouter({
  routeTree: rootRoute.addChildren([
    compose,
    reading,
    article,
    peek,
    edit,
    settings,
    setup,
    access,
    subs,
    hoppers,
    hopper,
    mentions,
    updates,
    signalsPage,
    fork,
    more,
    syntax,
    ...(components ? [components] : []),
    extensionPage,
  ]),
  basepath,
  trailingSlash: 'never',
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
createRoot(document.getElementById('studio-root')!).render(
  <TooltipProvider>
    <RouterProvider router={router} />
    {/* The host sits outside RouterProvider so a sheet outlives a failed or
        pending root route; the context lets a custom sheet use Link. */}
    <RouterContextProvider router={router}>
      <SheetHost />
    </RouterContextProvider>
  </TooltipProvider>,
);
// Installable PWA: the worker caches only the shell's static assets (see
// studioServiceWorker in src/spa.ts). Its scope is the studio base itself,
// which the Worker allows with Service-Worker-Allowed.
if ('serviceWorker' in navigator)
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${basepath}/sw.js`, { scope: basepath })
      .catch(() => {});
  });

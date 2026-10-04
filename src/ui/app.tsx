import { createRoot } from 'react-dom/client';
import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { Layout, basepath } from './components.tsx';
import { Compose, EditorPage } from './authoring.tsx';
import { ReadingPage } from './reading.tsx';
import { SettingsPage } from './settings.tsx';
import {
  SubscriptionsPage,
  HoppersPage,
  HopperPage,
  MentionsPage,
  ForkPage,
  loadForkOptions,
  inbound,
  outbound,
} from './catalog.tsx';
import {
  items,
  settings as settingsCollection,
  subscriptions,
  hoppers as hopperCollection,
  signals,
  itemDetail,
  hopperDetail,
  readingView,
  queryClient,
} from './data.ts';
import { Button } from './components.tsx';
import { SyntaxPage } from './syntax.tsx';
import { MorePage } from './more.tsx';
import { SheetHost } from './sheets.tsx';
import { applyCachedTheme } from './theme.ts';
import './studio.css';
// Paint the last theme this device saw before the first render; settings
// repaint it once they load (see theme.ts).
applyCachedTheme();
const rootRoute = createRootRoute({
  loader: () => settingsCollection.preload(),
  pendingComponent: () => <p>Loading Studio…</p>,
  errorComponent: ({ error }) => (
    <div role="alert">
      <p>{error instanceof Error ? error.message : String(error)}</p>
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
  loader: () => items.preload(),
  component: Compose,
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
const reading = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reading',
  validateSearch: (search: Record<string, unknown>) => ({
    sub: typeof search.sub === 'string' ? search.sub : 'all',
    offset: readingOffset(search),
  }),
  loaderDeps: ({ search }) => ({ sub: search.sub, offset: search.offset }),
  loader: async ({ deps }) => {
    await Promise.all([
      readingView(deps.sub, deps.offset).preload(),
      subscriptions.preload(),
      hopperCollection.preload(),
      signals.preload(),
    ]);
    const page = queryClient
      .getQueriesData<
        import('../../sdk/dist/browser.js').ListReadingResponses[200]
      >({ queryKey: ['reading', deps.sub] })
      .map(([, data]) => data)
      .find((data) => data?.offset === deps.offset);
    if (
      page &&
      (page.selected !== deps.sub ||
        (deps.offset > 0 && deps.offset >= page.total))
    )
      throw redirect({
        to: '/reading',
        search: {
          sub: page.selected,
          offset: deps.offset >= page.total ? 0 : deps.offset,
        },
      });
  },
  component: () => <ReadingPage {...reading.useSearch()} />,
});
const edit = createRoute({
  getParentRoute: () => rootRoute,
  path: '/edit/$id',
  loader: ({ params }) => itemDetail(params.id).preload(),
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
const subs = createRoute({
  getParentRoute: () => rootRoute,
  path: '/subs',
  loader: () => subscriptions.preload(),
  component: SubscriptionsPage,
});
const hoppers = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hoppers',
  loader: () => hopperCollection.preload(),
  component: HoppersPage,
});
const hopper = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hoppers/$id',
  loader: ({ params }) =>
    Promise.all([hopperDetail(params.id).preload(), subscriptions.preload()]),
  component: () => {
    const { id } = hopper.useParams();
    return <HopperPage id={id} />;
  },
});
const mentions = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mentions',
  loader: () =>
    Promise.all([inbound.preload(), outbound.preload(), items.preload()]),
  component: MentionsPage,
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
const more = createRoute({
  getParentRoute: () => rootRoute,
  path: '/more',
  component: MorePage,
});
const syntax = createRoute({
  getParentRoute: () => rootRoute,
  path: '/syntax',
  component: SyntaxPage,
});
export const router = createRouter({
  routeTree: rootRoute.addChildren([
    compose,
    reading,
    edit,
    settings,
    subs,
    hoppers,
    hopper,
    mentions,
    fork,
    more,
    syntax,
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
  <>
    <RouterProvider router={router} />
    <SheetHost />
  </>,
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

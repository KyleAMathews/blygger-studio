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
  mount = next.mount.replace(/\/+$/, '');
  basepath = `${mount}/studio`;
}

/** An absolute URL on the blyg, for links that leave the host's own page. */
export const onBlyg = (path: string) => new URL(`${mount}${path}`, origin).href;

// Compose search marks each own hit by what it is: private, draft or public
// (owner search law, sealed-content-build-plan §1 0d; studio#178 R05).
import { beforeAll, expect, test, vi } from 'vitest';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Hit } from '../src/ui/search.tsx';

let hitMeta: typeof import('../src/ui/search.tsx').hitMeta;
beforeAll(async () => {
  // search.tsx reaches the data layer, which reads the studio root at import.
  vi.stubGlobal('location', { origin: 'http://studio.test' });
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'hidden', getElementById: (id: string) => id === 'studio-root' ? { dataset: { apiBase: '/api' } } : null }));
  ({ hitMeta } = await import('../src/ui/search.tsx'));
});

const hit = (extra: Partial<Hit>): Hit => ({
  id: 'a', excerpt: 'x', label: 'x', version: 0, updated: '2026-11-24T00:00:00Z', badge: 'fragment',
  source: 'mine', kind: 'fragment', subscriptionId: null, sourceTitle: null, ...extra,
} as Hit);
const meta = (h: Hit) => renderToStaticMarkup(createElement(Fragment, null, hitMeta(h)));

test('a private hit says private, and neither draft nor unpublished changes', () => {
  const html = meta(hit({ private: true, draft: false }));
  expect(html).toContain('private');
  expect(html).not.toMatch(/draft|unpublished/);
});

test('a draft and a public hit keep their marks, and say nothing of private', () => {
  expect(meta(hit({ draft: true }))).toContain('>draft<');
  expect(meta(hit({ draft: true, version: 2 }))).toContain('unpublished changes');
  const published = meta(hit({ draft: false, version: 1 }));
  expect(published).not.toMatch(/private|draft|unpublished/);
});

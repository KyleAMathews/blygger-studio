import { expect, test } from 'vitest';
import { activityLine, byListing, isNew, isSelf, isSubscribed, nextSeenAt, parseDirectory, type DirectoryBlyg } from '../src/ui/discover.ts';
import { subscribedKeys } from '../src/ui/opml.ts';

const row = (origin: string, listedAt: string, extra: Record<string, unknown> = {}) => ({
  origin, title: 'A Blyg', home: origin, feed: `${origin}feed.xml`, listedAt,
  activity: { level: 'high', score: 4.2, events: 6, lastPost: '2026-11-12T10:00:00.000Z' }, ...extra,
});

test('parseDirectory keeps usable rows in order and drops the rest', () => {
  const blygs = parseDirectory({
    version: 1,
    blygs: [
      row('https://a.example/', '2026-10-01T00:00:00.000Z'),
      row('javascript:alert(1)', '2026-10-01T00:00:00.000Z'),
      row('https://b.example/', 'not a date'),
      row('https://c.example/blyg/', '2026-11-01T00:00:00.000Z', { title: '  ', feed: null, home: 'ftp://x', activity: { level: 'loud' } }),
    ],
  });
  expect(blygs.map((b) => b.origin)).toEqual(['https://a.example/', 'https://c.example/blyg/']);
  expect(blygs[1]).toEqual({
    origin: 'https://c.example/blyg/', title: 'c.example', home: 'https://c.example/blyg/', feed: null,
    listedAt: '2026-11-01T00:00:00.000Z', activity: { level: null, events: 0, lastPost: null }, author: null, generator: null,
  });
  expect(() => parseDirectory({ nope: true })).toThrow(/not its directory/);
});

test('parseDirectory reads who writes a blyg and its client, and drops unsafe links', () => {
  const [full, unsafe, bare] = parseDirectory({ blygs: [
    row('https://a.example/', '2026-10-01T00:00:00.000Z', { author: { name: ' Ada ', url: 'https://ada.example/' }, generator: 'blygger-studio/0.71.0', generatorUrl: 'https://github.com/blygger/blygger-studio' }),
    row('https://b.example/', '2026-10-01T00:00:00.000Z', { author: { name: 'Bo', url: 'javascript:alert(1)' }, generator: 'x/1', generatorUrl: 'data:text/html,x' }),
    row('https://c.example/', '2026-10-01T00:00:00.000Z', { author: { name: '  ' }, generator: 7 }),
  ] }) as DirectoryBlyg[];
  expect(full.author).toEqual({ name: 'Ada', url: 'https://ada.example/' });
  expect(full.generator).toEqual({ name: 'blygger-studio/0.71.0', url: 'https://github.com/blygger/blygger-studio' });
  expect(unsafe.author).toEqual({ name: 'Bo', url: null });
  expect(unsafe.generator).toEqual({ name: 'x/1', url: null });
  expect(bare.author).toBeNull();
  expect(bare.generator).toBeNull();
});

test('new means listed after the newest listing already shown', () => {
  const [older, newer] = parseDirectory({ blygs: [row('https://a.example/', '2026-10-01T00:00:00.000Z'), row('https://b.example/', '2026-11-01T00:00:00.000Z')] });
  expect(isNew(older, '')).toBe(true);
  expect(isNew(older, '2026-10-15T00:00:00.000Z')).toBe(false);
  expect(isNew(newer, '2026-10-15T00:00:00.000Z')).toBe(true);
  expect(nextSeenAt([older, newer], '')).toBe('2026-11-01T00:00:00.000Z');
  // Never backwards, even when the directory drops its newest listing.
  expect(nextSeenAt([older], '2026-11-01T00:00:00.000Z')).toBe('2026-11-01T00:00:00.000Z');
  expect(nextSeenAt([], '')).toBe('');
});

test('subscription status matches by origin or feed, and the owner is not offered themselves', () => {
  const [blyg] = parseDirectory({ blygs: [row('https://www.a.example/', '2026-10-01T00:00:00.000Z')] }) as [DirectoryBlyg];
  expect(isSubscribed(blyg, subscribedKeys([{ origin: 'https://a.example/', feedUrl: 'https://a.example/feed.xml' }]))).toBe(true);
  expect(isSubscribed(blyg, subscribedKeys([{ origin: 'https://other.example/', feedUrl: 'http://a.example/feed.xml' }]))).toBe(true);
  // Following one hopper is not following the blyg.
  expect(isSubscribed(blyg, subscribedKeys([{ origin: 'https://a.example/', feedUrl: 'https://a.example/h/x/feed.xml', hopperFeedUrl: 'https://a.example/h/x/feed.xml' }]))).toBe(false);
  expect(isSelf(blyg, 'https://a.example')).toBe(true);
  expect(isSelf(blyg, 'https://a.example/blyg/')).toBe(false);
});

test('the activity line says how active and how recent', () => {
  const now = Date.parse('2026-11-14T12:00:00.000Z');
  const [blyg] = parseDirectory({ blygs: [row('https://a.example/', '2026-10-01T00:00:00.000Z')] }) as [DirectoryBlyg];
  expect(activityLine(blyg, now)).toBe('last post 2 days ago');
  expect(activityLine({ ...blyg, activity: { level: null, events: 0, lastPost: null } }, now)).toBe('activity not measured yet');
});

test('byListing puts the newest listing first and keeps the directory order on ties', () => {
  const blygs = parseDirectory({ blygs: [
    row('https://a.example/', '2026-10-01T00:00:00.000Z'),
    row('https://b.example/', '2026-11-01T00:00:00.000Z'),
    row('https://c.example/', '2026-10-01T00:00:00.000Z'),
  ] });
  expect(byListing(blygs).map((b) => b.origin)).toEqual(['https://b.example/', 'https://a.example/', 'https://c.example/']);
  expect(blygs[0].origin).toBe('https://a.example/');
});

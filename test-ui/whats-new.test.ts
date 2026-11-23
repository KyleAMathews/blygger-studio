import { expect, test } from 'vitest';
import { compareVersions, whatsNew } from '../src/ui/whats-new.ts';

const since = { a: '0.70.0', b: '0.72.0', read: '0.72.0', c: '0.73.0' };
const highlights = [{ version: '0.73.0', items: ['three'] }, { version: '0.72.0', items: ['two'] }];

test('versions compare numerically, and blank is oldest', () => {
  expect(compareVersions('0.9.0', '0.10.0')).toBeLessThan(0);
  expect(compareVersions('1.0.0', '0.99.9')).toBeGreaterThan(0);
  expect(compareVersions('0.72.0', '0.72.0')).toBe(0);
  expect(compareVersions('', '0.1.0')).toBeLessThan(0);
  expect(compareVersions('', '')).toBe(0);
});

test('an upgrade offers what came after the seen release, newest highlights first', () => {
  expect(whatsNew('0.71.0', '0.73.0', since, highlights)).toEqual({ keys: ['b', 'read', 'c'], highlights, latest: '0.73.0' });
  expect(whatsNew('0.72.0', '0.73.0', since, highlights)).toEqual({ keys: ['c'], highlights: [highlights[0]], latest: '0.73.0' });
});

test('nothing is new once the newest release has been seen', () => {
  expect(whatsNew('0.73.0', '0.73.0', since, highlights)).toEqual({ keys: [], highlights: [], latest: '0.73.0' });
});

test('a blank seen release is a first setup, not a what\'s-new', () => {
  expect(whatsNew('', '0.73.0', since, highlights)).toEqual({ keys: [], highlights: [], latest: '0.73.0' });
});

test('the marker never moves backwards, and never sits behind a tagged release', () => {
  // A node downgraded below what it saw keeps its marker.
  expect(whatsNew('0.74.0', '0.73.0', since, highlights).latest).toBe('0.74.0');
  // Built before the release bump: the tags are ahead of the running version.
  expect(whatsNew('0.71.0', '0.71.0', since, highlights).latest).toBe('0.73.0');
});

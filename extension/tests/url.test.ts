import { expect, test } from 'vitest';
import { normalizeBlygUrl } from '../lib/url.ts';
import { discover, DiscoveryError } from '../lib/discovery.ts';

test('typed addresses normalise to an origin, a mount and a canonical URL (Review Focus 1)', () => {
  expect(normalizeBlygUrl('example.com')).toEqual({ origin: 'https://example.com', mount: '', url: 'https://example.com/' });
  expect(normalizeBlygUrl('  example.com/blyg ')).toEqual({ origin: 'https://example.com', mount: '/blyg', url: 'https://example.com/blyg/' });
  expect(normalizeBlygUrl('https://example.com/blyg/studio/')).toEqual({ origin: 'https://example.com', mount: '/blyg', url: 'https://example.com/blyg/' });
  expect(normalizeBlygUrl('http://example.com/blyg/?x=1#y').origin, 'plain http is upgraded').toBe('https://example.com');
  expect(normalizeBlygUrl('http://127.0.0.1:8787').origin, 'loopback keeps http').toBe('http://127.0.0.1:8787');
  expect(normalizeBlygUrl('http://localhost:8787/').url).toBe('http://localhost:8787/');
});

test('empty and unusable addresses give a plain message', () => {
  expect(() => normalizeBlygUrl('   ')).toThrow("Enter your blyg's address.");
  expect(() => normalizeBlygUrl('https://')).toThrow('That is not a web address.');
  expect(() => normalizeBlygUrl('ftp://example.com')).toThrow('A blyg address starts with https://');
});

test('a website that is not a Blygger Studio fails discovery with a reason (Review Focus 3)', async () => {
  const notStudio = async () => new Response('<html>hello</html>', { status: 200 });
  await expect(discover(normalizeBlygUrl('example.com'), notStudio)).rejects.toMatchObject({ name: 'DiscoveryError', step: 'api', message: 'https://example.com did not answer like a Blygger Studio.' });
  const offline = async () => { throw new TypeError('Failed to fetch'); };
  await expect(discover(normalizeBlygUrl('example.com'), offline)).rejects.toBeInstanceOf(DiscoveryError);
});

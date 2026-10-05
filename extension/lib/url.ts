export interface BlygLocation { origin: string; mount: string; url: string }

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The address the owner typed, as an origin and a mount (spec §3.1). */
export function normalizeBlygUrl(input: string): BlygLocation {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter your blyg's address.");
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error('That is not a web address.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('A blyg address starts with https://');
  if (url.protocol === 'http:' && !LOOPBACK.has(url.hostname)) url.protocol = 'https:';
  const mount = url.pathname.replace(/\/+$/, '').replace(/\/studio$/, '');
  return { origin: url.origin, mount, url: `${url.origin}${mount}/` };
}

import { expect, test } from 'vitest';
import { cleanUrl, insertLink, isUrl, linkMarkdown, linkToast } from '../src/ui/links.ts';

test('every listed tracker is stripped, and the page-selecting parameters stay', () => {
  const raw =
    'https://www.example.com/essays/maintenance?id=7&utm_source=newsletter&utm_medium=email&fbclid=IwAR0x&gclid=a&dclid=b&msclkid=c&mc_cid=d&mc_eid=e&igshid=f&si=g&ref_src=h&ref=i&_hsenc=j&_hsmi=k&mkt_tok=l&page=2';
  expect(cleanUrl(raw)).toEqual({ url: 'https://www.example.com/essays/maintenance?id=7&page=2', removed: 15 });
});

test('a URL that was only trackers loses its "?" and keeps its fragment', () => {
  expect(cleanUrl('https://example.com/a?utm_source=x#part')).toEqual({ url: 'https://example.com/a#part', removed: 1 });
  expect(cleanUrl('https://example.com/a?UTM_Campaign=x')).toEqual({ url: 'https://example.com/a', removed: 1 });
});

test('a URL with no trackers comes back exactly as written', () => {
  const raw = 'https://example.com/a%20b?q=one+two&ref_id=3';
  expect(cleanUrl(`  ${raw}\n`)).toEqual({ url: raw, removed: 0 });
});

test('only a lone http(s) URL counts', () => {
  expect(isUrl(' https://example.com/x ')).toBe(true);
  expect(isUrl('http://example.com')).toBe(true);
  expect(isUrl('see https://example.com')).toBe(false);
  expect(isUrl('ftp://example.com')).toBe(false);
  expect(isUrl('javascript:alert(1)')).toBe(false);
  expect(cleanUrl('not a url')).toBeNull();
  expect(cleanUrl('https://exa mple.com')).toBeNull();
});

test('a selection becomes the link text; no selection makes an autolink, never a fetched title', () => {
  expect(linkMarkdown('https://example.com/a', 'the essay')).toBe('[the essay](https://example.com/a)');
  expect(linkMarkdown('https://example.com/a')).toBe('<https://example.com/a>');
  // Brackets in the words and parentheses in the URL cannot end the link early.
  expect(linkMarkdown('https://en.wikipedia.org/wiki/Foo_(bar)', 'a [b]')).toBe('[a \\[b\\]](https://en.wikipedia.org/wiki/Foo_%28bar%29)');
});

test('insertLink replaces the selection and reports what it did', () => {
  const text = 'Read the essay today.';
  const start = text.indexOf('the essay');
  const result = insertLink(text, start, start + 'the essay'.length, 'https://example.com/e?utm_source=x&fbclid=y')!;
  expect(result.text).toBe('Read [the essay](https://example.com/e) today.');
  expect(result.caret).toBe('Read [the essay](https://example.com/e)'.length);
  expect(result).toMatchObject({ removed: 2, linked: true });
  expect(linkToast(result)).toBe('linked selection · 2 trackers removed');
  const bare = insertLink('See ', 4, 4, 'https://example.com/')!;
  expect(bare.text).toBe('See <https://example.com/>');
  expect(linkToast(bare)).toBe('inserted link');
  expect(insertLink('x', 0, 1, 'nope')).toBeNull();
});

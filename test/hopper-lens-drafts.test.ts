import { SELF } from 'cloudflare:test';
import { expect, it } from 'vitest';
import { apiJson, BASE, login } from './helpers.ts';

// The hopper lens shows a draft's working copy (studio#178 V9), so editing the draft
// must change the lens's answer: a conditional read may not answer 304 with the old copy
// (independent review of PR 189).
it('a draft edit changes the hopper lens: no 304 with the old working copy', async () => {
  const cookie = await login();
  const draft = (await apiJson(cookie, 'POST', '/blyg/api/items', { contentMd: 'first working words', kind: 'fragment' })).json;
  const hopper = (await apiJson(cookie, 'POST', '/blyg/api/hoppers', { name: 'Lens drafts' })).json.id as string;
  expect((await apiJson(cookie, 'PUT', `/blyg/api/hoppers/${hopper}/items/~own/${draft.id}`)).status).toBe(200);
  const path = `${BASE}/blyg/api/reading?hopper=${hopper}&limit=50`;
  const first = await SELF.fetch(path, { headers: { cookie } });
  expect(await first.text()).toContain('first working words');
  const etag = first.headers.get('etag');
  expect(etag).toBeTruthy();
  expect((await apiJson(cookie, 'PATCH', `/blyg/api/items/${draft.id}`, { contentMd: 'second working words' })).status).toBe(200);
  const again = await SELF.fetch(path, { headers: { cookie, 'If-None-Match': etag! } });
  expect(again.status).toBe(200);
  expect(await again.text()).toContain('second working words');
});

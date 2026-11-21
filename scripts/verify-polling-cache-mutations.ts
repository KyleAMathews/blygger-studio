/** Preserve the historical feed controls and transfer the three obsolete
 * revision-client controls to ETag/body pairing, validators and failed-body
 * acceptance. Every control is judged by a registered oracle law, with native
 * seed/path/unit replay for the generated feed and Studio controls. */
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyOracleMutation } from './oracle-mutation-control.ts';
const root = resolve('.'), temp = mkdtempSync(join(tmpdir(), 'blygger-polling-controls-'));
const controls = [
  { name: 'old feed overwrite', file: 'src/feed-cache.ts', from: "onlyIf: new Headers(current ? { 'If-Match': current.httpEtag } : { 'If-None-Match': '*' }),", to: '', test: 'test/polling-cache.oracle.test.ts', pattern: 'old builders cannot overwrite', checkpoint: 'feed response', law: 'feed publication' },
  { name: 'body-only ETag ABA', file: 'src/feed-cache.ts', from: 'const body = stamp(xml, target);', to: 'const body = xml;', test: 'test/polling-cache.oracle.test.ts', pattern: 'old builders cannot overwrite', checkpoint: 'feed generation bytes', law: 'feed publication' },
  { name: 'mixed feed read', file: 'src/feed-cache.ts', from: 'if (!same(target, await readFeedRevision(env.DB))) continue;', to: 'await readFeedRevision(env.DB);', test: 'test/polling-cache.oracle.test.ts', pattern: 'discards a render interrupted', checkpoint: 'feed response', law: 'feed publication' },
  { name: '304 skips check', file: 'src/feed-cache.ts', from: 'waitUntil(revalidate(request, env, mount, key, artifact)', to: "if (!request.headers.has('If-None-Match')) waitUntil(revalidate(request, env, mount, key, artifact)", test: 'test/polling-cache.oracle.test.ts', pattern: 'serves saved legal XML', checkpoint: 'feed counted work', law: 'feed publication' },
  { name: 'HEAD skips feed check', file: 'src/feed-cache.ts', from: 'waitUntil(revalidate(request, env, mount, key, artifact)', to: "if (request.method !== 'HEAD') waitUntil(revalidate(request, env, mount, key, artifact)", test: 'test/polling-cache.oracle.test.ts', pattern: 'serves saved legal XML', checkpoint: 'feed counted work', law: 'feed publication' },
  { name: 'unchanged token skips changed feed', file: 'src/feed-cache.ts', from: '=> artifact?.generation?.epoch === target.epoch && artifact.generation.revision >= target.revision;', to: '=> !!artifact;', test: 'test/polling-cache.oracle.test.ts', pattern: 'fixed seed 20261001: generated', checkpoint: 'feed settled values', law: 'feed settled values', replay: true },
  { name: 'conditional response loses body pairing', file: 'sdk/conditional-reads.ts', from: 'accept(key, flight, ticket, { etag, text, headers: [...response.headers] });', to: 'accept(key, flight, ticket, { etag, text: cached?.text ?? text, headers: [...response.headers] });', test: 'test-ui/polling-cache.oracle.test.ts', pattern: 'studio-polling-values.*generated', checkpoint: 'poll', law: 'accepted response' },
  { name: 'Studio cache sends a different validator', file: 'sdk/conditional-reads.ts', from: "headers.set('If-None-Match', cached.etag);", to: "headers.set('If-None-Match', cached.etag + '-wrong');", test: 'test-ui/polling-cache.oracle.test.ts', pattern: 'studio-polling-work.*generated', checkpoint: 'poll', law: 'poll work', replay: true, property: 'studio-polling-work' },
  { name: 'failed Studio body advances validator', file: 'sdk/conditional-reads.ts', from: 'schema.parse(JSON.parse(text));', to: "accept(key, flight, ticket, { etag: response.headers.get('etag'), text, headers: [...response.headers] }); schema.parse(JSON.parse(text));", test: 'test-ui/polling-cache.oracle.test.ts', pattern: 'studio-polling-values.*generated', checkpoint: 'poll', law: 'accepted response' },
] as const;
const selector = process.argv[2];
const selected = selector ? controls.filter(control => control.name.includes(selector)) : controls;
assert.ok(selected.length, 'No polling mutation matches the requested name');
let primary: unknown;
try {
  for (const path of ['src', 'test', 'test-ui', 'test-oracles', 'migrations', 'extensions', 'sdk', 'build', 'package.json', 'package-lock.json', 'models.json', 'openapi.json', 'wrangler.jsonc', 'vitest.config.ts', 'vitest.ui.config.ts', 'vitest.oracles.config.ts', 'vitest.worker-oracles.config.ts', 'tsconfig.json', 'tsconfig.ui.json']) cpSync(join(root, path), join(temp, path), { recursive: true });
  mkdirSync(join(temp, 'scripts'));
  for (const path of ['reset-change-epoch.sql', 'oracles-cloudflare.ts']) cpSync(join(root, 'scripts', path), join(temp, 'scripts', path));
  symlinkSync(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir');
  for (const control of selected) {
    const property = 'property' in control ? control.property : 'polling-cache';
    verifyOracleMutation(root, temp, { name: control.name, test: control.test, pattern: control.pattern, checkpoint: control.checkpoint, law: control.law,
      changes: [{ file: control.file, from: control.from, to: control.to }],
      ...('replay' in control ? { replay: { seed: 20261001, property } } : {}),
    }, `polling-mutation-${controls.indexOf(control)}`);
  }
} catch (error) { primary = error; throw error; }
finally {
  try { rmSync(temp, { recursive: true, force: true }); }
  catch (cleanup) { if (primary) throw new AggregateError([primary, cleanup], 'Oracle mutation failure and cleanup failure', { cause: primary }); throw cleanup; }
}

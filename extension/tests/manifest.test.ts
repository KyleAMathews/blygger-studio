// The manifest is a security boundary: these permissions and no host access
// (spec §8). The pinned key fixes the extension ID, and so the OAuth redirect.
import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import config from '../wxt.config.ts';
import { EXTENSION_ID, PUBLIC_KEY } from '../lib/identity.ts';

test('the manifest asks for exactly the spec permissions and no host access', () => {
  const manifest = config.manifest as Record<string, unknown>;
  expect(manifest.permissions).toEqual(['contextMenus', 'sidePanel', 'activeTab', 'scripting', 'identity', 'storage', 'alarms']);
  expect(manifest.host_permissions, 'no host permissions').toBeUndefined();
  expect(manifest.minimum_chrome_version).toBe('116');
  expect(manifest.key).toBe(PUBLIC_KEY);
});

test('the pinned key yields the recorded extension ID', () => {
  const hex = createHash('sha256').update(Buffer.from(PUBLIC_KEY, 'base64')).digest('hex').slice(0, 32);
  expect([...hex].map((d) => String.fromCharCode(97 + parseInt(d, 16))).join('')).toBe(EXTENSION_ID);
});

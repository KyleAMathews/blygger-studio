import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { BACKUP_TABLES, CREDENTIAL_TABLES, excludedTable } from '../src/backup-format.ts';

// Every table a migration creates is either backed up or named as left out,
// so adding a content table means deciding, not forgetting (src/backup.ts).
test('every migration table is backed up or deliberately left out', () => {
  const dir = path.join(import.meta.dirname, '..', 'migrations');
  const created = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    for (const m of readFileSync(path.join(dir, file), 'utf8').matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"?([A-Za-z_]+)/g)) created.add(m[1]);
  }
  const undecided = [...created].filter((t) => !BACKUP_TABLES.has(t) && !CREDENTIAL_TABLES.has(t));
  expect(undecided).toEqual([]);
  for (const t of BACKUP_TABLES) expect(CREDENTIAL_TABLES.has(t)).toBe(false);
});

test('auth-library tables made at runtime stay out', () => {
  for (const t of ['jwks', 'session', 'user', 'account', 'verification', 'rateLimit', 'oauthAccessToken', 'oauthRefreshToken', 'oauthClient', 'oauthConsent', '_cf_KV', 'd1_migrations', 'sqlite_sequence'])
    expect(excludedTable(t)).toBe(true);
  expect(excludedTable('items')).toBe(false);
});

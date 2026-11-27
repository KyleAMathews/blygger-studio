import { applyD1Migrations, env } from 'cloudflare:test';
import { expect, it } from 'vitest';

// Migration 0065's backfill runs on a node's existing rows, never on the suite's
// empty database, so a backfill that matched nothing passed every other test (the
// mutant review of #178). Recreate the pre-0065 items table, then apply 0065 to it.
it('0065 carries marks from provenance over to private_taint, and marks nothing else', async () => {
  await env.DB.prepare('DROP TRIGGER agentic_draft_follows_hidden').run();
  await env.DB.prepare('DROP TRIGGER change_items_update').run();
  await env.DB.prepare('ALTER TABLE items DROP COLUMN private_taint').run();
  const at = '2026-11-20T00:00:00Z';
  const drawn = (isPrivate: boolean) => JSON.stringify([{ sources: [{ id: 'source', version: 1, ...(isPrivate ? { private: true } : {}) }], model: 'm', at }]);
  const fixtures: Array<{ id: string; status: string; provenance: string | null; expected: number }> = [
    { id: 'tainted-draft', status: 'draft', provenance: drawn(true), expected: 1 },
    { id: 'tainted-public', status: 'public', provenance: drawn(true), expected: 1 },
    { id: 'clean-provenance', status: 'draft', provenance: drawn(false), expected: 0 },
    { id: 'no-provenance', status: 'public', provenance: null, expected: 0 },
  ];
  for (const f of fixtures) {
    await env.DB.prepare('INSERT INTO items (id,kind,status,created,updated,version,content_md,tk_provenance_json) VALUES (?,?,?,?,?,?,?,?)')
      .bind(f.id, 'fragment', f.status, at, at, f.status === 'draft' ? 0 : 1, 'working copy', f.provenance).run();
  }
  const migration = env.TEST_MIGRATIONS.find(m => m.name.startsWith('0065'))!;
  await applyD1Migrations(env.DB, [{ ...migration, name: 'fixture-private-taint-0065' }]);
  const marks = Object.fromEntries((await env.DB.prepare('SELECT id, private_taint FROM items').all<{ id: string; private_taint: number }>()).results.map(r => [r.id, r.private_taint]));
  for (const f of fixtures) expect(marks[f.id], f.id).toBe(f.expected);
});

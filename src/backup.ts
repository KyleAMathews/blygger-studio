// Full backup (ROADMAP row 15): the whole blyg as one tar, streamed to the
// owner's browser from {studio}/backup. Restore into a fresh node is row 53;
// this format is written so that it can be read back without guessing.
//
//   blyg-backup/README.txt           what this is, in words
//   blyg-backup/tables/<t>/NNNN.jsonl one D1 row per line, pages of PAGE_ROWS
//   blyg-backup/media/<r2 key>       every R2 object except the feed cache
//   blyg-backup/backup.json          manifest, written last, with counts and
//                                    `complete: true`
//
// Plain tar, not gzip: media is most of the bytes and already compressed,
// and gzip would spend the Worker's CPU on it for nothing. Tables are paged
// into files so no table is ever held whole in memory. A failure mid-stream
// aborts the download rather than ending it cleanly, so a truncated archive
// never looks finished; backup.json's absence says the same thing.
//
// Tables are copied by allow-list, BACKUP_TABLES. The auth library creates its
// own tables at runtime (session, jwks, oauthAccessToken, user and kin), none
// in migrations/, and a deny-list missed every one of them on a live node
// (session 71). Left out, then: those, the older oauth_ and security_ tables
// (grants, tokens, signing keys, rate-limit budgets), wrangler's migration
// ledger and anything not named here. A restored node mints its own
// credentials; the owner password is a Worker secret and was never in D1.
// test-ui/backup-tables.test.ts makes every migration's table choose a side,
// so a new content table cannot drop out of backups unnoticed. The latest
// applied migration is recorded, so a restore knows the rows' schema.

import { CLIENT } from './client.ts';
import type { Env } from './types.ts';
import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION, backupFileName, excludedTable, type BackupManifest, type TableCount } from './backup-format.ts';

export { BACKUP_TABLES, CREDENTIAL_TABLES, backupFileName, excludedTable } from './backup-format.ts';

const ROOT = 'blyg-backup/';
const PAGE_ROWS = 500;
/** R2 keys under this prefix are the feed cache (feed-cache.ts): derived, rebuilt on demand. */
const SKIPPED_R2_PREFIX = '__cache/';

const encoder = new TextEncoder();

function field(block: Uint8Array, offset: number, length: number, value: string) {
  block.set(encoder.encode(value).subarray(0, length), offset);
}
function octal(value: number, digits: number): string {
  return value.toString(8).padStart(digits, '0');
}

/**
 * One ustar header. Names over 100 bytes are split at a slash into the
 * 155-byte prefix field; anything longer than that cannot be written and is
 * refused rather than truncated.
 */
export function tarHeader(path: string, size: number, mtime: Date): Uint8Array {
  const block = new Uint8Array(512);
  let name = path, prefix = '';
  if (encoder.encode(path).length > 100) {
    const bytes = encoder.encode(path);
    let cut = -1;
    for (let i = path.length - 1; i > 0; i--) {
      if (path[i] !== '/') continue;
      const head = encoder.encode(path.slice(0, i)).length;
      if (head <= 155 && bytes.length - head - 1 <= 100) { cut = i; break; }
    }
    if (cut < 0) throw new Error(`backup: path too long for tar: ${path}`);
    prefix = path.slice(0, cut);
    name = path.slice(cut + 1);
  }
  field(block, 0, 100, name);
  field(block, 100, 8, '0000644\0');
  field(block, 108, 8, '0000000\0');
  field(block, 116, 8, '0000000\0');
  field(block, 124, 12, octal(size, 11) + '\0');
  field(block, 136, 12, octal(Math.floor(mtime.getTime() / 1000), 11) + '\0');
  field(block, 148, 8, '        ');
  field(block, 156, 1, '0');
  field(block, 257, 8, 'ustar\u000000');
  field(block, 345, 155, prefix);
  let sum = 0;
  for (const byte of block) sum += byte;
  field(block, 148, 8, octal(sum, 6) + '\0 ');
  return block;
}

const padding = (size: number) => new Uint8Array((512 - (size % 512)) % 512);

/**
 * Stream the archive. The caller has already checked the owner session; this
 * only reads. `keepAlive` is the request's waitUntil, so the producer is not
 * cut off between the response starting and the last byte.
 */
export function backupResponse(env: Env, origin: string, mount: string, keepAlive: (work: Promise<unknown>) => void, now = new Date()): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const write = (bytes: Uint8Array) => writer.write(bytes);
  const file = async (path: string, bytes: Uint8Array) => {
    await write(tarHeader(ROOT + path, bytes.length, now));
    await write(bytes);
    await write(padding(bytes.length));
  };

  const produce = async () => {
    await file('README.txt', encoder.encode(
      `A full backup of the blyg at ${origin}, made by ${CLIENT.name} ${CLIENT.version} on ${now.toISOString()}.\n\n` +
      `tables/ holds every database table as JSON lines, one row per line, in pages.\n` +
      `media/ holds every uploaded file under its storage key.\n` +
      `backup.json lists what is here. If it is missing, the backup did not finish.\n\n` +
      `Credentials are not included: OAuth grants and tokens, signing keys and rate-limit\n` +
      `budgets stay on the node. The owner password is a Worker secret and never was in it.\n`,
    ));

    const listed = await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`).all<{ name: string }>();
    const names = listed.results.map((row) => row.name);
    const tables: Record<string, TableCount> = {};
    for (const table of names.filter((name) => !excludedTable(name))) {
      const count: TableCount = { rows: 0, files: 0 };
      // Paged by rowid, so a page boundary never repeats or skips a row.
      let after = Number.MIN_SAFE_INTEGER;
      for (;;) {
        const page = await env.DB.prepare(`SELECT rowid AS "__backup_rowid", * FROM "${table.replace(/"/g, '""')}" WHERE rowid > ? ORDER BY rowid LIMIT ?`)
          .bind(after, PAGE_ROWS).all<Record<string, unknown>>();
        const rows = page.results;
        if (!rows.length) break;
        after = Number(rows[rows.length - 1].__backup_rowid);
        const lines = rows.map(({ __backup_rowid: _rowid, ...row }) => JSON.stringify(row)).join('\n') + '\n';
        count.files += 1;
        count.rows += rows.length;
        await file(`tables/${table}/${String(count.files).padStart(4, '0')}.jsonl`, encoder.encode(lines));
        if (rows.length < PAGE_ROWS) break;
      }
      tables[table] = count;
    }

    let migration: string | null = null;
    try {
      migration = (await env.DB.prepare(`SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 1`).first<{ name: string }>())?.name ?? null;
    } catch {
      // A node set up without wrangler's ledger; the table list still says what is here.
    }

    const media = { objects: 0, bytes: 0 };
    let cursor: string | undefined;
    do {
      const listing = await env.MEDIA.list({ cursor });
      for (const entry of listing.objects) {
        if (entry.key.startsWith(SKIPPED_R2_PREFIX)) continue;
        const object = await env.MEDIA.get(entry.key);
        if (!object) continue; // deleted between the listing and the read
        await write(tarHeader(`${ROOT}media/${entry.key}`, object.size, object.uploaded));
        let sent = 0;
        const reader = object.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          sent += value.length;
          await write(value);
        }
        if (sent !== object.size) throw new Error(`backup: ${entry.key} read ${sent} of ${object.size} bytes`);
        await write(padding(object.size));
        media.objects += 1;
        media.bytes += object.size;
      }
      cursor = listing.truncated ? listing.cursor : undefined;
    } while (cursor);

    const manifest: BackupManifest = {
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      client: CLIENT.name,
      clientVersion: CLIENT.version,
      createdAt: now.toISOString(),
      origin,
      mount,
      migration,
      tables,
      excludedTables: names.filter(excludedTable),
      media,
      complete: true,
    };
    await file('backup.json', encoder.encode(JSON.stringify(manifest, null, 2) + '\n'));
    await write(new Uint8Array(1024));
    await writer.close();
  };
  keepAlive(produce().catch((error) => writer.abort(error)));

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-tar',
      'Content-Disposition': `attachment; filename="${backupFileName(origin, mount, now)}"`,
      'Cache-Control': 'no-store',
    },
  });
}

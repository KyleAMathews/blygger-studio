// Full backup from the operator's machine (ROADMAP row 15):
//
//   npm run backup -- --base https://example.com/blyg/ [--env NAME] [--config FILE] [--out DIR]
//
// The same archive as the studio's More → download backup (src/backup.ts),
// for blygs too large for that one: the button runs inside a single Worker
// request, which has a cap on storage reads, so a node with very many files
// can stop partway. This script never goes through the Worker. It reads D1
// with `wrangler d1 execute --remote` a page at a time and fetches each file
// with `wrangler r2 object get --remote`, one request each, retrying on
// failure. The only limit it meets is Cloudflare's API rate limit, which a
// paced, one-at-a-time walk stays under; a large blyg just takes longer.
//
// Uses your `wrangler login` session and the deployment's wrangler config
// (wrangler.private.jsonc if present, else wrangler.jsonc). Writes
// DIR/blyg-backup-<host>-<mount>-<date>.tar (DIR defaults to backups/).

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION, backupFileName, excludedTable, type BackupManifest } from "../src/backup-format.ts";
import { CLIENT } from "../src/client.ts";
import { envArgs, stripJsonComments } from "./deploy-lib.ts";

const PAGE_ROWS = 500;
const TRIES = 4;

const root = path.join(import.meta.dirname, "..");
function option(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 || i + 1 >= process.argv.length ? undefined : process.argv[i + 1];
}
function die(message: string): never {
  console.error(`\n✘ ${message}`);
  process.exit(1);
}

const baseArg = option("base") ?? die("usage: npm run backup -- --base https://host/mount/ [--env NAME] [--config FILE] [--out DIR]");
const base = new URL(baseArg.endsWith("/") ? baseArg : baseArg + "/");
const mount = base.pathname.replace(/\/$/, "");
const env = option("env") ?? "";
const configFile = option("config") ?? (existsSync(path.join(root, "wrangler.private.jsonc")) ? "wrangler.private.jsonc" : "wrangler.jsonc");
const outDir = path.resolve(option("out") ?? "backups");

// The bucket name is not something wrangler resolves from a binding for r2
// commands, so read it from the same config the deploy uses.
const config = JSON.parse(stripJsonComments(readFileSync(path.join(root, configFile), "utf8"))) as {
  r2_buckets?: { binding: string; bucket_name: string }[];
  env?: Record<string, { r2_buckets?: { binding: string; bucket_name: string }[] }>;
};
const buckets = (env ? config.env?.[env]?.r2_buckets : undefined) ?? config.r2_buckets;
const bucket = buckets?.find((b) => b.binding === "MEDIA")?.bucket_name ?? die(`no MEDIA bucket in ${configFile}${env ? ` (env ${env})` : ""}`);

const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function wrangler(args: string[]): string {
  for (let attempt = 1; ; attempt++) {
    const result = spawnSync("npx", ["wrangler", ...args, "--config", configFile, ...envArgs(env)], {
      cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 * 1024,
    });
    if (result.status === 0) return result.stdout;
    if (attempt >= TRIES) die(`wrangler ${args.slice(0, 3).join(" ")} failed:\n${result.stderr || result.stdout}`);
    // Rate limits and network blips: back off and try the same request again.
    sleep(2000 * 2 ** attempt);
  }
}
function query<T>(sql: string): T[] {
  const out = JSON.parse(wrangler(["d1", "execute", "DB", "--remote", "--json", "--command", sql])) as { results: T[] }[];
  return out[0]?.results ?? [];
}

const now = new Date();
const name = backupFileName(base.href, mount, now);
const staging = path.join(outDir, name.replace(/\.tar$/, ""));
const archiveRoot = path.join(staging, "blyg-backup");
rmSync(staging, { recursive: true, force: true });
mkdirSync(archiveRoot, { recursive: true });
const write = (rel: string, data: string | Uint8Array) => {
  const file = path.join(archiveRoot, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, data);
};

console.log(`Backing up ${base.href} (D1 binding DB, R2 bucket ${bucket}) with ${configFile}${env ? ` --env ${env}` : ""}`);
write("README.txt",
  `A full backup of the blyg at ${base.href}, made by ${CLIENT.name} ${CLIENT.version} (npm run backup) on ${now.toISOString()}.\n\n` +
  `tables/ holds every database table as JSON lines, one row per line, in pages.\n` +
  `media/ holds every uploaded file under its storage key.\n` +
  `backup.json lists what is here. If it is missing, the backup did not finish.\n\n` +
  `Credentials are not included: OAuth grants and tokens, signing keys and rate-limit\n` +
  `budgets stay on the node. The owner password is a Worker secret and never was in it.\n`);

const names = query<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`).map((r) => r.name);
const tables: BackupManifest["tables"] = {};
for (const table of names.filter((n) => !excludedTable(n))) {
  const count = { rows: 0, files: 0 };
  let after = Number.MIN_SAFE_INTEGER;
  for (;;) {
    const rows = query<Record<string, unknown>>(
      `SELECT rowid AS "__backup_rowid", * FROM "${table.replace(/"/g, '""')}" WHERE rowid > ${after} ORDER BY rowid LIMIT ${PAGE_ROWS}`,
    );
    if (!rows.length) break;
    after = Number(rows[rows.length - 1].__backup_rowid);
    count.files += 1;
    count.rows += rows.length;
    write(`tables/${table}/${String(count.files).padStart(4, "0")}.jsonl`,
      rows.map(({ __backup_rowid: _rowid, ...row }) => JSON.stringify(row)).join("\n") + "\n");
    if (rows.length < PAGE_ROWS) break;
  }
  tables[table] = count;
  console.log(`  ${table}: ${count.rows} rows`);
}

let migration: string | null = null;
try {
  migration = query<{ name: string }>(`SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 1`)[0]?.name ?? null;
} catch {
  // No wrangler ledger on this database; the table list still says what is here.
}

// Every file the studio stored is a media row; the feed cache is not, and is rebuilt on demand.
const keys = query<{ r2_key: string }>(`SELECT DISTINCT r2_key FROM media ORDER BY r2_key`).map((r) => r.r2_key);
const media = { objects: 0, bytes: 0 };
for (const [i, key] of keys.entries()) {
  const file = path.join(archiveRoot, "media", key);
  mkdirSync(path.dirname(file), { recursive: true });
  wrangler(["r2", "object", "get", `${bucket}/${key}`, "--remote", "--file", file]);
  media.objects += 1;
  media.bytes += readFileSync(file).length;
  if ((i + 1) % 25 === 0 || i + 1 === keys.length) console.log(`  media: ${i + 1} of ${keys.length}`);
}

const manifest: BackupManifest = {
  format: BACKUP_FORMAT,
  formatVersion: BACKUP_FORMAT_VERSION,
  client: CLIENT.name,
  clientVersion: CLIENT.version,
  createdAt: now.toISOString(),
  origin: base.href,
  mount,
  migration,
  tables,
  excludedTables: names.filter(excludedTable),
  media,
  complete: true,
};
write("backup.json", JSON.stringify(manifest, null, 2) + "\n");

const archive = path.join(outDir, name);
const tar = spawnSync("tar", ["-cf", archive, "-C", staging, "blyg-backup"], { stdio: "inherit" });
if (tar.status !== 0) die(`tar failed; the unpacked backup is in ${staging}`);
rmSync(staging, { recursive: true, force: true });
console.log(`\n✔ ${archive}: ${Object.values(tables).reduce((n, t) => n + t.rows, 0)} rows, ${media.objects} files (${(media.bytes / 1e6).toFixed(1)} MB)`);

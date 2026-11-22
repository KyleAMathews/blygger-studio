/** Migration receiving seams use the actual parsed D1 migration statements. */
import { env } from 'cloudflare:test';
const migrations = () => env.TEST_MIGRATIONS as {name: string; queries: string[]}[];

export async function applyReaderWorkMigration(database: D1Database, keep: (sql: string) => boolean = () => true) {
  const migration = migrations().find(entry => entry.name.startsWith('0058'))!;
  await database.batch(migration.queries.filter(keep).map(sql => database.prepare(sql)));
}

/** Restore a predecessor's real trigger before exercising a carried cursor. */
export async function installPreviousReaderTrigger(database: D1Database, name: string) {
  const query = migrations().filter(entry => Number.parseInt(entry.name, 10) < 58)
    .flatMap(entry => entry.queries).reverse().find(sql => sql.includes(`CREATE TRIGGER ${name}\n`));
  if (!query) throw new Error(`Missing predecessor trigger ${name}`);
  await database.batch([database.prepare(`DROP TRIGGER ${name}`), database.prepare(query)]);
}

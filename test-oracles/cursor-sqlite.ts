/** Native SQLite supplies actual cursor SQL semantics; this adapter only maps
 * synchronous statements to the D1 methods cursorPage and readChanges consume.
 */
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { CHANGE_DOMAINS, type ChangeDomain } from '../src/change-state.ts';

export function cursorSqlite(table: string, columns: readonly string[], rows: readonly (readonly SQLInputValue[])[], epoch = 'codec-epoch') {
  const sqlite = new DatabaseSync(':memory:');
  const queries: string[] = [];
  const reads: { sql: string; binds: SQLInputValue[] }[] = [];
  try {
    sqlite.exec(`CREATE TABLE change_state(id INTEGER PRIMARY KEY,epoch TEXT,${CHANGE_DOMAINS.map(domain => `${domain} INTEGER`).join(',')});
      CREATE TABLE ${table}(${columns.map(name => `"${name}"`).join(',')});`);
    sqlite.prepare(`INSERT INTO change_state VALUES(${Array.from({ length: CHANGE_DOMAINS.length + 2 }, () => '?').join(',')})`).run(1, epoch, ...CHANGE_DOMAINS.map(() => 0));
    const insert = sqlite.prepare(`INSERT INTO ${table} VALUES(${columns.map(() => '?').join(',')})`);
    for (const row of rows) insert.run(...row);
  } catch (error) { sqlite.close(); throw error; }
  const db = { prepare(sql: string) {
    queries.push(sql);
    const statement = sqlite.prepare(sql);
    let values: SQLInputValue[] = [];
    return {
      bind(...input: SQLInputValue[]) { values = input; return this; },
      async first() { const row = statement.get(...values); return row ? { ...row } : null; },
      async all() { reads.push({ sql, binds: [...values] }); return { results: statement.all(...values).map(row => ({ ...row })) }; },
    };
  } } as unknown as D1Database;
  return { db, queries, reads, close: () => sqlite.close(),
    explain(sql: string, ...values: SQLInputValue[]) { return sqlite.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...values).map(row => String(row.detail)); },
    execute(sql: string, ...values: SQLInputValue[]) { sqlite.prepare(sql).run(...values); },
    change(domain: ChangeDomain) { sqlite.exec(`UPDATE change_state SET ${domain}=${domain}+1`); },
    epoch(value: string) { sqlite.prepare('UPDATE change_state SET epoch=?').run(value); },
  };
}

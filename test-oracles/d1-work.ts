/** Native D1 work observations, including first/raw calls that hide result metadata.
 * Delegating them through all preserves exercised results and exposes native
 * rows_read/rows_written; no SQL text classifier decides what work counts.
 * Empty raw({ columnNames: true }) headers are outside this meter's scope.
 */
export function measureD1(database: D1Database) {
  const totals = { calls: 0, returned: 0, written: 0, read: 0 };
  const originals = new WeakMap<D1PreparedStatement, D1PreparedStatement>();
  function result(value: D1Result) {
    totals.returned += value.results.length;
    totals.written += value.meta.rows_written;
    totals.read += value.meta.rows_read;
  }
  function statement(target: D1PreparedStatement): D1PreparedStatement {
    const wrapped = new Proxy(target, {
      get(value, key) {
        if (key === 'bind') return (...args: unknown[]) => statement(value.bind(...args));
        if (key === 'all' || key === 'run') return async () => {
          totals.calls++;
          const answer = await value[key]();
          result(answer);
          return answer;
        };
        if (key === 'first') return async (...args: [column?: string]) => {
          totals.calls++;
          const answer = await value.all<Record<string, unknown>>();
          result(answer);
          const row = answer.results[0];
          return args[0] === undefined ? row ?? null : row?.[args[0]] ?? null;
        };
        if (key === 'raw') return async (...args: Parameters<D1PreparedStatement['raw']>) => {
          totals.calls++;
          const answer = await value.all<Record<string, unknown>>();
          result(answer);
          const columns = Object.keys(answer.results[0] ?? {});
          const rows = answer.results.map(row => columns.map(column => row[column]));
          return args[0]?.columnNames ? [columns, ...rows] : rows;
        };
        const method = Reflect.get(value, key);
        return typeof method === 'function' ? method.bind(value) : method;
      }
    });
    originals.set(wrapped, target);
    return wrapped;
  }
  const db = new Proxy(database, {
    get(target, key) {
      if (key === 'exec') return async (sql: string) => {
        // exec omits D1 row metadata. SQLite's connection change count still
        // exposes writes, including writes made by triggers, on local D1.
        const before = await database.prepare('SELECT total_changes() AS n').first<number>('n');
        const answer = await target.exec(sql);
        const after = await database.prepare('SELECT total_changes() AS n').first<number>('n');
        totals.calls += answer.count;
        totals.written += (after ?? 0) - (before ?? 0);
        return answer;
      };
      if (key === 'prepare') return (sql: string) => statement(target.prepare(sql));
      if (key === 'batch') return async (statements: D1PreparedStatement[]) => {
        totals.calls++;
        const answers = await target.batch(statements.map(s => originals.get(s) ?? s));
        answers.forEach(result);
        return answers;
      };
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
  return {
    db,
    totals,
    reset() {
      totals.calls = totals.returned = totals.written = totals.read = 0;
    }
  };
}

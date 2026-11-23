/** Derived reader positions; the ranking algorithm lives in reader-order.ts. */
import { loadReaderHistory, readerPositions } from './reader-order.ts';

/**
 * Make `reading_order` current at the ranking inputs counter (migration 0056).
 * Reading's broader revision still expires cursors after presentation changes,
 * but those changes need no history reload or position rewrite. Epochs force a
 * rebuild after restore even if the ranking counter has the same value.
 */
export async function ensureReaderOrder(db: D1Database): Promise<void> {
  // Native D1 owns the epoch and monotonically increasing inputs counter.
  // A missing change_state row throws before source loading or any cache writes.
  const state = (await db.prepare(`SELECT c.epoch, COALESCE(r.inputs, 0) AS inputs, r.generation
    FROM change_state c LEFT JOIN reading_order_state r ON r.id = c.id WHERE c.id = 1`)
    .first<{ epoch: string; inputs: number; generation: string | null }>())!;
  const generation = JSON.stringify([state.epoch, state.inputs]);
  if (state.generation === generation) return;
  const { items, identities } = await loadReaderHistory(db);
  const rows = readerPositions(items).flatMap((key, position) => {
    const identity = identities.get(key);
    return identity ? [[identity.source, identity.sub, identity.id, position]] : [];
  });
  // Every mutation shares this guard inside the atomic batch. An older
  // builder must not overwrite newer positions after another reader prepares.
  const current = `EXISTS (SELECT 1 FROM change_state c
    LEFT JOIN reading_order_state r ON r.id = c.id
    WHERE c.id = 1 AND c.epoch = ? AND COALESCE(r.inputs, 0) = ?)`;
  const publish = (sql: string, ...values: unknown[]) =>
    db.prepare(sql).bind(...values, state.epoch, state.inputs);
  const insert = (chunk: unknown[][]) =>
    publish(`INSERT INTO reading_order (source, sub, id, position)
      SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]') FROM json_each(?)
      WHERE ${current}`, JSON.stringify(chunk));
  const chunks = Array.from({ length: Math.ceil(rows.length / 500) }, (_, index) => rows.slice(index * 500, (index + 1) * 500));
  await db.batch([
    publish(`DELETE FROM reading_order WHERE ${current}`),
    ...chunks.map(insert),
    publish(`INSERT INTO reading_order_state (id, generation) SELECT 1, ? WHERE ${current}
      ON CONFLICT (id) DO UPDATE SET generation = excluded.generation`, generation),
  ]);
}

import { authoredItemKindSql, authoredVersionKind } from './version-state.ts';
import { cursorPage, type CursorQuery } from "./cursor-page.ts";
import { buildReadingFeed, type OwnEntryInput, type ImportedEntryInput } from "./importer/reading.ts";
import { sourceTitleAndUrl } from "./importer/util.ts";
import { sanitizeHtml } from "./importer/sanitize.ts";
import type { ImportedItemRow } from "./types.ts";
import { OWN_SUBSCRIPTION } from "./own-subscription.ts";
import { linkLabel } from "./link-label.ts";
import { BACKGROUND_RULES, entryBackground, importedBackgroundSql, ownBackgroundSql, type BackgroundRule } from "./background.ts";

type Identity = { source: 'own' | 'imported'; id: string; sub: string; at: number | string | null };
/** Foreign dates are normalized before storage. Prefixes extend UTC lexical
 * ordering across JS's signed six-digit years, which SQLite cannot parse. */
function dateOrderSql(column: string) {
  return `CASE WHEN length(${column}) = 23 AND substr(${column}, 1, 1) = '-'
    THEN '0' || printf('%06d', 999999 + CAST(substr(${column}, 1, 7) AS INTEGER)) || substr(${column}, 8)
    WHEN length(${column}) = 23 AND substr(${column}, 1, 1) = '+' THEN '2' || substr(${column}, 2)
    ELSE '1' || strftime('%Y-%m-%dT%H:%M:%SZ', ${column}) END`;
}
/** Background (src/background.ts) is the owner's choice, then the blyg's, then the enabled rules. */
function identitySql(kind: 'thread' | 'fragment' | undefined, background: boolean, rules: readonly BackgroundRule[], hopper?: string, mentioning?: string[], shelf = false) {
  if (shelf) return shelfIdentitySql(hopper);
  const enabled = JSON.stringify(rules);
  const binds = [enabled, ...(kind ? [kind] : []), ...(hopper ? [hopper] : []), enabled, ...(kind ? [kind] : []), ...(mentioning ? [JSON.stringify(mentioning)] : [])];
  const updated = dateOrderSql('ii.updated'), observed = dateOrderSql('ii.observed_at');
  const sql = `SELECT 'own' AS source, i.id, '' AS sub, ${dateOrderSql('i.updated')} AS at
    FROM items i LEFT JOIN versions p ON i.kind = 'withdrawn' AND p.item_id = i.id AND p.version = i.version - 1
    WHERE i.status IN ('public','withdrawn') AND (${ownBackgroundSql()}) = ${background ? 1 : 0}${hopper || mentioning ? ' AND 0' : ''}${kind ? ` AND ${authoredItemKindSql('p')} = ?` : ''}
    UNION ALL SELECT 'imported', ii.remote_id, ii.subscription_id,
      ${hopper ? 'hi.added_at' : `CASE WHEN ${updated} < ${observed} THEN ${updated} ELSE ${observed} END`}
    FROM imported_items ii ${hopper ? 'JOIN hopper_items hi ON hi.subscription_id = ii.subscription_id AND hi.remote_id = ii.remote_id AND hi.hopper_id = ?' : ''}
    WHERE (${importedBackgroundSql()}) = ${background ? 1 : 0}${kind ? ' AND ii.kind = ?' : ''}${mentioning ? ` AND EXISTS (SELECT 1 FROM imported_mentions m
      WHERE m.subscription_id = ii.subscription_id AND m.remote_id = ii.remote_id AND m.target IN (SELECT value FROM json_each(?)))` : ''}`;
  return { sql, binds };
}
/**
 * The Shelf lens (ROADMAP row 115): the shelved entries (src/shelf.ts) in the
 * owner's order, whatever their Background placement, since shelving one is an
 * explicit choice. The shelf's own resolve rule applies: a published own item,
 * an imported one current or with a retained pin. Own drafts are shelved too but
 * are not reading entries; the Write list's shelf shows them. "at" is the
 * negated position, so the page's newest-first order is the shelf's order.
 */
function shelfIdentitySql(hopper?: string) {
  // Inside a hopper, the shelved entries it holds; own items are left out there, as under every lens.
  const sql = `SELECT 'own' AS source, i.id, '' AS sub, -s.position AS at
    FROM shelf s JOIN items i ON s.subscription_id = '${OWN_SUBSCRIPTION}' AND i.id = s.remote_id
    WHERE i.status = 'public'${hopper ? ' AND 0' : ''}
    UNION ALL SELECT 'imported', ii.remote_id, ii.subscription_id, -s.position
    FROM shelf s JOIN imported_items ii ON ii.subscription_id = s.subscription_id AND ii.remote_id = s.remote_id
    ${hopper ? 'JOIN hopper_items hi ON hi.subscription_id = ii.subscription_id AND hi.remote_id = ii.remote_id AND hi.hopper_id = ?' : ''}
    WHERE (ii.state = 'current' OR ii.pinned_version_retained IS NOT NULL)`;
  return { sql, binds: hopper ? [hopper] : [] };
}
/** Counts are a named summary. Page construction never materializes the full identity set. */
export async function readingSummary(db: D1Database, source: string | undefined, kind?: 'thread' | 'fragment', background = false, hopper?: string, mentioning?: string[], rules: readonly BackgroundRule[] = BACKGROUND_RULES, shelf = false) {
  const { sql, binds } = identitySql(kind, background, rules, hopper, mentioning, shelf);
  const [counts, subs] = await Promise.all([
    db.prepare(`SELECT source, sub, COUNT(*) AS total FROM (${sql}) GROUP BY source, sub`).bind(...binds).all<{ source: string; sub: string; total: number }>(),
    db.prepare('SELECT id FROM subscriptions').all<{ id: string }>(),
  ]);
  const result = { all: 0, own: 0, subscriptions: Object.fromEntries(subs.results.map(row => [row.id, 0])) };
  for (const row of counts.results) {
    result.all += row.total;
    if (row.source === 'own') result.own += row.total;
    else result.subscriptions[row.sub] = row.total;
  }
  const selected = source === 'own' || subs.results.some(row => row.id === source) ? source! : 'all';
  return { counts: result, selected };
}
/** Select one bounded keyset of identities before loading or sanitizing bodies. */
export async function readingData(db: D1Database, query: CursorQuery, source: string | undefined, kind?: 'thread' | 'fragment', background = false, hopper?: string, mentioning?: string[], rules: readonly BackgroundRule[] = BACKGROUND_RULES, shelf = false) {
  const selected = source ?? 'all';
  const identities = identitySql(kind, background, rules, hopper, mentioning, shelf);
  return cursorPage(db, { ...query, limit: query.limit ?? 25 }, {
    name: 'reading', filters: [selected, kind ?? null, background, hopper ?? null, mentioning?.join(' ') ?? null, rules.join(' '), shelf], domains: ['reading', 'subscriptions', ...(hopper ? ['hoppers' as const] : []), ...(shelf ? ['shelf' as const] : [])],
    sql: `SELECT * FROM (${identities.sql})${selected === 'all' ? '' : selected === 'own' ? " WHERE source = 'own'" : ' WHERE sub = ? OR NOT EXISTS (SELECT 1 FROM subscriptions WHERE id = ?)'}`,
    binds: [...identities.binds, ...(selected !== 'all' && selected !== 'own' ? [selected, selected] : [])],
    order: [{ column: 'at', direction: 'desc' }, { column: 'source', direction: 'asc' }, { column: 'sub', direction: 'asc' }, { column: 'id', direction: 'asc' }],
    project: (selectedRows: Identity[]) => readingEntries(db, selectedRows, rules),
  });
}
async function readingEntries(db: D1Database, selectedRows: Identity[], rules: readonly BackgroundRule[]) {
  const ownIds = selectedRows.filter((r) => r.source === "own").map((r) => r.id);
  const importedIds = selectedRows.filter((r) => r.source === "imported");
  // Public pages hold at most50 identities. JSON pairs also keep internal calls within D1 bind limits.
  const [ownBodies, importedBodies, placementRows] = await Promise.all([
    ownIds.length ? db.prepare(`SELECT i.id, i.kind, i.updated, i.bg_reasons, i.bg_detail, v.content_html, previous.transclusions AS previous_transclusions, previous.kind AS previous_kind
      FROM items i LEFT JOIN versions v ON v.item_id = i.id AND v.version = i.version
      LEFT JOIN versions previous ON previous.item_id = i.id AND previous.version = i.version - 1
      WHERE i.id IN (${ownIds.map(() => "?").join(",")})`).bind(...ownIds).all<{ id: string; kind: string; updated: string; bg_reasons: string | null; bg_detail: string | null; content_html: string | null; previous_transclusions: string | null; previous_kind: 'fragment' | 'thread' | 'withdrawn' | null }>() : { results: [] },
    // read_state is the owner's own (migration 0026); null means unread.
    importedIds.length ? db.prepare(`SELECT i.*, rs.read_version, s.title AS subscription_title, s.origin, s.background AS sub_background FROM imported_items i JOIN subscriptions s ON s.id = i.subscription_id
      LEFT JOIN read_state rs ON rs.subscription_id = i.subscription_id AND rs.remote_id = i.remote_id
      WHERE (i.subscription_id, i.remote_id) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`)
      .bind(JSON.stringify(importedIds.map(r => [r.sub, r.id]))).all<ImportedItemRow & { read_version: number | null; subscription_title: string; origin: string; sub_background: number; bg_reasons: string | null; bg_detail: string | null }>() : { results: [] },
    db.prepare(`SELECT source, sub, id, placement FROM reading_placement
      WHERE (source, sub, id) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]') FROM json_each(?))`)
      .bind(JSON.stringify(selectedRows.map(r => [r.source, r.sub, r.id]))).all<{ source: string; sub: string; id: string; placement: string }>(),
  ]);
  const placements = new Map(placementRows.results.map((r) => [JSON.stringify([r.source, r.sub, r.id]), r.placement]));
  const placementOf = (source: string, sub: string, id: string) => placements.get(JSON.stringify([source, sub, id])) ?? null;
  const ownById = new Map(ownBodies.results.map((r) => [r.id, r]));
  const importedById = new Map(importedBodies.results.map((r) => [JSON.stringify([r.subscription_id, r.remote_id]), r]));
  const entries = await Promise.all(selectedRows.map(async (identity) => {
    if (identity.source === "own") {
      const item = ownById.get(identity.id);
      if (!item) return null;
      const withdrawn = item.kind === "withdrawn";
      const kind = withdrawn ? authoredVersionKind({ kind: item.previous_kind, transclusions: item.previous_transclusions }, Boolean(item.previous_transclusions)) : item.kind === 'thread' ? 'thread' : 'fragment';
      const input: OwnEntryInput = { id: item.id, kind, withdrawn, updated: item.updated, contentHtml: withdrawn ? "" : await sanitizeHtml(item.content_html ?? "") };
      const background = entryBackground({ withdrawn, reasons: item.bg_reasons, detail: item.bg_detail, placement: placementOf('own', '', item.id), blyg: false }, rules);
      return { ...buildReadingFeed([input], [])[0], key: `own:${item.id}`, background };
    }
    const row = importedById.get(JSON.stringify([identity.sub, identity.id]));
    if (!row) return null;
    const input: ImportedEntryInput = { subscriptionId: row.subscription_id, subscriptionTitle: row.subscription_title || row.origin || row.subscription_id, remoteId: row.remote_id, sourceUrl: sourceTitleAndUrl(row, row.origin).url, kind: row.kind, withdrawn: row.state === "tombstone", l0: row.l0 === 1, updated: row.updated, observedAt: row.observed_at, contentHtml: await sanitizeHtml(row.content_html), pinnedVersionRetained: row.pinned_version_retained, version: row.version, readVersion: row.read_version ?? null };
    const background = entryBackground({ withdrawn: row.state === "tombstone", reasons: row.bg_reasons, detail: row.bg_detail, placement: placementOf('imported', row.subscription_id, row.remote_id), blyg: row.sub_background === 1 }, rules);
    return { ...buildReadingFeed([], [input])[0], key: `imported:${JSON.stringify([row.subscription_id, row.remote_id])}`, background };
  }));
  const shown = entries.filter((e) => e !== null);
  if (!rules.includes("burst")) return shown;
  // A thread's burst, listed on the thread (plan §2, "+N parts"); the parts themselves sit in Background.
  const ownThreads = shown.filter((e) => e.source === "own" && e.kind === "thread" && e.own).map((e) => e.own!.id);
  const importedThreads = shown.filter((e) => e.source === "imported" && e.kind === "thread" && e.imported).map((e) => [e.imported!.subscriptionId, e.imported!.remoteId]);
  if (!ownThreads.length && !importedThreads.length) return shown;
  const isBurst = (column: string) => `EXISTS (SELECT 1 FROM json_each(COALESCE(${column}, '[]')) WHERE value = 'burst')`;
  const [ownParts, importedParts] = await Promise.all([
    ownThreads.length ? db.prepare(`SELECT i.id, i.kind, json_extract(i.bg_detail, '$.thread') AS thread, v.content_html FROM items i
      LEFT JOIN versions v ON v.item_id = i.id AND v.version = i.version
      WHERE i.status = 'public' AND ${isBurst("i.bg_reasons")} AND json_extract(i.bg_detail, '$.thread') IN (SELECT value FROM json_each(?))
      ORDER BY i.created`).bind(JSON.stringify(ownThreads)).all<{ id: string; kind: string; thread: string; content_html: string | null }>() : { results: [] },
    importedThreads.length ? db.prepare(`SELECT subscription_id, remote_id, kind, json_extract(bg_detail, '$.thread') AS thread, content_html FROM imported_items
      WHERE state = 'current' AND ${isBurst("bg_reasons")}
        AND (subscription_id, json_extract(bg_detail, '$.thread')) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))
      ORDER BY created`).bind(JSON.stringify(importedThreads)).all<{ subscription_id: string; remote_id: string; kind: string; thread: string; content_html: string }>() : { results: [] },
  ]);
  return shown.map((e) => {
    const parts = e.source === "own" && e.own
      ? ownParts.results.filter((p) => p.thread === e.own!.id).map((p) => ({ sub: OWN_SUBSCRIPTION, id: p.id, label: linkLabel(p.content_html ?? "", p.kind) }))
      : e.imported
        ? importedParts.results.filter((p) => p.subscription_id === e.imported!.subscriptionId && p.thread === e.imported!.remoteId).map((p) => ({ sub: p.subscription_id, id: p.remote_id, label: linkLabel(p.content_html, p.kind) }))
        : [];
    return parts.length ? { ...e, parts } : e;
  });
}

/*
 * The Agentic feed's edition (blygger-spec docs/agentic-feed-plan.md): the one
 * document an assistant writes and the Agentic feed tab renders, a digest of
 * sections that refer to entries the reader already holds. The assistant
 * chooses and words; it never supplies anyone's content, so a reference that
 * does not resolve simply drops out. Studio-private (migration 0052).
 *
 * Two modes (Venkat, session 77): `sections`, a laid-out edition, or `scores`,
 * per-entry scores the Studio lays out as one section, highest first.
 */
import { OWN_SUBSCRIPTION } from "./own-subscription.ts";
import { enabledRules } from "./background.ts";
import { getSettings } from "./model.ts";
import { readingEntries, type Identity } from "./reading-data.ts";
import { editionMarkdown, writeEditionDraft } from "./agentic-thread.ts";
import { formatDateIn } from "./dates.ts";

import { AGENTIC_PRESENTS, AGENTIC_SECTION_KINDS } from "./agentic-limits.ts";
/** How many scored entries the Studio lays out. */
export const SCORED_SHOWN = 50;

type Present = (typeof AGENTIC_PRESENTS)[number];
type SectionKind = (typeof AGENTIC_SECTION_KINDS)[number];
interface Reference { sub: string; remoteId: string }
export interface AgenticEntry extends Reference { version?: number; headline?: string; summary?: string; reason?: string; present?: Present; group?: string }
export interface AgenticSection { title: string; kind?: SectionKind; note?: string; entries: AgenticEntry[] }
export interface AgenticScore extends Reference { score: number; reason?: string }
export interface AgenticEditionInput {
  title?: string;
  lede?: string;
  agent: { name: string; model?: string };
  generatedAt?: string;
  sections?: AgenticSection[];
  scores?: AgenticScore[];
}
interface Row { revision: number; mode: "sections" | "scores" | null; edition_json: string | null; updated_at: string | null; draft_id: string | null; draft_md: string | null }

/** The default feed's id; the only feed until the UI grows more tabs (plan §3.3). */
export const DEFAULT_FEED = "default";

async function readRow(db: D1Database, feed: string): Promise<Row | null> {
  return db.prepare("SELECT revision, mode, edition_json, updated_at, draft_id, draft_md FROM agentic_feeds WHERE id = ?").bind(feed).first<Row>();
}

/** The agentic feeds in the owner's order, each with its name: its own, else the default feed's setting, else its id. */
export async function listFeeds(db: D1Database) {
  const [rows, settings] = await Promise.all([
    db.prepare("SELECT id, title, revision, updated_at FROM agentic_feeds ORDER BY position, id").all<{ id: string; title: string | null; revision: number; updated_at: string | null }>(),
    getSettings(db),
  ]);
  return rows.results.map((r) => ({ id: r.id, title: r.title ?? (r.id === DEFAULT_FEED ? settings.agentic_title : r.id), revision: r.revision, updatedAt: r.updated_at }));
}

/** Replace a feed's edition when it is still at `expectedRevision`; false when it has moved on or the feed does not exist. */
export async function replaceEdition(db: D1Database, feed: string, edition: AgenticEditionInput, expectedRevision: number, now: string): Promise<boolean> {
  const mode = edition.sections ? "sections" : "scores";
  const result = await db.prepare(`UPDATE agentic_feeds SET revision = revision + 1, mode = ?, edition_json = ?, updated_at = ? WHERE id = ? AND revision = ?`)
    .bind(mode, JSON.stringify(edition), now, feed, expectedRevision).run();
  if (!result.meta.changes) return false;
  await writeThread(db, feed);
  return true;
}

/** Compose a feed's stored edition into its draft thread (src/agentic-thread.ts), headed with the feed's name. */
async function writeThread(db: D1Database, feed: string): Promise<void> {
  const [row, read, settings, feeds] = await Promise.all([readRow(db, feed), readEdition(db, feed), getSettings(db), listFeeds(db)]);
  if (!row || !read?.layout) return;
  const date = formatDateIn(read.layout.generatedAt ?? row.updated_at ?? new Date().toISOString(), settings.timezone);
  const markdown = editionMarkdown(read.layout, feeds.find((f) => f.id === feed)?.title ?? feed, date);
  const id = await writeEditionDraft(db, { id: row.draft_id, md: row.draft_md }, markdown);
  await db.prepare("UPDATE agentic_feeds SET draft_id = ?, draft_md = ? WHERE id = ?").bind(id, markdown, feed).run();
}

const identityOf = (ref: Reference): Identity =>
  ref.sub === OWN_SUBSCRIPTION ? { source: "own", sub: "", id: ref.remoteId, at: null } : { source: "imported", sub: ref.sub, id: ref.remoteId, at: null };
const keyOf = (ref: Reference) => ref.sub === OWN_SUBSCRIPTION ? `own:${ref.remoteId}` : `imported:${JSON.stringify([ref.sub, ref.remoteId])}`;

/** The sections an edition draws, in either mode, before resolving. */
export function sectionsOf(edition: AgenticEditionInput): AgenticSection[] {
  if (edition.sections) return edition.sections;
  const ranked = [...(edition.scores ?? [])].sort((a, b) => b.score - a.score).slice(0, SCORED_SHOWN);
  return [{ title: "Ranked for you", kind: "section", entries: ranked.map(({ sub, remoteId, reason }) => ({ sub, remoteId, ...(reason ? { reason } : {}) })) }];
}

/**
 * The stored edition and what the tab draws: every reference resolved to its
 * reading entry, with withdrawn ones and ones no longer held left out, a
 * repeat of an entry already shown left out, and empty sections dropped.
 */
export async function readEdition(db: D1Database, feed: string) {
  const row = await readRow(db, feed);
  if (!row) return null;
  const edition = row.edition_json ? (JSON.parse(row.edition_json) as AgenticEditionInput) : null;
  const draft = row.draft_id ? { id: row.draft_id } : null;
  if (!edition) return { revision: row.revision, updatedAt: row.updated_at, mode: row.mode, edition: null, layout: null, draft };
  const sections = sectionsOf(edition);
  const refs = sections.flatMap((s) => s.entries);
  const seenRefs = new Set<string>();
  const identities = refs.filter((r) => !seenRefs.has(keyOf(r)) && seenRefs.add(keyOf(r))).map(identityOf);
  const rules = enabledRules((await getSettings(db)).bg_rules);
  const entries = new Map((await readingEntries(db, identities, rules)).filter((e) => !e.withdrawn).map((e) => [e.key, e]));
  const shown = new Set<string>();
  const laid = sections.map((section) => ({
    title: section.title,
    kind: section.kind ?? "section",
    note: section.note ?? null,
    entries: section.entries.flatMap((ref) => {
      const entry = entries.get(keyOf(ref));
      if (!entry || shown.has(keyOf(ref))) return [];
      shown.add(keyOf(ref));
      return [{ ...ref, entry }];
    }),
  })).filter((section) => section.entries.length);
  return {
    revision: row.revision,
    updatedAt: row.updated_at,
    mode: row.mode,
    edition,
    layout: { title: edition.title ?? null, lede: edition.lede ?? null, agent: edition.agent, generatedAt: edition.generatedAt ?? null, sections: laid },
    draft,
  };
}

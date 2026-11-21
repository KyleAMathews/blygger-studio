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

async function readRow(db: D1Database): Promise<Row> {
  return (await db.prepare("SELECT revision, mode, edition_json, updated_at, draft_id, draft_md FROM agentic_edition WHERE id = 1").first<Row>())
    ?? { revision: 0, mode: null, edition_json: null, updated_at: null, draft_id: null, draft_md: null };
}

/** Replace the edition when it is still at `expectedRevision`; false when it has moved on. */
export async function replaceEdition(db: D1Database, edition: AgenticEditionInput, expectedRevision: number, now: string): Promise<boolean> {
  const mode = edition.sections ? "sections" : "scores";
  const result = await db.prepare(`INSERT INTO agentic_edition (id, revision, mode, edition_json, updated_at) SELECT 1, ?1 + 1, ?2, ?3, ?4
      WHERE COALESCE((SELECT revision FROM agentic_edition WHERE id = 1), 0) = ?1
    ON CONFLICT (id) DO UPDATE SET revision = excluded.revision, mode = excluded.mode, edition_json = excluded.edition_json, updated_at = excluded.updated_at`)
    .bind(expectedRevision, mode, JSON.stringify(edition), now).run();
  if (!result.meta.changes) return false;
  await writeThread(db);
  return true;
}

/** Compose the stored edition into its draft thread (src/agentic-thread.ts). */
async function writeThread(db: D1Database): Promise<void> {
  const [row, read, settings] = await Promise.all([readRow(db), readEdition(db), getSettings(db)]);
  if (!read.layout) return;
  const date = formatDateIn(read.layout.generatedAt ?? row.updated_at ?? new Date().toISOString(), settings.timezone);
  const markdown = editionMarkdown(read.layout, settings.agentic_title, date);
  const id = await writeEditionDraft(db, { id: row.draft_id, md: row.draft_md }, markdown);
  await db.prepare("UPDATE agentic_edition SET draft_id = ?, draft_md = ? WHERE id = 1").bind(id, markdown).run();
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
export async function readEdition(db: D1Database) {
  const row = await readRow(db);
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

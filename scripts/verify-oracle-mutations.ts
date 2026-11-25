/**
 * A passing comparison must reject a plausible wrong implementation.
 * Contract: docs/oracle-tests.md ORC-006 requires a reached semantic failure, not
 * just a nonzero runner exit. These controls break pin persistence, restore text,
 * pagination, mention discovery and display order independently of the models.
 * Driver: isolated copies run registered oracle-gaps baselines and authored
 * lifecycle/pagination/mention controls. Both mention failures receive replay.
 * Refinement: each authored kill must preserve its registered law and checkpoint;
 * native generated failure receipts are captured and replayed without guessing.
 * Limits: selected wrong designs, not all defects or a complete oracle audit.
 * This runner copies tracked and nonignored untracked candidate files.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { verifyOracleMutation } from "./oracle-mutation-control.ts";

// Mutate isolated copies, never the contributor's checkout. A nonzero exit
// alone is insufficient: each mutant must reach its semantic checkpoint.
const root = resolve(".");
const shard = process.argv[2];
if (shard !== undefined && shard !== '--shard=1' && shard !== '--shard=2') throw new Error('Expected --shard=1 or --shard=2');
const temp = mkdtempSync(join(tmpdir(), "blygger-oracle-mutations-"));
type Control = { name: string; file: string; from: string; to: string; test: string; pattern: string; checkpoint: string; law: string; replayTarget?: string };
const controls: Control[] = [
  { name: "pin is not persisted", file: "src/model.ts", from: "UPDATE versions SET pinned = 1,", to: "UPDATE versions SET pinned = 0,", test: "test/item-lifecycle.oracle.test.ts", pattern: "preserves a pinned history", checkpoint: "lifecycle immutable history", law: "forward history and immutable pins" },
  { name: "restore changes the wrong text", file: "src/model.ts", from: ".bind(row.content_md, discard ? 1 : 0,", to: '.bind("mutation: wrong restored text", discard ? 1 : 0,', test: "test/item-lifecycle.oracle.test.ts", pattern: "preserves a pinned history", checkpoint: "lifecycle owner working copy", law: "forward history and immutable pins" },
  { name: "page continuation is ignored", file: "src/cursor-page.ts", from: "const ranges = cursor ? afterRanges(source.order, cursor.after) : null;", to: "const ranges = null;", test: "test/pagination.oracle.test.ts", pattern: "walks ties over more than two pages", checkpoint: "page", law: "complete walk" },
  { name: "tie order is reversed", file: "src/read-api.ts", from: "name: 'signals', domains: ['signals'], sql: 'SELECT * FROM signals',\n  order: [{ column: 'at', direction: 'desc' }, { column: 'subscription_id', direction: 'asc' }, { column: 'remote_id', direction: 'asc' }]", to: "name: 'signals', domains: ['signals'], sql: 'SELECT * FROM signals',\n  order: [{ column: 'at', direction: 'desc' }, { column: 'subscription_id', direction: 'desc' }, { column: 'remote_id', direction: 'desc' }]", test: "test/pagination.oracle.test.ts", pattern: "walks ties over more than two pages", checkpoint: "page", law: "complete walk" },
  { name: "mention lookup restores LIKE", file: "src/mentions/send.ts", from: "substr(?, 1, length(origin)) = origin", to: "? LIKE origin || '%'", test: "test/mention-delivery.oracle.test.ts", pattern: "fixed seed 20261001: generated", checkpoint: "mention delivery result", law: "delivery routing", replayTarget: "mention-delivery" },
  { name: "mention lookup selects shortest origin", file: "src/mentions/send.ts", from: "ORDER BY length(origin) DESC LIMIT 1", to: "ORDER BY length(origin) ASC LIMIT 1", test: "test/mention-delivery.oracle.test.ts", pattern: "fixed seed 20261001: generated", checkpoint: "mention discovery trace", law: "delivery routing" },
  { name: "mention lookup includes RSS", file: "src/mentions/send.ts", from: "WHERE kind = 'blyg' AND substr", to: "WHERE substr", test: "test/mention-delivery.oracle.test.ts", pattern: "fixed seed 20261001: generated", checkpoint: "mention discovery trace", law: "delivery routing" },
  { name: "mention groups show oldest verification first", file: "src/mention-groups.ts", from: "order: [{ column: 'verifiedAt', direction: 'desc' },", to: "order: [{ column: 'verifiedAt', direction: 'asc' },", test: "test/mention-order.oracle.test.ts", pattern: "fixed seed 20261001: generated", checkpoint: "groups page", law: "ordered receipt views", replayTarget: "mention-order" },
  { name: "mention visibility counts hidden receipts", file: "src/mention-groups.ts", from: "status='verified' AND hidden=0", to: "status='verified' AND hidden=1", test: "test/mention-order.oracle.test.ts", pattern: "fixed seed 20261001: generated", checkpoint: "group values", law: "ordered receipt views" },
];
try {
  for (const file of execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean)) {
    if (!existsSync(join(root, file))) continue;
    const destination = join(temp, file); mkdirSync(dirname(destination), { recursive: true }); cpSync(join(root, file), destination);
  }
  cpSync(join(root, "sdk/dist"), join(temp, "sdk/dist"), { recursive: true });
  mkdirSync(join(temp, "build"));
  for (const file of ["studio-spa.txt", "studio-spa-style.txt", "models.json", "extensions.names.ts", "extensions.server.ts", "extensions.ui.ts"]) cpSync(join(root, "build", file), join(temp, "build", file));
  symlinkSync(join(root, "node_modules"), join(temp, "node_modules"), "dir");
  // The first lane takes the indexed controls that balanced the hosted timings.
  const firstLane = new Set([0, 1, 7, 8]);
  const selected = shard === undefined ? controls : controls.filter((_, index) => firstLane.has(index) === (shard === '--shard=1'));
  for (const control of selected) verifyOracleMutation(root, temp, {
    ...control, changes: [{ file: control.file, from: control.from, to: control.to }],
    ...(control.replayTarget ? { replay: { seed: 20261001, property: control.replayTarget } } : {}),
  }, `oracle-mutation-${controls.indexOf(control)}`);
} finally { rmSync(temp, { recursive: true, force: true }); }

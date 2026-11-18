// Local patches: commits in an operator's checkout that no upstream release
// carries (docs/where-does-it-go.md, "Local patches"). One reader of git, used
// by `npm run patches`, by `npm run upgrade` and by the build, which bakes the
// count for Settings → updates. Read-only: nothing here writes to the repository.
//
// "Upstream" is every `v*` tag plus every remote that points at this
// repository (the `upstream` remote `npm run upgrade` adds, or an `origin`
// cloned from it). A commit reachable from none of them is local. Merge
// commits are left out, so the merges `npm run upgrade` makes are not counted.
import { execFileSync } from "node:child_process";

const UPSTREAM_REPO = /github\.com[:/]blygger\/blygger-studio(\.git)?\/?$/;

/**
 * Paths a harmless patch does not touch (rule 4): what the blyg serves to
 * others, the schema, the client's name, the owner contract. A hint for a
 * warning, not a proof; the operator may know better.
 */
export const WIRE_PATHS = [
  "migrations/",
  "src/client.ts",
  "src/contract/",
  "src/protocol.ts",
  "src/public-feed.ts",
  "src/markdown.ts",
  "src/math-render.ts",
];

export interface LocalPatch {
  sha: string;
  subject: string;
  /** The message starts `local:`. */
  labelled: boolean;
  files: string[];
  /** Files among `files` that fall under WIRE_PATHS. */
  wire: string[];
}

export type PatchList =
  | { known: true; release: string | null; patches: LocalPatch[] }
  | { known: false; reason: string };

export const touchesWire = (file: string) =>
  WIRE_PATHS.some((p) => (p.endsWith("/") ? file.startsWith(p) : file === p));

export function listLocalPatches(root: string): PatchList {
  const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  try {
    git(["rev-parse", "--git-dir"]);
  } catch {
    return { known: false, reason: "not a git checkout" };
  }
  // A shallow clone (CI) ends history early, so every commit in it would look local.
  if (git(["rev-parse", "--is-shallow-repository"]).trim() === "true") return { known: false, reason: "shallow clone" };

  const remotes = git(["remote", "-v"])
    .split("\n")
    .map((l) => l.split(/\s+/))
    .filter(([name, url]) => name && url && (name === "upstream" || UPSTREAM_REPO.test(url)))
    .map(([name]) => name);
  const upstream = [...new Set(remotes)];
  const tags = git(["tag", "--list", "v*"]).trim();
  if (!upstream.length && !tags) return { known: false, reason: "no release tags and no upstream remote" };

  let release: string | null = null;
  try {
    release = git(["describe", "--tags", "--abbrev=0", "--match", "v*"]).trim() || null;
  } catch {
    release = null;
  }

  const not = ["--not", "--tags=v*", ...upstream.map((r) => `--remotes=${r}`)];
  const log = git(["log", "--no-merges", "--reverse", "--format=%H%x09%s", "HEAD", ...not]).trim();
  const patches = log
    ? log.split("\n").map((line) => {
        const [sha, ...rest] = line.split("\t");
        const subject = rest.join("\t");
        const files = git(["diff-tree", "--no-commit-id", "--name-only", "-r", sha]).split("\n").filter(Boolean);
        return { sha, subject, labelled: /^local:/i.test(subject), files, wire: files.filter(touchesWire) };
      })
    : [];
  return { known: true, release, patches };
}

/** The list as `npm run patches` and `npm run upgrade` print it. */
export function describePatches(list: PatchList): string {
  if (!list.known) return `Local patches: unknown (${list.reason}).`;
  const since = list.release ? `since ${list.release}` : "not in any upstream release";
  if (!list.patches.length) return `No local patches ${since}.`;
  const lines = [`${list.patches.length} local patch${list.patches.length === 1 ? "" : "es"} ${since}:`];
  for (const p of list.patches) {
    lines.push(`  ${p.sha.slice(0, 7)} ${p.subject}${p.labelled ? "" : "   ← no \`local:\` label"}`);
    for (const f of p.files) lines.push(`      ${f}`);
    if (p.wire.length) lines.push(`      ⚠ touches ${p.wire.join(", ")}: a harmless patch does not change the wire, the schema or the client's name`);
  }
  return lines.join("\n");
}

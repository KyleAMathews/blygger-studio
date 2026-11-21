// Bake the local-patch count into build/patches.ts for Settings → updates
// (docs/where-does-it-go.md, "Local patches"). Studio-only: nothing reads it
// outside the Studio's own pages, and it never reaches `generator` or the wire.
// null when it cannot be known (no git, a shallow clone), and Settings then
// says nothing.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { listLocalPatches } from "./patches-lib.ts";

const list = listLocalPatches(path.join(import.meta.dirname, ".."));
const count = list.known ? list.patches.length : null;
mkdirSync("build", { recursive: true });
writeFileSync("build/patches.ts", `// Written by scripts/build-patches.ts.\nexport const localPatches: number | null = ${count};\n`);
console.log(`build-patches: ${!list.known ? `unknown (${list.reason})` : `${count} local patch${count === 1 ? "" : "es"}`}`);

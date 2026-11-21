// `npm run patches` — list this checkout's local patches: the commits no
// upstream release carries, each with the files it touches, flagging any
// without a `local:` label and any that touch the wire (scripts/patches-lib.ts).
// Read-only. With --count, print only the number, or "unknown".
import path from "node:path";
import { describePatches, listLocalPatches } from "./patches-lib.ts";

const list = listLocalPatches(path.join(import.meta.dirname, ".."));
if (process.argv.includes("--count")) console.log(list.known ? list.patches.length : "unknown");
else console.log(describePatches(list));

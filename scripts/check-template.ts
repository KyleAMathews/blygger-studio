// The shipped artifact names nobody's deployment (session 28 packaging rule;
// studio#1). Our committed `wrangler.jsonc` is a template: no account, no named
// envs, no routes, no real database id. A copy that carried ours would deploy
// fine and tell every new operator where our infrastructure lives.
//
// This used to be part of `npm test`, which also runs on operators' installs —
// where `wrangler.jsonc` is *supposed* to hold their own deployment, so a correct
// install failed. It is a property of the published repository, so CI checks it
// there, on the committed file. Run from the repo root (npm does).
import { readdirSync, readFileSync } from "node:fs";
import { stripJsonComments } from "./deploy-lib.ts";

const config = JSON.parse(stripJsonComments(readFileSync("wrangler.jsonc", "utf8")));
const problems: string[] = [];
if (config.name !== "blyg") problems.push(`name is "${config.name}", not the template's "blyg"`);
if (config.account_id !== undefined) problems.push("account_id must not be committed");
if (config.env !== undefined) problems.push("named env blocks are deployment-specific");
if (config.routes !== undefined) problems.push("routes name a domain");
if (/^[0-9a-f-]{36}$/.test(config.d1_databases?.[0]?.database_id ?? "")) problems.push("database_id is a real UUID; the template carries a placeholder");
// studio#10: 9000_–9999_ is reserved for operators' local migrations, so the
// shipped repo must never use it. (A test would fail on an operator's install
// that rightly has one — the #1 mistake again — so this is CI-only too.)
for (const f of readdirSync("migrations")) {
  const n = Number(/^(\d{4})_/.exec(f)?.[1]);
  if (n >= 9000) problems.push(`migrations/${f} is in the range reserved for local migrations`);
}
if (problems.length) {
  console.error(`the repository is not shippable:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log("shippable: wrangler.jsonc is the template, and no migration is in the local range");

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { CLIENT } from "../src/types.ts";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Release version must be MAJOR.MINOR.PATCH");
if (CLIENT.version !== version) throw new Error("package.json and CLIENT.version must match");
const tags = execFileSync("git", ["tag", "--list", "v*"], { encoding: "utf8" }).trim().split("\n");
const parts = version.split(".").map(Number);
for (const tag of tags) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) continue;
  const released = tag.slice(1).split(".").map(Number);
  const firstDifference = parts.findIndex((part: number, index: number) => part !== released[index]);
  if (firstDifference === -1 && process.env.RELEASE_RETRY_COMMIT && execFileSync("git", ["rev-list", "-n", "1", tag], { encoding: "utf8" }).trim() === process.env.RELEASE_RETRY_COMMIT) continue;
  if (firstDifference === -1 || parts[firstDifference] < released[firstDifference]) {
    throw new Error(`Version ${version} must be newer than released ${tag}. Bump the version before merging.`);
  }
}
const entry = readFileSync("CHANGELOG.md", "utf8").split(/^## /m).find(section => section.startsWith(`${version} —`));
if (!entry || !/Migrations:/i.test(entry)) throw new Error(`Add a ${version} changelog entry with an explicit Migrations: line`);
console.log(`v${version} is ready to release from its tag`);

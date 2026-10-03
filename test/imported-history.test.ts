// The reader side of decision #40: an imported item's notes as a timeline, and
// "see the change" between versions its origin serves publicly. Nothing here
// may reach unpinned history — the origin withholds it, and the fetchers must
// treat that as the answer, not an error to route around.
import { describe, expect, it } from "vitest";
import { fetchImportedHistory, fetchPublicVersion } from "../src/imported-history.ts";
import { diffText } from "../src/word-diff.ts";
import type { SubscriptionRow } from "../src/types.ts";
import { makeFixtureFetch } from "./importer/fixtures.ts";

const O = "https://them.example/blyg/";
const sub = { id: "s", kind: "blyg", origin: O } as SubscriptionRow;
const ID = "0000000000000000000000000h";
const doc = (over: Record<string, unknown>) => ({ body: JSON.stringify({ id: ID, kind: "fragment", version: 3, content_md: "v3 text", ...over }) });

describe("word diff", () => {
  const rebuild = (ops: ReturnType<typeof diffText>, keep: "del" | "ins") => ops.filter((o) => o.op === "eq" || o.op === keep).map((o) => o.text).join("");

  it("round-trips both sides and marks only the changed words", () => {
    const a = "The claim was broad.\n\nA second paragraph stays.";
    const b = "The claim is narrow.\n\nA second paragraph stays.";
    const ops = diffText(a, b);
    expect(rebuild(ops, "del")).toBe(a);
    expect(rebuild(ops, "ins")).toBe(b);
    expect(ops.filter((o) => o.op === "del").map((o) => o.text.trim())).toEqual(["was broad.\n\n".trim()]);
    expect(ops.find((o) => o.op === "eq" && o.text.includes("second paragraph"))).toBeTruthy();
  });

  it("handles pure insertion and deletion of paragraphs", () => {
    expect(diffText("One.\n\n", "One.\n\nTwo.")).toEqual([{ op: "eq", text: "One.\n\n" }, { op: "ins", text: "Two." }]);
    expect(diffText("One.\n\nTwo.", "Two.")).toEqual([{ op: "del", text: "One.\n\n" }, { op: "eq", text: "Two." }]);
  });
});

describe("history from the origin", () => {
  it("reads the changelog, including pins and generated notes, in version order", async () => {
    const { fetch } = makeFixtureFetch({
      [`${O}items/${ID}.json`]: doc({ changelog: [
        { version: 2, at: "b", note: "edit", pinned: true },
        { version: 1, at: "a", note: null },
        { version: 3, at: "c", note: "Tightened.", generated: true },
      ] }),
    });
    const got = await fetchImportedHistory(fetch, sub, ID);
    expect(got).toEqual({ ok: true, value: { current: 3, withdrawn: false, changelog: [
      { version: 1, at: "a", note: null, pinned: false, generated: false },
      { version: 2, at: "b", note: "edit", pinned: true, generated: false },
      { version: 3, at: "c", note: "Tightened.", pinned: false, generated: true },
    ] } });
  });

  it("refuses a document that describes some other item", async () => {
    const { fetch } = makeFixtureFetch({ [`${O}items/${ID}.json`]: { body: JSON.stringify({ id: "other", version: 1 }) } });
    expect(await fetchImportedHistory(fetch, sub, ID)).toMatchObject({ ok: false, status: 502 });
  });

  it("serves a pinned version from its file, and the current one from the document", async () => {
    const { fetch } = makeFixtureFetch({
      [`${O}items/${ID}/v2.json`]: { body: JSON.stringify({ id: ID, version: 2, content_md: "v2 text", note: "edit" }) },
      [`${O}items/${ID}.json`]: doc({}),
    });
    expect(await fetchPublicVersion(fetch, sub, ID, 2)).toEqual({ ok: true, value: { version: 2, content_md: "v2 text", note: "edit", pinned: true } });
    expect(await fetchPublicVersion(fetch, sub, ID, 3)).toEqual({ ok: true, value: { version: 3, content_md: "v3 text", note: null, pinned: false } });
  });

  it("an unpinned, non-current version is not public, and is reported as such", async () => {
    const { fetch, calls } = makeFixtureFetch({ [`${O}items/${ID}.json`]: doc({}) });
    expect(await fetchPublicVersion(fetch, sub, ID, 1)).toMatchObject({ ok: false, status: 404 });
    // Only the two public URLs were tried; nothing guessed at a history path.
    expect(calls).toEqual([`${O}items/${ID}/v1.json`, `${O}items/${ID}.json`]);
  });
});

// The full backup (ROADMAP row 15): one tar of every table and media file,
// owner session only, credentials left out.
import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { backupFileName, excludedTable, tarHeader } from "../src/backup.ts";
import { BASE, STUDIO, createAndPublish, login } from "./helpers.ts";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]);

/** Read a ustar stream back into path → bytes, checking every header's checksum. */
function untar(bytes: Uint8Array): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  const text = (from: number, length: number) => new TextDecoder().decode(bytes.subarray(from, from + length)).replace(/\0.*$/s, "");
  let at = 0;
  while (at + 512 <= bytes.length) {
    const header = bytes.subarray(at, at + 512);
    if (header.every((b) => b === 0)) break;
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += i >= 148 && i < 156 ? 32 : header[i];
    expect(parseInt(text(at + 148, 8), 8)).toBe(sum);
    expect(text(at + 257, 6)).toBe("ustar");
    const prefix = text(at + 345, 155);
    const name = (prefix ? prefix + "/" : "") + text(at, 100);
    const size = parseInt(text(at + 124, 12), 8);
    files.set(name, bytes.slice(at + 512, at + 512 + size));
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

describe("backup", () => {
  it("needs the owner's session", async () => {
    const res = await SELF.fetch(`${BASE}${STUDIO}/backup`);
    expect(res.status).toBe(401);
  });

  it("holds every table and media file, and no credentials", async () => {
    const cookie = await login();
    const id = await createAndPublish(cookie, "Backed up, every word.");
    const form = new FormData();
    form.set("file", new File([PNG], "dot.png", { type: "image/png" }));
    const uploaded = await SELF.fetch(`${BASE}/blyg/api/media`, { method: "POST", headers: { cookie }, body: form });
    expect(uploaded.status).toBe(201);
    await env.MEDIA.put("__cache/feed/derived.xml", "<rss/>");

    const res = await SELF.fetch(`${BASE}${STUDIO}/backup`, { headers: { cookie } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/x-tar");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="blyg-backup-example\.com-blyg-\d{4}-\d{2}-\d{2}\.tar"$/);
    const files = untar(new Uint8Array(await res.arrayBuffer()));

    const manifest = JSON.parse(new TextDecoder().decode(files.get("blyg-backup/backup.json")));
    expect(manifest).toMatchObject({ format: "blygger-studio-backup", formatVersion: 1, origin: "https://example.com/blyg/", mount: "/blyg", complete: true });
    expect(manifest.tables.items.rows).toBeGreaterThan(0);
    expect(manifest.excludedTables).toEqual(expect.arrayContaining(["oauth_records"]));
    expect(Object.keys(manifest.tables).some((t) => /^(jwks|session|user|account|verification|oauth)/i.test(t))).toBe(false);
    expect(Object.keys(manifest.tables).filter(excludedTable)).toEqual([]);

    const items = [...files].filter(([path]) => path.startsWith("blyg-backup/tables/items/"))
      .flatMap(([, data]) => new TextDecoder().decode(data).trim().split("\n").map((line) => JSON.parse(line)));
    expect(items.map((row) => row.id)).toContain(id);
    expect(items.length).toBe(manifest.tables.items.rows);
    expect([...files.keys()].some((path) => /\/(oauth_|security_)/.test(path))).toBe(false);

    const media = [...files].filter(([path]) => path.startsWith("blyg-backup/media/"));
    expect(media.some(([, data]) => data.length === PNG.length && data.every((b, i) => b === PNG[i]))).toBe(true);
    expect(media.some(([path]) => path.includes("__cache"))).toBe(false);
    expect(manifest.media.objects).toBe(media.length);
  });

  it("splits a long path into the ustar prefix, and refuses one that cannot fit", () => {
    const long = `blyg-backup/media/${"a".repeat(80)}/${"b".repeat(60)}.png`;
    const header = tarHeader(long, 1, new Date(0));
    const text = (from: number, length: number) => new TextDecoder().decode(header.subarray(from, from + length)).replace(/\0.*$/s, "");
    expect(`${text(345, 155)}/${text(0, 100)}`).toBe(long);
    expect(() => tarHeader("x".repeat(300), 1, new Date(0))).toThrow(/too long/);
  });

  it("names the file after the host, mount and day", () => {
    const now = new Date("2026-11-14T20:00:00Z");
    expect(backupFileName("https://venkateshrao.com/blyg/", "/blyg", now)).toBe("blyg-backup-venkateshrao.com-blyg-2026-11-14.tar");
    expect(backupFileName("https://blyg.blygger.org/", "", now)).toBe("blyg-backup-blyg.blygger.org-2026-11-14.tar");
  });
});

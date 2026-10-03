// A small word diff for the history view (#40: "see the change" between two
// public versions). No dependency, by the session-29 ruling.
//
// Two levels keep it bounded: paragraphs are aligned first, then words are
// diffed only inside a paragraph that was replaced. A whole-document word LCS
// is quadratic in a long thread; a paragraph LCS is quadratic in paragraphs.

export type DiffOp = { op: "eq" | "del" | "ins"; text: string };

/** Largest LCS table built at either level; beyond it the pair is shown as replaced. */
const MAX_CELLS = 4_000_000;

function lcs<T>(a: T[], b: T[], same: (x: T, y: T) => boolean): Array<["eq" | "del" | "ins", T]> | null {
  if ((a.length + 1) * (b.length + 1) > MAX_CELLS) return null;
  const w = b.length + 1;
  const t = new Uint32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      t[i * w + j] = same(a[i], b[j]) ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    }
  }
  const out: Array<["eq" | "del" | "ins", T]> = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (same(a[i], b[j])) { out.push(["eq", a[i]]); i++; j++; }
    else if (t[(i + 1) * w + j] >= t[i * w + j + 1]) out.push(["del", a[i++]]);
    else out.push(["ins", b[j++]]);
  }
  while (i < a.length) out.push(["del", a[i++]]);
  while (j < b.length) out.push(["ins", b[j++]]);
  return out;
}

/** Words with their trailing whitespace, so joining the tokens reproduces the text. */
const tokens = (text: string) => text.match(/\S+\s*|\s+/g) ?? [];

function push(out: DiffOp[], op: DiffOp["op"], text: string) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.op === op) last.text += text;
  else out.push({ op, text });
}

function wordDiff(out: DiffOp[], a: string, b: string) {
  const ops = lcs(tokens(a), tokens(b), (x, y) => x.trim() === y.trim());
  if (!ops) { push(out, "del", a); push(out, "ins", b); return; }
  for (const [op, tok] of ops) push(out, op, tok);
}

/**
 * Diff two texts. Joining every `eq`+`del` op's text gives `a`; every
 * `eq`+`ins` gives `b`. A paragraph deleted and one inserted next to it are
 * treated as an edit and diffed word by word.
 */
export function diffText(a: string, b: string): DiffOp[] {
  const pa = a.split(/(?<=\n\n)/), pb = b.split(/(?<=\n\n)/);
  const out: DiffOp[] = [];
  const paras = lcs(pa, pb, (x, y) => x === y);
  if (!paras) { wordDiff(out, a, b); return out; }
  let dels: string[] = [], inss: string[] = [];
  const flush = () => {
    if (dels.length && inss.length) wordDiff(out, dels.join(""), inss.join(""));
    else { push(out, "del", dels.join("")); push(out, "ins", inss.join("")); }
    dels = []; inss = [];
  };
  for (const [op, p] of paras) {
    if (op === "eq") { flush(); push(out, "eq", p); }
    else (op === "del" ? dels : inss).push(p);
  }
  flush();
  return out;
}

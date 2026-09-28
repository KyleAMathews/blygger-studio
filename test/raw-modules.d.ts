// Ambient declaration for Vite's ?raw import suffix. Must live in a file with
// no top-level import/export, or TypeScript reads `declare module` as a module
// augmentation instead of an ambient module declaration.
//
// deploy-manifest.test.ts uses it to read the real wrangler.jsonc as text, so
// the cross-check tests assert against the committed config itself rather than
// a copy that could drift from it.

declare module "*?raw" {
  const content: string;
  export default content;
}

// `import.meta.glob` is Vite's, not Node's, and tsconfig does not pull in
// vite/client (which would drag in DOM lib types this Worker project does not
// want). Declared narrowly for the one shape deploy-manifest.test.ts uses:
// eager + ?raw + default, which yields string values.
interface ImportMeta {
  glob(
    pattern: string,
    options: { query: "?raw"; import: "default"; eager: true },
  ): Record<string, string>;
}

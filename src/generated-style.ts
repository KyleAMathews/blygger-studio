// How generated spans ([TK], §5.7, the protocol's own `blyg-tk-gen` markup)
// are drawn: shared by the public pages (src/pages.ts) and the Studio's reader
// (src/ui/generated-highlight.ts), so an item looks the same on both (Venkat,
// session 78). Presentation only; nothing here touches content_html. No Worker
// or DOM imports: both bundles take it.

/** Lucide's "bot" icon (ISC licence), used only as a mask, so its stroke colour is irrelevant: it takes --ink-soft and follows the theme. */
export const ROBOT = `url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22black%22 stroke-width=%221.8%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22M12 8V4H8%22/%3E%3Crect width=%2216%22 height=%2212%22 x=%224%22 y=%228%22 rx=%222%22/%3E%3Cpath d=%22M2 14h2M20 14h2M15 13v2M9 13v2%22/%3E%3C/svg%3E")`;

/**
 * Generated spans ([TK], §5.7) drawn as a tinted, hairline-outlined box. The
 * markup is the protocol's own `blyg-tk-gen` and is never changed; whether a
 * page highlights it is presentation. `scope` selects the articles it applies
 * to: `.gen-on` (an item's own override) always, and every article not
 * opted out when the blyg's default is on.
 *
 * A generated block wears a small robot badge on its bottom edge, near the
 * left: Brady Dale's convention on bradydale.com, adopted so the mark reads
 * the same across blygs. An inline span, which can wrap, gets the robot
 * before its first word. GEN_INFO_SCRIPT makes the badge a button (hover or
 * tap for the disclosure) and marks the span .gen-ready; until then, or with
 * scripts off, the same robot is drawn by pseudo-elements. Either way the
 * icon is a mask filled with --ink-soft, so it follows the theme.
 */
export function generatedHighlightRules(scope: string): string {
  const icon = `background: var(--ink-soft); -webkit-mask: ${ROBOT} center / contain no-repeat; mask: ${ROBOT} center / contain no-repeat;`;
  const square = `box-sizing: border-box; width: 30px; height: 26px; border: 1px solid color-mix(in srgb, var(--ink-soft) 55%, var(--gen-rule)); border-radius: 6px; background: var(--paper);`;
  return `${scope} .blyg-tk-gen { background: var(--gen-bg); box-shadow: inset 0 0 0 1px var(--gen-rule); border-radius: 4px; }
${scope} div.blyg-tk-gen { position: relative; padding: 0.5rem 0.75rem 1.15rem; margin: 0.75rem 0 1.5rem; }
${scope} div.blyg-tk-gen > :first-child:not(.gen-badge), ${scope} div.blyg-tk-gen > .gen-badge + * { margin-top: 0; }
${scope} div.blyg-tk-gen > :last-child { margin-bottom: 0; }
${scope} div.blyg-tk-gen:not(.gen-ready)::before { content: ""; position: absolute; left: 0.65rem; bottom: -13px; ${square} }
${scope} div.blyg-tk-gen:not(.gen-ready)::after { content: ""; position: absolute; left: calc(0.65rem + 6px); bottom: -10px; width: 18px; height: 18px; ${icon} }
/* An inline span that wraps keeps its box on every line it touches. */
${scope} span.blyg-tk-gen { padding: 0.05rem 0.2rem; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
${scope} span.blyg-tk-gen:not(.gen-ready)::before { content: ""; display: inline-block; width: 0.9em; height: 0.9em; margin-right: 0.2em; vertical-align: -0.1em; ${icon} }
${scope} .gen-badge { display: inline-block; position: relative; margin: 0; padding: 0; border: 0; background: none; font: inherit; color: inherit; cursor: pointer; }
${scope} .gen-badge::after { content: ""; position: absolute; ${icon} }
${scope} div.blyg-tk-gen > .gen-badge { position: absolute; left: 0.65rem; bottom: -13px; ${square} }
${scope} div.blyg-tk-gen > .gen-badge::after { inset: 3px 5px; }
${scope} span.blyg-tk-gen > .gen-badge { width: 0.9em; height: 0.9em; margin-right: 0.2em; vertical-align: -0.1em; }
${scope} span.blyg-tk-gen > .gen-badge::after { inset: 0; }
${scope} .gen-badge:focus-visible { outline: 2px solid var(--pencil); outline-offset: 2px; }
`;
}

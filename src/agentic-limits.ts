// The Agentic feed edition's closed field values and bounds (src/agentic.ts),
// kept free of imports so the contract can read them.
export const AGENTIC_PRESENTS = ["full", "excerpt", "title", "folded"] as const;
export const AGENTIC_SECTION_KINDS = ["lead", "section", "briefs"] as const;
export const AGENTIC_LIMITS = { sections: 20, entries: 50, scores: 500, title: 200, headline: 200, summary: 2000, reason: 500, note: 4000, group: 60 } as const;

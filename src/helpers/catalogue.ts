/*
 * Helpers: simple agents that complex agents and people share (blygger-spec
 * docs/helpers-plan.md). Each is one operation in the Studio's contract, so
 * the UI's control, a REST call and an MCP tool are the same thing. The
 * Studio's reference design, not a standard (Venkat, session 77).
 *
 * The catalogue tells a caller what exists. Mechanical helpers cost nothing
 * and answer at once; model helpers (decision or text) will run on the
 * owner's chosen model under the AI budget.
 */
export type HelperKind = "mechanical" | "decision" | "text";

export interface Helper {
  name: string;
  kind: HelperKind;
  /** The contract operation that runs it. */
  operation: string;
  description: string;
  /** Offered to people as a control in the Studio as well as to agents. */
  ui: string | null;
}

export const HELPERS: readonly Helper[] = [
  {
    name: "catch-up",
    kind: "mechanical",
    operation: "catchUp",
    description: "Lay a reading entry's nested quotes out oldest first, each card holding only that post's own words, so a conversation stored inside out can be read in order. After Burrow 0.23.0's Catch up.",
    ui: "Catch up, in a reading entry's ⋯ menu when it has quotes",
  },
  {
    name: "catch-up-summary",
    kind: "text",
    operation: "summarizeCatchUp",
    description: "A few sentences over catch-up's cards: who said what, oldest first, and where the conversation stands. Written once for the versions it reads and kept; disclosed as generated.",
    ui: "summarize, in the Catch up sheet",
  },
];

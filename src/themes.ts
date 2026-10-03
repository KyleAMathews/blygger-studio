export interface Theme {
  label: string;
  /** true when the palette is dark, so `color-scheme` can be pinned to match. */
  dark: boolean;
  page: string;
  paper: string;
  ink: string;
  inkSoft: string;
  rule: string;
  pencil: string;
}

export const THEMES: Record<string, Theme> = {
  paper: {
    label: "Paper",
    dark: false,
    page: "#fafbfb", paper: "#fafbfb",
    ink: "#1b2426", inkSoft: "#5c686b", rule: "#dde3e5", pencil: "#23608c",
  },
  cream: {
    label: "Cream",
    dark: false,
    page: "#e9e2d2", paper: "#f7f2e7",
    ink: "#33312c", inkSoft: "#6d675c", rule: "#ddd5c4", pencil: "#8a5a2b",
  },
  slate: {
    label: "Slate",
    dark: false,
    page: "#2f3538", paper: "#f5f7f7",
    ink: "#1b2426", inkSoft: "#5c686b", rule: "#dde3e5", pencil: "#23608c",
  },
  "solarized-light": {
    label: "Solarized Light",
    dark: false,
    page: "#eee8d5", paper: "#fdf6e3",
    ink: "#073642", inkSoft: "#657b83", rule: "#e3dcc4", pencil: "#268bd2",
  },
  "solarized-dark": {
    label: "Solarized Dark",
    dark: true,
    page: "#00212b", paper: "#002b36",
    ink: "#eee8d5", inkSoft: "#93a1a1", rule: "#0c4553", pencil: "#6cb6e0",
  },
  nord: {
    label: "Nord",
    dark: true,
    page: "#242933", paper: "#2e3440",
    ink: "#e5e9f0", inkSoft: "#a5aec0", rule: "#3e4757", pencil: "#88c0d0",
  },
};

/**
 * CSS appended to the stylesheet when the author picked a theme. It redefines
 * the tokens for BOTH schemes — the base block and the dark-preference block —
 * because an explicit choice by the author should not flip when the reader's
 * OS does. `auto` returns nothing, leaving the light/dark defaults in charge.
 */

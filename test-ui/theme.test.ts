import { expect, test } from 'vitest';
import { THEMES } from '../src/themes.ts';
import { THEME_VARS, themeAccent, themeIsDark, themeVars } from '../src/ui/theme.ts';

test('auto and unknown themes write nothing, leaving the stylesheet in charge', () => {
  expect(themeVars('auto')).toBeNull();
  expect(themeVars(undefined)).toBeNull();
  expect(themeVars('no-such-theme')).toBeNull();
});

test('every named theme fills every studio token from THEMES only', () => {
  for (const [name, t] of Object.entries(THEMES)) {
    const vars = themeVars(name)!;
    expect(Object.keys(vars).sort()).toEqual([...THEME_VARS].sort());
    expect(vars).toMatchObject({ page: t.page, card: t.paper, ink: t.ink, 'ink-soft': t.inkSoft, rule: t.rule, pencil: t.pencil });
    expect(vars['on-pencil']).toBe(t.dark ? t.page : t.paper);
    expect(themeAccent(name, !t.dark)).toBe(t.pencil);
    expect(themeIsDark(name, !t.dark)).toBe(t.dark);
  }
});

test('Slate puts page text in the sheet colour, because its page is dark behind a light sheet', () => {
  const slate = themeVars('slate')!;
  expect(slate['page-ink']).toBe(THEMES.slate.paper);
  expect(slate.ink).toBe(THEMES.slate.ink);
  // A light page keeps ink on the page.
  expect(themeVars('cream')!['page-ink']).toBe(THEMES.cream.ink);
  // A dark theme is dark throughout: page text is its ink.
  expect(themeVars('nord')!['page-ink']).toBe(THEMES.nord.ink);
});

test('auto follows the device for its accent and scheme', () => {
  expect(themeAccent('auto', false)).toBe('#23608c');
  expect(themeAccent('auto', true)).toBe('#8cc0e4');
  expect(themeIsDark('auto', true)).toBe(true);
  expect(themeIsDark('auto', false)).toBe(false);
});

/*
 * Generated spans in the reader, drawn as the public pages draw them (Venkat,
 * session 78): the tinted box and the robot, under the same setting,
 * "Highlight generated portions by default". It applies to every item the
 * reader shows, own and imported alike, since any of them may declare
 * `blyg-tk-gen` spans; an own item's per-post override is for its public page.
 * The robot here is the pseudo-element one: the public pages' disclosure box
 * (GEN_INFO_SCRIPT) is not in the Studio.
 */
import { useEffect } from 'react';
import { generatedHighlightRules } from '../generated-style.ts';

/** The bodies of reader items: cards and the full view, the Agentic digest, Catch up. */
const SCOPE = '.gen-highlight :is(.entry-body, .edition-body, .catch-up-body)';
const CLASS = 'gen-highlight';
let installed = false;

function install() {
  if (installed) return;
  installed = true;
  const style = document.createElement('style');
  style.dataset.source = 'generated-highlight';
  // The rules' badge square is drawn on --paper, the public pages' sheet.
  style.textContent = `.${CLASS} { --paper: var(--card); }\n${generatedHighlightRules(SCOPE)}`;
  document.head.append(style);
}

export function useGeneratedHighlight(on: boolean | undefined) {
  useEffect(() => {
    if (on) install();
    document.documentElement.classList.toggle(CLASS, !!on);
  }, [on]);
}

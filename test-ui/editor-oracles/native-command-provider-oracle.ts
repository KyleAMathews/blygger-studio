/** Controlled command signals retain genuine synchronous native input facts.
 * These are driver premises, not product event-count or recovery policies. */
import type { BrowserContext } from '@playwright/test';

export type NativeCommandMode = 'available' | 'refused' | 'throws' | 'missing' | 'afterFalse' | 'afterThrow';
export async function installNativeCommandProvider(context: BrowserContext, mode: NativeCommandMode) {
  await context.addInitScript(command => {
    if (command === 'refused') document.execCommand = () => false;
    if (command === 'throws') document.execCommand = () => { throw new Error('Oracle native command refusal'); };
    if (command === 'missing') Object.defineProperty(document, 'execCommand', { value: undefined, configurable: true });
    if (command !== 'afterFalse' && command !== 'afterThrow') return;
    const original = document.execCommand.bind(document);
    const host = window as typeof window & { __formattingNativeCommands?: object[]; __formattingNativeTarget?: HTMLTextAreaElement };
    host.__formattingNativeCommands = [];
    document.execCommand = (name, show, value) => {
      if (name !== 'delete') return original(name, show, value);
      const target = host.__formattingNativeTarget;
      const events: object[] = [];
      const receive = (event: Event) => events.push({ trusted: event.isTrusted, target: target !== undefined && event.target === target,
        inputType: (event as InputEvent).inputType });
      const receipt: { name: string; events: object[]; returned: boolean; signal?: string } = { name, events, returned: false };
      host.__formattingNativeCommands!.push(receipt);
      document.addEventListener('input', receive, true);
      try {
        receipt.returned = original(name, show, value);
        receipt.signal = command === 'afterThrow' ? 'throw' : 'false';
        if (command === 'afterThrow') throw new Error('Oracle native command completed before throwing');
        return false;
      } finally { document.removeEventListener('input', receive, true); }
    };
  }, mode);
}

// A driver cannot credit a controlled completed command without observing its
// real input at the intended textarea. Failure is setup, before the owed step.
export function requireNativeCommandInput(mode: NativeCommandMode, commands: readonly {
  name?: string; signal?: string; events?: readonly { trusted?: boolean; target?: boolean }[];
}[]) {
  if (mode !== 'afterFalse' && mode !== 'afterThrow') return;
  if (!commands.some(command => command.name === 'delete'
    && command.signal === (mode === 'afterFalse' ? 'false' : 'throw')
    && command.events?.some(event => event.trusted && event.target)))
    throw new Error('Native command driver premise missing: trusted input at the intended textarea before ' + mode);
}

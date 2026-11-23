/** Actual selected-collision receiving path after mixed actions. */
import { mixedDriver } from './mixed-driver-oracle.ts';
import { captureBrowserCalls } from './browser-driver-oracle.ts';
import type { mixedCodePlan } from './mixed-code-model-oracle.ts';
import type { Observe } from './document-oracle.ts';
export async function mixedCodeDriver(p: ReturnType<typeof mixedCodePlan>, observe: Observe) {
  await mixedDriver(p.prefix, observe, async (page, box, itemId) => {
    // Preserve the complete final prefix input before deliberately moving to EOF.
    // The model binds only this input to its permitted prefix states; the check
    // also requires continuity with the preceding full step observation.
    observe('collisionPreInput', await box.evaluate((el: HTMLTextAreaElement) => ({ value: el.value, selection: [el.selectionStart, el.selectionEnd] })));
    await box.focus(); await box.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(el.value.length, el.value.length));
    await page.keyboard.insertText(p.suffix);
    observe('collisionInput', await box.inputValue());
    await box.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, el.value.length));
    const candidates: import('@playwright/test').Response[] = [];
    const collect = (response: import('@playwright/test').Response) => { if (response.url().endsWith('/api/preview')) candidates.push(response); };
    page.on('response', collect);
    try {
      const button = page.locator('.ed-tools [data-action="md-code"]');
      if (p.activation === 'click') await button.click(); else { await button.focus(); await page.keyboard.press(p.activation); }
      const source = await box.inputValue(); await captureBrowserCalls(page);
      observe('collisionSelection', await box.evaluate((el: HTMLTextAreaElement) => ({ text: el.value.slice(el.selectionStart, el.selectionEnd), bodyStart: el.selectionStart - el.value.indexOf('\n') - 1, bodyEnd: el.selectionEnd - el.value.indexOf('\n') - 1,
        afterNewline: el.value[el.selectionStart - 1] === '\n', beforeNewline: el.value[el.selectionEnd] === '\n', focused: document.activeElement === el })));
      observe('collisionEnvelope', await box.evaluate((el: HTMLTextAreaElement) => ({ before: el.value.slice(0, el.selectionStart), after: el.value.slice(el.selectionEnd) })));
      const matches = (response: import('@playwright/test').Response) => response.url().endsWith('/api/preview') && response.request().method() === 'POST' && response.request().postDataJSON()?.itemId === itemId && response.request().postDataJSON()?.contentMd === source;
      const response = candidates.find(matches) ?? await page.waitForResponse(matches); await response.finished();
      const rendered = await response.json();
      await page.waitForFunction(html => { const probe = document.createElement('div'); probe.innerHTML = html; return document.querySelector('#preview-body')?.innerHTML === probe.innerHTML; }, rendered.html);
      observe('collisionRendered', await page.locator('#preview-body').evaluate(el => ({ blocks: [...el.querySelectorAll('pre > code')].map(code => code.textContent), children: el.childElementCount })));
    } finally { page.off('response', collect); }
  });
}

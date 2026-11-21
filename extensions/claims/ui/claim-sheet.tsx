// The claim form: plain questions in, a checkable claim block out. The same
// answers and the same mistake checks as blyggi.com's composer (core/compose.ts),
// laid out as one sheet in the Studio's own style.

import { useMemo, useState } from 'react';
import { Button, Sheet } from '../../../src/ui/extension-api.ts';
import type { Check, Op } from './core/check.ts';
import { describeCheck, mistakes, toClaim, withCatchAll, type Draft } from './core/compose.ts';
import { SOMETHING_ELSE, type Pick, type Shape } from './core/shapes.ts';
import { INDICATORS, PUBLISHERS, REGISTERS, grouped } from './core/sources.ts';
import type { ClaimBlock } from './core/types.ts';
import { fenced } from './blocks.ts';

type Kind = 'binary' | 'one' | 'set' | 'order' | 'quantity' | 'record';
type How = 'data' | 'record' | 'web' | 'people' | 'author';

const KINDS: [Kind, string][] = [
  ['binary', 'Yes or no'],
  ['one', 'Pick one'],
  ['set', 'Which make it'],
  ['order', 'Ranking'],
  ['quantity', 'A number'],
  ['record', 'Just record it'],
];
const HOWS: [How, string][] = [
  ['data', 'Published data'],
  ['record', 'Official record'],
  ['web', 'A web page'],
  ['people', 'Named people'],
  ['author', 'I decide'],
];
const OPS: [Op, string][] = [
  ['>', 'rises above'],
  ['>=', 'is at least'],
  ['<', 'falls below'],
  ['<=', 'is at most'],
];

const kindOf = (d: Draft): Kind => (d.shape === 'choice' ? (d.pick ?? 'one') : d.shape);
const today = () => new Date().toISOString().slice(0, 10);
const num = (s: string): number | undefined => (s.trim() === '' || !Number.isFinite(Number(s)) ? undefined : Number(s));

/** Form state that isn't in the draft itself: how the check is being built. */
interface CheckForm {
  how?: How;
  indicator: string;
  provider: string;
  series: string;
  period: string;
  registry: string;
  id: string;
  event: string;
  url: string;
  pointer: string;
  op: Op;
  threshold: string;
  people: string;
  evidence: string;
}

function formFromCheck(check: Check | undefined): CheckForm {
  const f: CheckForm = { indicator: '', provider: 'owid', series: '', period: '', registry: 'congress', id: '', event: '', url: '', pointer: '', op: '>', threshold: '', people: '', evidence: '' };
  if (!check) return f;
  if ('op' in check && check.op) {
    f.op = check.op;
    f.threshold = check.threshold === undefined ? '' : String(check.threshold);
  }
  switch (check.oracle) {
    case 'data_series': {
      const [series, date = ''] = check.value.split('@');
      const ind = INDICATORS.find((i) => i.provider === check.provider && i.series === series);
      return { ...f, how: 'data', indicator: ind ? `${ind.provider}|${ind.series}` : 'other', provider: check.provider, series, period: date };
    }
    case 'record':
      return { ...f, how: 'record', registry: check.registry, id: check.id, event: check.event };
    case 'web_data':
      return { ...f, how: 'web', url: check.url, pointer: check.pointer };
    case 'judgment':
      return check.by === 'author' ? { ...f, how: 'author', evidence: check.evidence ?? '' } : { ...f, how: 'people', people: check.by.join(', '), evidence: check.evidence ?? '' };
    default:
      return f;
  }
}

function frequencyOf(f: CheckForm): 'monthly' | 'quarterly' | 'annual' | undefined {
  if (f.how !== 'data' || f.indicator === 'other' || !f.indicator) return undefined;
  const [provider, series] = f.indicator.split('|');
  return INDICATORS.find((i) => i.provider === provider && i.series === series)?.frequency;
}

/** The period box holds a year, a month or a date; the check wants the first day of the period. */
function periodDate(period: string, frequency: string | undefined): string {
  if (!period) return '';
  if (frequency === 'annual' || /^\d{4}$/.test(period)) return `${period.slice(0, 4)}-01-01`;
  if (/^\d{4}-\d{2}$/.test(period)) return `${period}-01`;
  return period;
}

function buildCheck(f: CheckForm, shape: Shape, resolvesBy: string): Check | undefined {
  const cmp = shape === 'binary' && num(f.threshold) !== undefined ? { op: f.op, threshold: num(f.threshold)! } : {};
  switch (f.how) {
    case 'data': {
      const [provider, series] = f.indicator && f.indicator !== 'other' ? f.indicator.split('|') : [f.provider, f.series.trim()];
      if (!series) return undefined;
      const date = periodDate(f.period, frequencyOf(f));
      return { oracle: 'data_series', provider, value: date ? `${series}@${date}` : series, as_of: resolvesBy || today(), ...cmp } as Check;
    }
    case 'record':
      return f.id.trim() && f.event.trim() ? ({ oracle: 'record', registry: f.registry, id: f.id.trim(), event: f.event.trim() } as Check) : undefined;
    case 'web':
      return f.url.trim() ? ({ oracle: 'web_data', url: f.url.trim(), pointer: f.pointer.trim() || 'the value shown on the page', ...cmp } as Check) : undefined;
    case 'people': {
      const by = f.people.split(',').map((s) => s.trim()).filter(Boolean);
      return by.length ? { oracle: 'judgment', by, ...(f.evidence.trim() ? { evidence: f.evidence.trim() } : {}) } : undefined;
    }
    case 'author':
      return { oracle: 'judgment', by: 'author', ...(f.evidence.trim() ? { evidence: f.evidence.trim() } : {}) };
    default:
      return undefined;
  }
}

export interface ClaimSheetProps {
  /** The draft to start from: a claim already in the text, or the selected words as the statement. */
  start: Draft;
  editing: boolean;
  close: () => void;
  onDone: (claim: ClaimBlock) => void;
}

export function ClaimSheet({ start, editing, close, onDone }: ClaimSheetProps) {
  const [d, setD] = useState<Draft>(start);
  const [f, setF] = useState<CheckForm>(() => formFromCheck(start.check));
  const [showBlock, setShowBlock] = useState(false);
  // Problems that stop a claim wait until someone tries to insert it; suggestions show as they apply.
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<Draft>) => setD((now) => ({ ...now, ...patch }));
  const setForm = (patch: Partial<CheckForm>) => setF((now) => ({ ...now, ...patch }));
  const kind = kindOf(d);

  const setKind = (k: Kind) => {
    if (k === 'binary' || k === 'quantity' || k === 'record') return set({ shape: k });
    const options = d.options?.length ? d.options : [{ label: '' }, { label: '' }];
    set({ shape: 'choice', pick: k as Pick, options, rankOnly: k === 'order' ? true : d.rankOnly, size: k === 'one' ? undefined : d.size ?? 1 });
  };

  const draft: Draft = useMemo(() => {
    const check = d.shape === 'record' ? undefined : buildCheck(f, d.shape, d.resolvesBy);
    const options = d.shape === 'choice' && d.pick === 'one' && !d.rankOnly ? withCatchAll(d.options ?? []) : d.options;
    return { ...d, options, check };
  }, [d, f]);
  const found = mistakes(draft, { today: today(), frequency: frequencyOf(f) });
  const stops = found.filter((m) => m.level === 'stop');
  const shown = found.filter((m) => m.level === 'warn' || tried);
  const claim = toClaim(draft);

  const options = d.options ?? [];
  const setOption = (i: number, patch: Partial<{ label: string; percent?: number }>) =>
    set({ options: options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });
  const usePercent = kind !== 'order' && !d.rankOnly;
  const freq = frequencyOf(f);
  const publisher = PUBLISHERS[f.provider];
  const register = REGISTERS[f.registry];

  return (
    <Sheet open onClose={close} title={editing ? 'Edit claim' : 'Make a claim'} description="Answer in plain words. The claim goes into your post as a block anyone can check.">
      <div className="claims-form" data-extension-sheet="claims">
        <label className="field">
          <span>What do you think will happen?</span>
          <textarea className="claims-statement" rows={2} value={d.statement} onChange={(e) => set({ statement: e.target.value })} placeholder="e.g. Renewables make more than 36% of the world's electricity in 2027" />
        </label>

        <div className="claims-group" role="group" aria-label="Kind of claim">
          <span className="claims-label">What kind of claim?</span>
          <div className="segmented claims-wrap">
            {KINDS.map(([k, label]) => (
              <button key={k} type="button" className="seg" aria-pressed={kind === k} onClick={() => setKind(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {kind === 'binary' ? (
          <label className="field">
            <span>
              How sure are you? <b className="claims-big">{Math.round((d.probability ?? 0.5) * 100)}%</b>
            </span>
            <input type="range" min={1} max={99} value={Math.round((d.probability ?? 0.5) * 100)} onChange={(e) => set({ probability: Number(e.target.value) / 100 })} className="claims-range" />
          </label>
        ) : null}

        {d.shape === 'choice' ? (
          <div className="claims-group">
            <span className="claims-label">{kind === 'order' ? 'The outcomes, in the order you expect' : 'The outcomes'}</span>
            <ol className="claims-options">
              {options.map((o, i) => (
                <li key={i}>
                  <input type="text" value={o.label} placeholder={`Outcome ${i + 1}`} aria-label={`Outcome ${i + 1}`} onChange={(e) => setOption(i, { label: e.target.value })} />
                  {usePercent ? (
                    <span className="claims-pct">
                      <input type="number" min={0} max={100} value={o.percent ?? ''} aria-label={`Chance of outcome ${i + 1}, percent`} onChange={(e) => setOption(i, { percent: num(e.target.value) })} />%
                    </span>
                  ) : null}
                  {options.length > 2 ? (
                    <button type="button" className="link-btn" aria-label={`Remove outcome ${i + 1}`} onClick={() => set({ options: options.filter((_, j) => j !== i) })}>
                      ×
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
            <div className="claims-row">
              <button type="button" className="btn btn-ghost btn-mini" onClick={() => set({ options: [...options, { label: '' }] })}>
                add an outcome
              </button>
              {kind !== 'order' ? (
                <label className="claims-inline">
                  <input type="checkbox" checked={!!d.rankOnly} onChange={(e) => set({ rankOnly: e.target.checked })} /> no percentages
                </label>
              ) : null}
            </div>
            {kind === 'one' && usePercent ? <p className="hint">“{SOMETHING_ELSE}” is added for you, so the list covers every outcome.</p> : null}
            {kind === 'set' || kind === 'order' ? (
              <label className="field claims-short">
                <span>{kind === 'set' ? 'How many make it?' : 'How many places are you ranking?'}</span>
                <input type="number" min={1} value={d.size ?? ''} onChange={(e) => set({ size: num(e.target.value) })} />
              </label>
            ) : null}
          </div>
        ) : null}

        {kind === 'quantity' ? (
          <div className="claims-group">
            <span className="claims-label">Your range</span>
            <div className="claims-row">
              <input type="number" aria-label="Low end" placeholder="low" value={d.low ?? ''} onChange={(e) => set({ low: num(e.target.value) })} />
              <span>to</span>
              <input type="number" aria-label="High end" placeholder="high" value={d.high ?? ''} onChange={(e) => set({ high: num(e.target.value) })} />
              <input type="text" aria-label="Unit" placeholder="unit" className="claims-unit" value={d.unit ?? ''} onChange={(e) => set({ unit: e.target.value })} />
            </div>
            <label className="field">
              <span>
                How sure that it lands in that range? <b className="claims-big">{Math.round((d.confidence ?? 0.8) * 100)}%</b>
              </span>
              <input type="range" min={50} max={95} step={5} value={Math.round((d.confidence ?? 0.8) * 100)} onChange={(e) => set({ confidence: Number(e.target.value) / 100 })} className="claims-range" />
            </label>
          </div>
        ) : null}

        <label className="field claims-short">
          <span>{kind === 'record' ? 'Look back on it by' : 'Known by'}</span>
          <input type="date" min={today()} value={d.resolvesBy} onChange={(e) => set({ resolvesBy: e.target.value })} />
        </label>

        {kind !== 'record' ? (
          <div className="claims-group" role="group" aria-label="How it will be checked">
            <span className="claims-label">How will anyone check it?</span>
            <div className="segmented claims-wrap">
              {HOWS.map(([h, label]) => (
                <button key={h} type="button" className="seg" aria-pressed={f.how === h} onClick={() => setForm({ how: f.how === h ? undefined : h })}>
                  {label}
                </button>
              ))}
            </div>

            {f.how === 'data' ? (
              <>
                <label className="field">
                  <span>Which figure?</span>
                  <select value={f.indicator} onChange={(e) => setForm({ indicator: e.target.value })}>
                    <option value="">Choose…</option>
                    {INDICATORS.map((i) => (
                      <option key={`${i.provider}|${i.series}`} value={`${i.provider}|${i.series}`}>
                        {i.name} ({i.where}, {PUBLISHERS[i.provider]?.name})
                      </option>
                    ))}
                    <option value="other">Another series…</option>
                  </select>
                </label>
                {f.indicator === 'other' ? (
                  <>
                    <label className="field">
                      <span>Published by</span>
                      <select value={f.provider} onChange={(e) => setForm({ provider: e.target.value })}>
                        {grouped(PUBLISHERS).map(([group, list]) => (
                          <optgroup key={group} label={group}>
                            {list.map(([key, p]) => (
                              <option key={key} value={key}>
                                {p.name} ({p.covers})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>The series</span>
                      <input type="text" value={f.series} placeholder={publisher?.hint} onChange={(e) => setForm({ series: e.target.value })} />
                    </label>
                  </>
                ) : null}
                {f.indicator ? (
                  <label className="field claims-short">
                    <span>For which period?</span>
                    {freq === 'annual' ? (
                      <input type="number" min={1990} max={2100} placeholder="2027" value={f.period.slice(0, 4)} onChange={(e) => setForm({ period: e.target.value })} />
                    ) : (
                      <input type="month" value={f.period.slice(0, 7)} onChange={(e) => setForm({ period: e.target.value })} />
                    )}
                  </label>
                ) : null}
              </>
            ) : null}

            {f.how === 'record' ? (
              <>
                <label className="field">
                  <span>Which register?</span>
                  <select value={f.registry} onChange={(e) => setForm({ registry: e.target.value })}>
                    {grouped(REGISTERS).map(([group, list]) => (
                      <optgroup key={group} label={group}>
                        {list.map(([key, r]) => (
                          <option key={key} value={key}>
                            {r.name} ({r.covers})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>The record</span>
                  <input type="text" value={f.id} placeholder={register?.hint} onChange={(e) => setForm({ id: e.target.value })} />
                </label>
                <label className="field">
                  <span>What has to appear in it?</span>
                  <input type="text" value={f.event} placeholder="e.g. became law, approved, published" onChange={(e) => setForm({ event: e.target.value })} />
                </label>
              </>
            ) : null}

            {f.how === 'web' ? (
              <>
                <label className="field">
                  <span>The page</span>
                  <input type="url" value={f.url} placeholder="https://…" onChange={(e) => setForm({ url: e.target.value })} />
                </label>
                <label className="field">
                  <span>Which value on it?</span>
                  <input type="text" value={f.pointer} placeholder="e.g. the top row's score" onChange={(e) => setForm({ pointer: e.target.value })} />
                </label>
              </>
            ) : null}

            {(f.how === 'data' || f.how === 'web') && kind === 'binary' ? (
              <div className="claims-row">
                <span>It comes true if the value</span>
                <select value={f.op} aria-label="Comparison" onChange={(e) => setForm({ op: e.target.value as Op })}>
                  {OPS.map(([op, label]) => (
                    <option key={op} value={op}>
                      {label}
                    </option>
                  ))}
                </select>
                <input type="number" aria-label="Threshold" className="claims-num" value={f.threshold} onChange={(e) => setForm({ threshold: e.target.value })} />
              </div>
            ) : null}

            {f.how === 'people' ? (
              <label className="field">
                <span>Who decides?</span>
                <input type="text" value={f.people} placeholder="Names or blygs, separated by commas" onChange={(e) => setForm({ people: e.target.value })} />
              </label>
            ) : null}
            {f.how === 'people' || f.how === 'author' ? (
              <label className="field">
                <span>From what evidence? (optional)</span>
                <input type="text" value={f.evidence} placeholder="e.g. the final score on ESPN" onChange={(e) => setForm({ evidence: e.target.value })} />
              </label>
            ) : null}
            {draft.check ? <p className="hint claims-criteria">{describeCheck(draft.check)}</p> : null}
          </div>
        ) : null}

        {shown.length ? (
          <ul className="claims-mistakes" aria-live="polite">
            {shown.map((m) => (
              <li key={m.message} className={m.level === 'stop' ? 'claims-stop' : 'claims-warn'}>
                {m.message}
              </li>
            ))}
          </ul>
        ) : null}

        <button type="button" className="link-btn claims-toggle" aria-expanded={showBlock} onClick={() => setShowBlock(!showBlock)}>
          {showBlock ? 'hide the block' : 'show the block that goes in your post'}
        </button>
        {showBlock ? <pre className="claims-block">{fenced(claim)}</pre> : null}

        <div className="sheet-actions">
          <Button className="btn btn-primary" onClick={() => (stops.length ? setTried(true) : onDone(claim))}>
            {editing ? 'Update claim' : 'Insert claim'}
          </Button>
          <Button className="btn btn-ghost" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

/*
 * The setup wizard (session 46): every setting a new owner should decide,
 * one step at a time, each showing what it is now and what it would be by
 * default. A fresh install is greeted with it; an existing node is told once
 * that it exists; Settings can run it again whenever. Nothing is written until
 * Review, and then only what changed. The last step, Read, comes after the save
 * and opens Discover, since subscribing writes at once (session 82).
 *
 * After an upgrade it is also the what's-new cue (whats-new.ts): the banner
 * names the new release's highlights, and /setup?new=1 walks only the steps
 * with settings added since the owner's setupSeenVersion, each marked new.
 */
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import type { Settings } from '../../sdk/dist/browser.js';
import { settings } from './data.ts';
import { Button, Failure, mount, useChrome, useSettings } from './components.tsx';
import { CHANGELOG_DISPLAY_OPTIONS, MODE_OPTIONS, ModelField, ModelSettings, READER_MARK_READ_OPTIONS, READER_ORDER_OPTIONS, StudioThemeField, parseLinks, useAiModels } from './settings.tsx';
import { DiscoverSheet } from './discover.tsx';
import { whatsNew } from './whats-new.ts';
import { CLIENT } from '../client.ts';
import { THEMES, CUSTOM_THEME_ID } from '../themes.ts';
import { FONTS } from '../fonts.ts';
import { DEFAULT_FEED_ORDER, FEED_ALGORITHMS } from '../feeds/index.ts';
import './reading.css';
import './setup.css';

type Key =
  | "siteTitle" | "authorName" | "authorUrl" | "authorBio" | "siteUrl" | 'timezone'
  | 'defaultVisibility'
  | 'theme' | 'studioTheme' | 'font' | "highlightGeneratedDefault" | 'changelogDisplay'
  | "feedOrder"
  | 'readerOrder' | 'readerMarkRead' | 'readerChangelogDisplay' | 'agenticTitle'
  | "pickerTyping" | "autoChangeNotes" | "aiModelTk" | "aiModelChangelog" | "aiModelFeed" | 'aiModelHelpers' | 'aiModelClassify' | 'changeCategoryInNote' | "aiStylePrompt"
  | "acceptMentions" | "showResponsesDefault" | "updateCheck" | 'hopperFeeds';
type Draft = Pick<Settings, Key>;

const LABELS: Record<Key, string> = {
  siteTitle: 'Title of your blyg',
  authorName: 'Your name',
  authorUrl: 'Your page (blank: this blyg)',
  authorBio: 'A line about you',
  siteUrl: 'Canonical address (blank: from each request)',
  timezone: 'Timezone for dates',
  defaultVisibility: 'Default for new items',
  theme: 'Theme',
  studioTheme: 'Studio theme',
  font: 'Typeface',
  highlightGeneratedDefault: 'Highlight generated text',
  changelogDisplay: 'On your item pages, show',
  feedOrder: 'Home page order',
  readerOrder: 'Order what you read',
  readerMarkRead: 'Count an entry as read',
  readerChangelogDisplay: 'In your reader, for blyg items, show',
  agenticTitle: 'Name of the Agentic feed tab',
  pickerTyping: 'Search in the [[ picker by typing in',
  autoChangeNotes: 'Draft a change note when you leave it empty',
  aiModelTk: 'Model for TK generation',
  aiModelChangelog: 'Model for change notes',
  aiModelFeed: 'Model for feed scoring',
  aiModelHelpers: 'Model for text helpers',
  aiModelClassify: 'Model for the change classifier',
  changeCategoryInNote: 'Start the change note with the label',
  aiStylePrompt: 'House style for generated text',
  acceptMentions: 'Accept mentions from other blygs',
  showResponsesDefault: 'Show responses under posts',
  updateCheck: 'Tell me when a new release is out',
  hopperFeeds: 'Give each public collection its own RSS feed',
};

// The radio settings, with Settings' own choices: [value, label, hint].
const CHOICES: Partial<Record<Key, readonly (readonly [string, string, string])[]>> = {
  defaultVisibility: MODE_OPTIONS,
  changelogDisplay: CHANGELOG_DISPLAY_OPTIONS,
  readerChangelogDisplay: CHANGELOG_DISPLAY_OPTIONS,
  readerOrder: READER_ORDER_OPTIONS,
  readerMarkRead: READER_MARK_READ_OPTIONS,
};

const STEPS: { id: string; title: string; intro: string; keys: Key[] }[] = [
  { id: 'identity', title: 'You', intro: 'Who this blyg belongs to and where it lives. All of it appears on your public pages and in your feeds.', keys: ["siteTitle", "authorName", "authorUrl", "authorBio", "siteUrl", 'timezone'] },
  { id: 'mode', title: 'Mode', intro: 'What adding a version does to an item that has never been public. Each item can still go either way when you publish it, and an item that has gone public stays public.', keys: ['defaultVisibility'] },
  { id: 'look', title: 'Look', intro: 'How your public pages read, and the studio\'s own palette.', keys: ['theme', 'studioTheme', 'font', "highlightGeneratedDefault", 'changelogDisplay'] },
  { id: 'home', title: 'Home page', intro: 'Blygger keeps time two ways: what is new, and what keeps mattering. Your home page shows one of them; feeds and the archive are always newest first. Once you have published a thread, you can make it a static front page instead, from its ⋯ menu.', keys: ["feedOrder"] },
  { id: 'reading', title: 'Reading', intro: 'How your reader orders and keeps track of what you follow. The Background lens and its rules are in Settings.', keys: ['readerOrder', 'readerMarkRead', 'readerChangelogDisplay', 'agenticTitle'] },
  { id: 'writing', title: 'Writing and AI', intro: 'How the editor behaves, and which models do the AI work. With no model chosen, nothing calls one.', keys: ["pickerTyping", "autoChangeNotes", "aiModelTk", "aiModelChangelog", "aiModelFeed", 'aiModelHelpers', 'aiModelClassify', 'changeCategoryInNote', "aiStylePrompt"] },
  { id: 'network', title: 'Others', intro: 'How your blyg meets other blygs, and whether it checks for updates.', keys: ["acceptMentions", "showResponsesDefault", "updateCheck", 'hopperFeeds'] },
];
/** After Review: Discover, once the settings are saved. */
const READ_STEP = 'Read';
const ALL_KEYS = STEPS.flatMap((step) => step.keys);

const linksText = (links: Settings["authorLinks"]) => links.map((link) => `${link.label} | ${link.url}`).join('\n');

/** A value as a person reads it. */
function shown(key: Key, value: unknown, initial: Settings): string {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (value === '' || value == null) {
    return key === 'studioTheme' ? 'same as your pages' : 'blank';
  }
  if (key === 'theme') return value === 'auto' ? 'Automatic' : value === CUSTOM_THEME_ID ? 'Custom' : (THEMES[value as string]?.label ?? String(value));
  if (key === 'font') return FONTS[value as string]?.label ?? String(value);
  if (key === 'studioTheme') return value === 'auto' ? 'Automatic' : value === CUSTOM_THEME_ID ? 'Custom' : (THEMES[value as string]?.label ?? String(value));
  const choice = CHOICES[key]?.find(([id]) => id === value);
  if (choice) return choice[1];
  if (key === "feedOrder") return orders(initial).find((o) => o.id === value)?.title ?? String(value);
  return String(value);
}

const orders = (initial: Settings) => initial.feedOrders ?? FEED_ALGORITHMS;

export function SetupPage() {
  useChrome({ framed: false, tabs: false });
  const row = useSettings();
  const { new: onlyNew } = useSearch({ from: '/setup' });
  return row ? <Wizard key={onlyNew ? "new" : "all"} initial={row} onlyNew={!!onlyNew} /> : <p className="view-sub">Loading settings…</p>;
}

function Wizard({ initial, onlyNew }: { initial: Settings; onlyNew: boolean }) {
  const navigate = useNavigate();
  // Fixed when the walk opens: saving moves setupSeenVersion, and the steps must not change under the Read step.
  const [news] = useState(() => whatsNew(initial.setupSeenVersion, CLIENT.version));
  const fresh = new Set(news.keys);
  // What's new walks only the steps with new settings; with none left, the whole walk-through.
  const newSteps = STEPS.filter((s) => s.keys.some((key) => fresh.has(key)));
  const whatsNewMode = onlyNew && newSteps.length > 0;
  const steps = whatsNewMode ? newSteps : STEPS;
  const defaults = (initial.defaults ?? {}) as Partial<Draft>;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => {
    const copy = Object.fromEntries(ALL_KEYS.map((key) => [key, initial[key]])) as Draft;
    // As Settings does: an unset zone starts as this device's.
    if (!copy.timezone) copy.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return copy;
  });
  const [links, setLinks] = useState(linksText(initial.authorLinks));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [finished, setFinished] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const aiModels = useAiModels();
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((d) => ({ ...d, [key]: value }));
  // Each step starts at its top; a long step would otherwise open the next mid-page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);
  const changed = ALL_KEYS.filter((key) => draft[key] !== initial[key]);
  const linksChanged = links.trim() !== linksText(initial.authorLinks).trim();
  const review = step === steps.length;

  const finish = async (save: boolean) => {
    setBusy(true);
    setError(undefined);
    try {
      // Finishing or skipping either way marks everything up to now as seen.
      const patch: Partial<Settings> = { setup: 'done', setupSeenVersion: news.latest };
      if (save) {
        for (const key of changed) Object.assign(patch, { [key]: draft[key] });
        // The derived title is stored as "" so it keeps following the address.
        if (patch.siteTitle !== undefined && patch.siteTitle === defaults.siteTitle) patch.siteTitle = '';
        if (linksChanged) patch.authorLinks = parseLinks(links);
      }
      await settings.update('settings', (row) => {
        Object.assign(row, patch);
      }).when('settled');
      // Arriving at Read opens Discover: the offer is the step. A what's-new
      // walk opens it only when Read itself is new.
      if (save) { setFinished(true); setDiscovering(!whatsNewMode || fresh.has('read')); }
      else await navigate({ to: '/' });
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  const stepList = (current: number, done: boolean) => (
    <ol className="setup-steps" aria-label="steps">
      {[...steps.map((s) => s.title), 'Review', READ_STEP].map((title, i) => (
        <li key={title} aria-current={i === current ? 'step' : undefined}>
          {/* Read follows the save; the steps before it are closed once saved. */}
          {done || i > steps.length ? <span>{i + 1}. {title}</span> : <button type="button" className="linkish" onClick={() => setStep(i)}>{i + 1}. {title}</button>}
        </li>
      ))}
    </ol>
  );

  // Read is a step after the save, not before it: subscribing writes at once,
  // and the steps before Review promise nothing is written until then.
  if (finished)
    return (
      <div className="setup" id="setup-done">
        <h2 className="view-h">Your blyg is set up</h2>
        {stepList(steps.length + 1, true)}
        <section className="card" data-step="read">
          <h3 className="card-h">{READ_STEP}</h3>
          <p>
            Your settings are saved. Now find a few blygs to read: blygger.com lists the ones that have asked to be found,
            with who writes each and how active it is. Tick some and subscribe; you can unfollow any of them later.
          </p>
          <p className="hint">Every choice can be changed in Settings, and this walk-through can be run again from there. Later, ✦ on the reading page opens the same list.</p>
          <p className="setup-nav">
            <Button className="btn btn-primary" id="setup-discover" onClick={() => setDiscovering(true)}>discover blygs</Button>
            <a className="btn btn-ghost" href={`${mount}/`} target="_blank" rel="noreferrer">see your home page ↗</a>
            <Link className="btn btn-ghost" to="/">start writing</Link>
          </p>
        </section>
        <DiscoverSheet open={discovering} onClose={() => setDiscovering(false)} />
      </div>
    );

  const row = (key: Key, control: ReactNode, hint?: ReactNode) => {
    const isChanged = draft[key] !== initial[key];
    const atDefault = !(key in defaults) || draft[key] === defaults[key];
    return (
      <div className="field setup-row" data-setting={key} key={key}>
        <label htmlFor={`setup-${key}`}>
          <span>{LABELS[key]}</span>
          {whatsNewMode && fresh.has(key) ? <span className="badge badge-pencil setup-new">new</span> : null}
        </label>
        {control}
        {hint ? <p className="hint">{hint}</p> : null}
        <p className="setup-meta">
          {isChanged ? (
            <>
              <span>was {shown(key, initial[key], initial)}</span>
              <button type="button" className="linkish" onClick={() => change(key, initial[key])}>keep it</button>
            </>
          ) : (
            <span>current</span>
          )}
          {atDefault ? (
            <span className="setup-default">· the default</span>
          ) : (
            <button type="button" className="linkish" data-reset={key} onClick={() => change(key, defaults[key] as Settings[Key])}>
              reset to default ({shown(key, defaults[key], initial)})
            </button>
          )}
        </p>
      </div>
    );
  };
  const text = (key: Key, multiline = false, type = 'text') =>
    row(
      key,
      multiline ? (
        <textarea id={`setup-${key}`} rows={3} value={draft[key] as string} onChange={(e) => change(key, e.target.value)} />
      ) : (
        <input id={`setup-${key}`} type={type} value={draft[key] as string} onChange={(e) => change(key, e.target.value)} />
      ),
    );
  const check = (key: Key, hint?: ReactNode) =>
    row(
      key,
      <label className="check">
        <input id={`setup-${key}`} type="checkbox" checked={draft[key] as boolean} onChange={(e) => change(key, e.target.checked)} />
        <span>{draft[key] ? 'on' : 'off'}</span>
      </label>,
      hint,
    );
  const select = (key: Key, options: [string, string][]) =>
    row(
      key,
      <select id={`setup-${key}`} value={draft[key] as string} onChange={(e) => change(key, e.target.value)}>
        {options.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>,
    );

  const choices = (key: Key, hint?: ReactNode) =>
    row(
      key,
      <div role="radiogroup" aria-label={LABELS[key]} className="setup-choices">
        {CHOICES[key]!.map(([value, label, about]) => (
          <label className="check" key={value}>
            <input type="radio" name={`setup-${key}`} value={value} checked={draft[key] === value} onChange={() => change(key, value as Settings[Key])} />
            <span>
              {label} <span className="hint">{about}</span>
            </span>
          </label>
        ))}
      </div>,
      hint,
    );

  const body: Record<string, ReactNode> = {
    identity: (
      <>
        {text("siteTitle")}
        {text("authorName")}
        {text("authorUrl", false, 'url')}
        {text("authorBio", true)}
        <div className="field setup-row" data-setting="authorLinks">
          <label htmlFor="setup-author_links"><span>Links about you, one per line as label | url</span></label>
          <textarea id="setup-author_links" rows={3} value={links} onChange={(e) => setLinks(e.target.value)} />
          <p className="setup-meta">
            {linksChanged ? <button type="button" className="linkish" onClick={() => setLinks(linksText(initial.authorLinks))}>keep the current links</button> : <span>current</span>}
          </p>
        </div>
        {text("siteUrl", false, 'url')}
        {select('timezone', [...new Set(['', draft.timezone, ...Intl.supportedValuesOf('timeZone')])].map((zone) => [zone, zone || 'UTC (unset)']))}
        <p className="hint">Your picture is set in Settings, where it can be uploaded.</p>
      </>
    ),
    mode: choices('defaultVisibility', 'Tools and agents follow this too: in Notebook mode they make an item public only by asking for it.'),
    look: (
      <>
        {select('theme', [
          ['auto', 'Automatic (light or dark with the device)'],
          ...Object.entries(THEMES).map(([id, theme]) => [id, theme.label] as [string, string]),
          ...(initial.customTheme ? [[CUSTOM_THEME_ID, initial.customThemeName || 'Custom'] as [string, string]] : []),
        ])}
        <p className="hint">Make or share a custom theme in Settings.</p>
        {select('font', Object.entries(FONTS).map(([id, font]) => [id, font.label]))}
        {check("highlightGeneratedDefault", 'Text written by [TK] generation shows in a tinted box on your public pages. A post can override it.')}
        {row('studioTheme', <StudioThemeField form={{ ...initial, ...draft }} change={change} />)}
        {choices('changelogDisplay', 'A summary reads only the notes, never the text, and is labelled as AI-written.')}
      </>
    ),
    reading: (
      <>
        {choices('readerOrder', 'Collections and the Shelf keep their own order.')}
        {choices('readerMarkRead')}
        {choices('readerChangelogDisplay')}
        {text('agenticTitle')}
      </>
    ),
    home: row(
      "feedOrder",
      <div role="radiogroup" aria-label={LABELS.feedOrder} className="setup-choices">
        {orders(initial).map((order) => (
          <label className="check" key={order.id}>
            <input type="radio" name="setup-feed_order" value={order.id} checked={draft.feedOrder === order.id} onChange={() => change("feedOrder", order.id)} />
            <span>
              {order.title}
              {order.id === DEFAULT_FEED_ORDER ? ' (recommended)' : ''} <span className="hint">{order.description}</span>
            </span>
          </label>
        ))}
      </div>,
    ),
    writing: (
      <>
        {select("pickerTyping", [
          ['auto', 'Automatic: the editor with a mouse, the picker on touch'],
          ['editor', 'The editor'],
          ['panel', 'The picker'],
        ])}
        {check("autoChangeNotes", 'Uses the change-notes model below, so it spends your key.')}
        <ModelSettings form={{ ...initial, ...draft }} change={change} />
        <ModelField fkey="aiModelClassify" label="change classifier" decision manifest={aiModels} form={{ ...initial, ...draft }} change={change} hint="Off unless you choose a model: labels each new version typo, minor or major before you publish it." />
        {draft.aiModelClassify ? check('changeCategoryInNote', 'An empty note becomes the label; a note becomes "minor: your note".') : null}
        {(["aiModelTk", "aiModelChangelog", "aiModelFeed", 'aiModelHelpers', 'aiModelClassify'] as const).map((key) =>
          draft[key] !== initial[key] || draft[key] !== defaults[key] ? (
            <p className="setup-meta" key={key} data-setting={key}>
              <span>{LABELS[key]}: {shown(key, draft[key], initial)}</span>
              {draft[key] !== initial[key] ? <button type="button" className="linkish" onClick={() => change(key, initial[key])}>keep {shown(key, initial[key], initial)}</button> : null}
              {draft[key] !== defaults[key] ? <button type="button" className="linkish" data-reset={key} onClick={() => change(key, defaults[key] as string)}>reset to default ({shown(key, defaults[key], initial)})</button> : null}
            </p>
          ) : null,
        )}
        {text("aiStylePrompt", true)}
      </>
    ),
    network: (
      <>
        {check("acceptMentions", 'When another blyg quotes, stubs or forks your post, it tells yours. Verified mentions show as responses.')}
        {check("showResponsesDefault", 'Each post can override this in its editor.')}
        {check("updateCheck", 'Reads the release feed once a day; nothing about your blyg is sent.')}
        {check('hopperFeeds', 'Each public collection gets a feed at h/<slug>/feed.xml. Off by default; subscribing to someone else\'s collection works either way.')}
      </>
    ),
  };

  return (
    <div className="setup" id="setup">
      <h2 className="view-h">{whatsNewMode ? `What’s new in ${news.highlights[0]?.version ?? news.latest}` : 'Set up your blyg'}</h2>
      {whatsNewMode ? <Highlights items={news.highlights} /> : null}
      {whatsNewMode ? <p className="hint">Only the steps with new settings are here, each marked new. <Link to="/setup" search={{}}>Walk through everything</Link> instead.</p> : null}
      {stepList(step, false)}
      {review ? (
        <section className="card" id="setup-review">
          <h3 className="card-h">Review</h3>
          {changed.length || linksChanged ? (
            <ul className="setup-changes">
              {changed.map((key) => (
                <li key={key} data-setting={key}>
                  <b>{LABELS[key]}</b>: {shown(key, initial[key], initial)} → {shown(key, draft[key], initial)}
                </li>
              ))}
              {linksChanged ? <li data-setting="authorLinks"><b>Links about you</b>: changed</li> : null}
            </ul>
          ) : (
            <p>Nothing changed: your settings stay as they are.</p>
          )}
          <Failure error={error} />
          <p className="setup-nav">
            <Button className="btn btn-ghost" onClick={() => setStep(step - 1)}>← back</Button>
            <Button className="btn btn-primary" id="setup-finish" disabled={busy} onClick={() => void finish(true)}>
              {changed.length || linksChanged ? 'save and finish' : 'finish'}
            </Button>
          </p>
        </section>
      ) : (
        <section className="card" data-step={steps[step].id}>
          <h3 className="card-h">{steps[step].title}</h3>
          <p className="hint">{steps[step].intro}</p>
          {body[steps[step].id]}
          <p className="setup-nav">
            {step > 0 ? <Button className="btn btn-ghost" onClick={() => setStep(step - 1)}>← back</Button> : null}
            <Button className="btn btn-primary" id="setup-next" onClick={() => setStep(step + 1)}>next →</Button>
          </p>
        </section>
      )}
      <p className="setup-skip">
        <button type="button" className="linkish" id="setup-skip" disabled={busy} onClick={() => void finish(false)}>
          {whatsNewMode ? 'skip, and keep everything as it is' : 'skip setup and keep everything as it is'}
        </button>
      </p>
    </div>
  );
}

function Highlights({ items }: { items: { version: string; items: string[] }[] }) {
  return (
    <ul className="setup-highlights">
      {items.flatMap((release) => release.items.map((line) => <li key={release.version + line}>{line}</li>))}
    </ul>
  );
}

/**
 * Shown across the studio until the wizard is finished or dismissed, and once
 * after each upgrade that brings highlights or new settings (what's new).
 */
export function SetupBanner() {
  const row = useSettings();
  const [error, setError] = useState<unknown>();
  if (!row) return null;
  const news = whatsNew(row.setupSeenVersion, CLIENT.version);
  const dismiss = () =>
    void settings
      .update('settings', (r) => {
        r.setup = 'done';
        r.setupSeenVersion = news.latest;
      })
      .when('settled').catch(setError);
  if (row.setup === 'done') {
    if (!news.keys.length && !news.highlights.length) return null;
    return (
      <div className="setup-banner" id="whats-new-banner" role="region" aria-label="what's new">
        <p>New in {news.highlights[0]?.version ?? news.latest}:</p>
        <Highlights items={news.highlights} />
        <p className="setup-nav">
          {news.keys.length ? <Link className="btn btn-primary btn-mini" id="whats-new-review" to="/setup" search={{ new: true }}>review the new settings</Link> : null}
          <Button className="btn btn-ghost btn-mini" id="whats-new-dismiss" onClick={dismiss}>got it</Button>
        </p>
        <Failure error={error} />
      </div>
    );
  }
  const fresh = row.setup === 'pending';
  return (
    <div className="setup-banner" id="setup-banner" role="region" aria-label="setup">
      <p>
        {fresh
          ? 'Welcome. A short walk through every setting gets your blyg ready, each shown with its default.'
          : 'New: a setup walk-through covers every setting, each shown with its default.'}
      </p>
      <p className="setup-nav">
        <Link className="btn btn-primary btn-mini" to="/setup">{fresh ? 'start setup' : 'open it'}</Link>
        <Button className="btn btn-ghost btn-mini" id="setup-dismiss" onClick={dismiss}>dismiss</Button>
      </p>
      <Failure error={error} />
    </div>
  );
}

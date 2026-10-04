import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import type { Settings } from '../../sdk/dist/browser.js';
import { BlyggerApi, unwrap } from '../../sdk/dist/browser.js';
import { settings, client } from './data.ts';
import {
  Button,
  Failure,
  mount,
  useChrome,
  useSettings,
} from './components.tsx';
import { Link } from '@tanstack/react-router';
import './reading.css';
import { THEMES } from '../themes.ts';
import { CLIENT } from '../client.ts';

const fields = [
  'site_title',
  'theme',
  'author_name',
  'author_bio',
  'author_links',
  'site_url',
  'timezone',
  'avatar_media_id',
  'ai_model',
  'ai_style_prompt',
  'accept_mentions',
  'update_check',
  'show_responses_default',
  'auto_change_notes',
  'update_feed_url',
] as const;
function editable(row: Settings): Settings {
  return Object.fromEntries(fields.map((key) => [key, row[key]])) as Settings;
}
function parseLinks(text: string): Settings['author_links'] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const split = line.indexOf('|');
      if (split < 1 || !line.slice(split + 1).trim())
        throw new Error('Use label | url for each link.');
      return {
        label: line.slice(0, split).trim(),
        url: line.slice(split + 1).trim(),
      };
    });
}
export function SettingsPage() {
  useChrome({ framed: false });
  const row = useSettings();
  return (
    <>
      <Link className="back-link" to="/more">
        ← more
      </Link>
      <h2 className="view-h">settings</h2>
      <div style={{ height: 10 }} />
      {row ? (
        <SettingsForm initial={row} />
      ) : (
        <p className="view-sub">Loading settings…</p>
      )}
    </>
  );
}
function SettingsForm({ initial }: { initial: Settings }) {
  const [form, setForm] = useState(() => {
    const copy = editable(initial);
    if (!copy.timezone)
      copy.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return copy;
  });
  const [links, setLinks] = useState(
    initial.author_links
      .map((link) => `${link.label} | ${link.url}`)
      .join('\n'),
  );
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSaved(false);
    setForm((previous) => ({ ...previous, [key]: value }));
  };
  const zones = [
    ...new Set(['', form.timezone, ...Intl.supportedValuesOf('timeZone')]),
  ];
  const field = (
    key:
      | 'site_title'
      | 'author_name'
      | 'author_bio'
      | 'site_url'
      | 'ai_model'
      | 'ai_style_prompt'
      | 'update_feed_url',
    label: string,
    multiline = false,
    placeholder?: string,
  ) => (
    <div className="field">
      <label htmlFor={key}>
        <span>{label}</span>
      </label>
      {multiline ? (
        <textarea
          id={key}
          rows={3}
          value={form[key]}
          onChange={(event) => change(key, event.target.value)}
        />
      ) : (
        <input
          id={key}
          type={key === 'site_url' || key === 'update_feed_url' ? 'url' : 'text'}
          value={form[key]}
          placeholder={placeholder}
          onChange={(event) => change(key, event.target.value)}
        />
      )}
    </div>
  );
  const toggle = (
    key:
      | 'update_check'
      | 'show_responses_default'
      | 'accept_mentions'
      | 'auto_change_notes',
    label: string,
    hint?: ReactNode,
  ) => (
    <>
      <label className="check">
        <input
          id={key}
          type="checkbox"
          checked={form[key]}
          aria-describedby={hint ? `${key}-hint` : undefined}
          onChange={(event) => change(key, event.target.checked)}
        />
        <span>{label}</span>
      </label>
      {hint ? (
        <p className="hint check-hint" id={`${key}-hint`}>
          {hint}
        </p>
      ) : null}
    </>
  );
  return (
    <form
      className="settings-form"
      id="settings-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError(undefined);
        setSaved(false);
        try {
          const author_links = parseLinks(links);
          await settings.update('settings', (row) => {
            Object.assign(row, form, { author_links });
          }).isPersisted.promise;
          setSaved(true);
        } catch (failure) {
          setError(failure);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Failure error={error} />
      <section className="card">
        <h3 className="card-h">profile</h3>
        {field('site_title', 'Site title')}
        {field('author_name', 'Author name')}
        {field('author_bio', 'Bio', true)}
        <div className="field">
          <label htmlFor="author_links">
            <span>Links (one per line, "label | url")</span>
          </label>
          <textarea
            id="author_links"
            rows={3}
            value={links}
            onChange={(event) => {
              setLinks(event.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="avatar_media_id">
            <span>Avatar media ID</span>
          </label>
          <input
            id="avatar_media_id"
            type="text"
            value={form.avatar_media_id}
            onChange={(event) => change('avatar_media_id', event.target.value)}
          />
        </div>
        <div className="row avatar-row">
          {avatar ? (
            <img src={`${mount}/${avatar}`} alt="Uploaded avatar" />
          ) : null}
          <span className="spacer" />
          <Button
            type="button"
            className="btn btn-ghost btn-mini"
            disabled={busy}
            onClick={() => file.current?.click()}
          >
            upload avatar
          </Button>
          <Button
            type="button"
            className="btn btn-ghost btn-mini"
            onClick={() => {
              change('avatar_media_id', '');
              setAvatar('');
            }}
          >
            clear avatar
          </Button>
        </div>
        <input
          ref={file}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          onChange={async (event) => {
            const selected = event.target.files?.[0];
            event.target.value = '';
            if (!selected) return;
            setBusy(true);
            setError(undefined);
            try {
              const media = await unwrap(
                BlyggerApi.uploadMedia({ client, body: { file: selected } }),
              );
              change('avatar_media_id', media.id);
              setAvatar(media.url);
            } catch (failure) {
              setError(failure);
            } finally {
              setBusy(false);
            }
          }}
        />
      </section>
      <section className="card">
        <h3 className="card-h">theme</h3>
        <div className="field">
          <span>
            Reading theme — your public pages and this studio
          </span>
          <div className="theme-grid" role="radiogroup" aria-label="Reading theme">
            {['auto', ...Object.keys(THEMES)].map((id) => {
              const theme = THEMES[id];
              const automatic = id === 'auto';
              const background = automatic
                ? 'linear-gradient(90deg,#fafbfb 50%,#14191a 50%)'
                : theme.page;
              const ink = automatic
                ? 'linear-gradient(90deg,#1b2426 50%,#e3e7e7 50%)'
                : theme.ink;
              return (
                <label className="theme-opt" key={id}>
                  <input
                    type="radio"
                    name="theme"
                    value={id}
                    checked={form.theme === id}
                    onChange={() => change('theme', id)}
                  />
                  <span className="theme-swatch" style={{ background }}>
                    <span
                      className="sheet-mini"
                      style={{
                        background: automatic ? 'transparent' : theme.paper,
                      }}
                    >
                      <span className="line" style={{ background: ink }} />
                      <span
                        className="line short"
                        style={{ background: ink, opacity: 0.55 }}
                      />
                    </span>
                  </span>
                  <span className="theme-name">
                    {automatic ? 'Auto' : theme.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </section>
      <section className="card">
        <h3 className="card-h">site</h3>
        {field('site_url', 'Canonical site URL (blank = derive from request)')}
        <div className="field">
          <label htmlFor="timezone">
            <span>Timezone for displayed dates</span>
          </label>
          <select
            id="timezone"
            value={form.timezone}
            onChange={(event) => change('timezone', event.target.value)}
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone || 'UTC'}
              </option>
            ))}
          </select>
          {!initial.timezone ? (
            <p className="hint">detected from this device — save to keep it</p>
          ) : null}
          <p className="hint">
            Your blyg runs on a server whose clock is UTC, so without this an
            evening post can show tomorrow’s date. This changes display only, on
            your pages and in the studio. Feed dates stay RFC-822 and item
            documents stay ISO-8601 UTC.
          </p>
        </div>
      </section>
      <section className="card">
        <h3 className="card-h">generation</h3>
        {field(
          'ai_model',
          'AI model for TK generation and drafted notes (required to use either)',
          false,
          'e.g. claude-sonnet-5-5',
        )}
        {field(
          'ai_style_prompt',
          'TK site-level style prompt (optional, appended to every generation request)',
          true,
        )}
        {toggle(
          'auto_change_notes',
          'Automatically generate changelog notes when publishing a new version',
          <>
            When a new version is published with no note, the model above
            drafts one from the change. You see it and can edit it before
            anything is published. A note published exactly as drafted is
            marked as generated in the changelog.
          </>,
        )}
      </section>
      <section className="card">
        <h3 className="card-h">updates</h3>
        {toggle(
          'update_check',
          'Tell me when a newer release of this client exists',
          <>
            On by default. Once a day your blyg fetches the client’s public
            release feed and compares the newest version to the one you are
            running — currently <code>{CLIENT.version}</code>. Nothing about
            your blyg is sent: no URL, no identifier, no query. Before 1.0 the
            wire format can change between releases, so an old client can stop
            making sense to other blygs.
          </>,
        )}
        {field(
          'update_feed_url',
          'Release feed (blank = this client’s own)',
          false,
          'https://github.com/blygger/blygger-studio/releases.atom',
        )}
        <p className="hint">
          Only change this if you have modified the client and track your own
          versions. Point it at your releases, or turn the check off.
        </p>
      </section>
      <section className="card">
        <h3 className="card-h">responses from other blygs</h3>
        {toggle(
          'show_responses_default',
          'Show verified responses on my items’ public pages, by default',
          <>
            Applies to items that have not decided for themselves. An item’s
            override keeps winning if you change this later. Set overrides and
            hide individual responses in the mentions tab. A response list is a
            citation trail with no count.
          </>,
        )}
        {toggle(
          'accept_mentions',
          'Accept Webmentions — let other blygs tell yours when they quote, respond to or fork an item',
          <>
            Unchecking this removes the public Webmention endpoint and its
            discovery links. Requests return 404. You still send mentions when
            you quote other people, and collected responses stay in your Studio.
          </>,
        )}
      </section>
      <div className="save-bar">
        <span className="state">
          {saved ? <span role="status">saved</span> : null}
        </span>
        <Button className="btn btn-primary" type="submit" disabled={busy}>
          save settings
        </Button>
      </div>
    </form>
  );
}

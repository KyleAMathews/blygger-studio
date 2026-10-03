import { useRef, useState } from 'react';
import type { Settings } from '../../sdk/dist/browser.js';
import { BlyggerApi, unwrap } from '../../sdk/dist/browser.js';
import { settings, client } from './data.ts';
import { Button, Failure, mount, useSettings } from './components.tsx';
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
  const row = useSettings();
  return row ? <SettingsForm initial={row} /> : <p>Loading settings…</p>;
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
    <>
      <label htmlFor={key}>{label}</label>
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
          value={form[key]}
          placeholder={placeholder}
          onChange={(event) => change(key, event.target.value)}
        />
      )}
    </>
  );
  const toggle = (
    key: 'update_check' | 'show_responses_default' | 'accept_mentions',
    label: string,
  ) => (
    <p>
      <label style={{ fontWeight: 400 }}>
        <input
          id={key}
          type="checkbox"
          checked={form[key]}
          onChange={(event) => change(key, event.target.checked)}
        />{' '}
        {label}
      </label>
    </p>
  );
  return (
    <form
      className="settings-form prose"
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
      {field('site_title', 'Site title')}
      {field('author_name', 'Author name')}
      {field('author_bio', 'Bio', true)}
      <label htmlFor="author_links">Links (one per line, "label | url")</label>
      <textarea
        id="author_links"
        rows={3}
        value={links}
        onChange={(event) => {
          setLinks(event.target.value);
          setSaved(false);
        }}
      />
      <label>
        Reading theme{' '}
        <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>
          — the public pages only; the studio keeps its own light/dark
        </span>
      </label>
      <div className="theme-grid">
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
                  className="sheet"
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
      {field('site_url', 'Canonical site URL (blank = derive from request)')}
      <label htmlFor="avatar_media_id">Avatar media ID</label>
      <input
        id="avatar_media_id"
        value={form.avatar_media_id}
        onChange={(event) => change('avatar_media_id', event.target.value)}
      />
      {avatar ? (
        <img
          src={`${mount}/${avatar}`}
          alt="Uploaded avatar"
          style={{ width: 64, height: 64, objectFit: 'cover' }}
        />
      ) : null}
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
      <p>
        <Button
          type="button"
          disabled={busy}
          onClick={() => file.current?.click()}
        >
          upload avatar
        </Button>{' '}
        <Button
          type="button"
          onClick={() => {
            change('avatar_media_id', '');
            setAvatar('');
          }}
        >
          clear avatar
        </Button>
      </p>
      {field(
        'ai_model',
        'TK generation model (blank = provider default, currently claude-opus-5)',
        false,
        'claude-opus-5',
      )}
      {field(
        'ai_style_prompt',
        'TK site-level style prompt (optional, appended to every generation request)',
        true,
      )}
      <label htmlFor="timezone">Timezone for displayed dates</label>
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
        <span className="settings-hint">
          detected from this device — save to keep it
        </span>
      ) : null}
      <p className="settings-hint">
        Your blyg runs on a server whose clock is UTC, so without this an
        evening post can show tomorrow’s date. This changes display only, on
        your pages and in the studio. Feed dates stay RFC-822 and item documents
        stay ISO-8601 UTC.
      </p>
      <label>Updates</label>
      {toggle(
        'update_check',
        'Tell me when a newer release of this client exists',
      )}
      <p className="settings-hint">
        On by default. Once a day your blyg fetches the client’s public release
        feed and compares the newest version to the one you are running —
        currently <code>{CLIENT.version}</code>. Nothing about your blyg is
        sent: no URL, no identifier, no query. Before 1.0 the wire format can
        change between releases, so an old client can stop making sense to other
        blygs.
      </p>
      {field(
        'update_feed_url',
        'Release feed (blank = this client’s own)',
        false,
        'https://github.com/blygger/blygger-studio/releases.atom',
      )}
      <p className="settings-hint">
        Only change this if you have modified the client and track your own
        versions. Point it at your releases, or turn the check off.
      </p>
      <label>Responses from other blygs</label>
      {toggle(
        'show_responses_default',
        'Show verified responses on my items’ public pages, by default',
      )}
      <p className="settings-hint">
        Applies to items that have not decided for themselves. An item’s
        override keeps winning if you change this later. Set overrides and hide
        individual responses in the mentions tab. A response list is a citation
        trail with no count.
      </p>
      {toggle(
        'accept_mentions',
        'Accept Webmentions — let other blygs tell yours when they quote, respond to or fork an item',
      )}
      <p className="settings-hint">
        Unchecking this removes the public Webmention endpoint and its discovery
        links. Requests return 404. You still send mentions when you quote other
        people, and collected responses stay in your Studio.
      </p>
      <p>
        <Button className="primary" type="submit" disabled={busy}>
          save settings
        </Button>
      </p>
      {saved ? <p role="status">saved</p> : null}
    </form>
  );
}

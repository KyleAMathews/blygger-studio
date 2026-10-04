import { previewFromHtml } from '../preview.ts';
import { scoped } from './scoped.ts';
import { useMemo, useState } from 'react';
import { useLiveQuery, createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { Link, useNavigate } from '@tanstack/react-router';
import type { Mention, MentionOutRow } from '../../sdk/dist/browser.js';
import { BlyggerApi, unwrap } from '../../sdk/dist/browser.js';
import {
  client,
  subscriptions,
  hoppers,
  queryClient,
  items,
  changed,
  hopperDetail,
  hopperPreview,
} from './data.ts';
import {
  Button,
  Failure,
  Html,
  usePoll,
  mount,
  useSettings,
} from './components.tsx';
import { confirm } from './sheets.tsx';
function useAction() {
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  return {
    error,
    busy,
    run: async (fn: () => Promise<unknown>) => {
      if (busy) return;
      setBusy(true);
      setError(undefined);
      try {
        await fn();
      } catch (error) {
        setError(error);
      } finally {
        setBusy(false);
      }
    },
  };
}
export function AddFeedForm() {
  const action = useAction();
  const [url, setUrl] = useState('');
  const [confirmation, setConfirmation] = useState<{
    title: string;
    siteMismatch?: {
      asserted: string;
      actual: string;
    };
  }>();
  const add = async (confirm = false) => {
    const result = await unwrap(
      BlyggerApi.createSubscription({ client, body: { url, confirm } }),
    );
    if ('needsConfirm' in result) setConfirmation(result);
    else {
      setConfirmation(undefined);
      setUrl('');
      await changed('subscriptions', 'reading');
    }
  };
  return (
    <>
      <Failure error={action.error} />
      <form
        id="add-sub-form"
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(() => add());
        }}
      >
        <input
          id="add-sub-url"
          type="url"
          placeholder="https://example.com/"
          required
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setConfirmation(undefined);
          }}
        />
        <Button disabled={action.busy} type="submit">
          subscribe
        </Button>
      </form>
      {confirmation ? (
        <div id="add-sub-confirm">
          <p>Subscribe to {confirmation.title}?</p>
          {confirmation.siteMismatch ? (
            <p>
              Site mismatch: {confirmation.siteMismatch.asserted} /{' '}
              {confirmation.siteMismatch.actual}
            </p>
          ) : null}
          <Button onClick={() => void action.run(() => add(true))}>
            confirm subscribe
          </Button>
        </div>
      ) : null}
    </>
  );
}
export function SubscriptionsPage() {
  const action = useAction();
  const rows =
    useLiveQuery({
      query: (q) => q.from({ sub: subscriptions }),
    }).data ?? [];
  usePoll('subscriptions', subscriptions.utils.refetch);
  return (
    <>
      <h2>subscriptions</h2>
      <AddFeedForm />
      <Failure error={action.error} />
      {rows.map((sub) => (
        <div className="sub-row" key={sub.id}>
          <div className="title-line">
            <span className={`status-dot ${sub.status}`}>●</span>
            <span className="kind-chip">{sub.kind}</span>
            <strong>{sub.title || sub.origin}</strong>
          </div>
          <p className="meta">
            {sub.origin} ·{' '}
            {sub.last_poll_at
              ? `last polled ${sub.last_poll_at}`
              : 'never polled'}{' '}
            · {sub.fail_count} failures
          </p>
          {sub.flags.length ? (
            <p className="flags">
              {sub.flags
                .map((flag) => `${flag.type}: ${flag.detail || ''}`)
                .join(' · ')}
            </p>
          ) : null}
          <div className="actions">
            <Button
              onClick={() =>
                void action.run(async () => {
                  await subscriptions.update(sub.id, (row) => {
                    row.status = sub.status === 'paused' ? 'active' : 'paused';
                  }).isPersisted.promise;
                })
              }
            >
              {sub.status === 'paused' ? 'resume' : 'pause'}
            </Button>
            {sub.kind === 'blyg' ? (
              <Button
                onClick={() =>
                  void action.run(async () => {
                    await unwrap(
                      BlyggerApi.resyncSubscription({
                        client,
                        path: { id: sub.id },
                      }),
                    );
                    await changed('subscriptions', 'reading');
                  })
                }
              >
                resync
              </Button>
            ) : null}
            <Button
              className="danger"
              onClick={async () => {
                if (
                  await confirm({
                    title:
                      'Delete this subscription and its local imports, hopper memberships, and signals?',
                    ok: 'delete',
                    danger: true,
                  })
                )
                  void action.run(async () => {
                    await subscriptions.delete(sub.id).isPersisted.promise;
                    await changed('hoppers', 'signals', 'reading');
                  });
              }}
            >
              delete
            </Button>
            <label className="blogroll">
              <input
                type="checkbox"
                checked={sub.in_blogroll}
                onChange={(e) => {
                  const checked = e.target.checked;
                  void action.run(async () => {
                    await subscriptions.update(sub.id, (row) => {
                      row.in_blogroll = checked;
                    }).isPersisted.promise;
                  });
                }}
              />{' '}
              in blogroll
            </label>
          </div>
        </div>
      ))}
    </>
  );
}
export function HoppersPage() {
  const rows =
    useLiveQuery({
      query: (q) => q.from({ hopper: hoppers }),
    }).data ?? [];
  usePoll('hoppers', hoppers.utils.refetch);
  const action = useAction();
  const [name, setName] = useState('');
  const create = async () => {
    const hopper = await unwrap(
      BlyggerApi.createHopper({ client, body: { name } }),
    );
    hoppers.utils.writeUpsert(hopper);
    setName('');
  };
  return (
    <>
      <h2>hoppers</h2>
      <Failure error={action.error} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(create);
        }}
      >
        <input
          aria-label="hopper name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={action.busy}>
          create hopper
        </Button>
      </form>
      {rows.map((hopper) => (
        <HopperCard key={hopper.id} id={hopper.id} name={hopper.name} />
      ))}
    </>
  );
}
function HopperCard({ id, name }: { id: string; name: string }) {
  const collection = useMemo(() => hopperPreview(id), [id]);
  usePoll(`hopper-preview:${id}`, collection.utils.refetch);
  const row = useLiveQuery({ query: (q) => q.from({ hopper: collection }) })
    .data?.[0];
  const sources =
    useLiveQuery({ query: (q) => q.from({ source: subscriptions }) }).data ??
    [];
  return (
    <div className="hopper-row">
      <h3>
        <Link to="/hoppers/$id" params={{ id }}>
          {name}
        </Link>
      </h3>
      {row ? (
        <>
          <p>
            {row.total} items · {row.source_count} sources ·{' '}
            {row.hopper.public ? 'public' : 'private'}
          </p>
          {row.items.map((item) => {
            const preview = previewFromHtml(item.content_html);
            const source = sources.find(
              (source) => source.id === item.subscription_id,
            );
            return (
              <p
                className="hopper-preview"
                key={JSON.stringify([item.subscription_id, item.remote_id])}
              >
                {preview.title ? <strong>{preview.title} · </strong> : null}
                {preview.body}
                {source ? (
                  <small> · {source.title || source.origin}</small>
                ) : null}
              </p>
            );
          })}
          {row.total > 3 ? <p>+{row.total - 3} more</p> : null}
        </>
      ) : (
        <p>Loading preview…</p>
      )}
    </div>
  );
}
export function HopperPage({ id }: { id: string }) {
  const collection = useMemo(() => hopperDetail(id), [id]);
  const row = useLiveQuery({
    query: (q) => q.from({ hopper: collection }),
  }).data?.[0];
  usePoll(`hopper:${id}`, collection.utils.refetch);
  const action = useAction();
  const navigate = useNavigate();
  const [name, setName] = useState<string>();
  const sources =
    useLiveQuery({ query: (q) => q.from({ source: subscriptions }) }).data ??
    [];
  if (!row) return <p>Loading hopper…</p>;
  const update = async (body: { name?: string; public?: boolean }) => {
    await unwrap(BlyggerApi.updateHopper({ client, path: { id }, body }));
    await changed('hoppers', 'hopper', 'hopper-preview');
  };
  const remove = async () => {
    await unwrap(BlyggerApi.deleteHopper({ client, path: { id } }));
    await changed('hoppers');
    await navigate({ to: '/hoppers' });
  };
  return (
    <>
      <Link to="/hoppers">← hoppers</Link>
      <h2>{row.hopper.name}</h2>
      <Failure error={action.error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(() => update({ name: name ?? row.hopper.name }));
        }}
      >
        <input
          name="name"
          value={name ?? row.hopper.name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit">rename</Button>
      </form>
      <label>
        <input
          type="checkbox"
          checked={row.hopper.public}
          disabled={action.busy}
          onChange={(e) => {
            const checked = e.target.checked;
            void action.run(() => update({ public: checked }));
          }}
        />{' '}
        public
      </label>
      {row.hopper.public && row.hopper.slug ? (
        <p>
          Public URL:{' '}
          <a
            href={`${mount}/h/${row.hopper.slug}/`}
            target="_blank"
            rel="noreferrer"
          >
            {location.origin}
            {mount}/h/{row.hopper.slug}/
          </a>
        </p>
      ) : null}
      {row.hopper.slug_frozen ? (
        <p>The public URL stays fixed when you rename this hopper.</p>
      ) : null}
      <p>
        {row.total} items from {row.source_count} sources
      </p>
      {row.memberships.map((member) => {
        const key = JSON.stringify([member.subscription_id, member.remote_id]);
        const item = row.items.find(
          (item) =>
            item.subscription_id === member.subscription_id &&
            item.remote_id === member.remote_id,
        );
        const source = sources.find(
          (source) => source.id === member.subscription_id,
        );
        return (
          <article className="reading-entry" key={key}>
            <p className="byline">
              {item?.kind} ·{' '}
              {source ? (
                <a href={source.origin}>{source.title || source.origin}</a>
              ) : (
                member.subscription_id
              )}{' '}
              · added {member.added_at}
            </p>
            {item?.state === 'tombstone' ? (
              <p>
                withdrawn by origin
                {item.pinned_version_retained != null
                  ? ` · retained pinned v${item.pinned_version_retained}`
                  : ''}
              </p>
            ) : null}
            <Html
              html={
                row.items.find(
                  (item) =>
                    item.subscription_id === member.subscription_id &&
                    item.remote_id === member.remote_id,
                )?.content_html || ''
              }
            />
            {item ? (
              <Button
                className="stub-btn"
                onClick={() =>
                  void action.run(async () => {
                    const draft = await unwrap(
                      BlyggerApi.createItem({
                        client,
                        body: {
                          mode: 'response',
                          source: {
                            subscription_id: member.subscription_id,
                            remote_id: member.remote_id,
                          },
                        },
                      }),
                    );
                    await changed('items');
                    await navigate({
                      to: '/edit/$id',
                      params: { id: draft.id },
                    });
                  })
                }
              >
                stub ↗
              </Button>
            ) : null}
            <Button
              onClick={() =>
                void action.run(async () => {
                  await unwrap(
                    BlyggerApi.removeHopperItem({
                      client,
                      path: {
                        id,
                        sub: member.subscription_id,
                        remoteId: member.remote_id,
                      },
                    }),
                  );
                  await changed('hopper', 'hoppers', 'hopper-preview');
                })
              }
            >
              remove
            </Button>
          </article>
        );
      })}
      <Button
        className="danger"
        onClick={async () => {
          if (
            await confirm({
              title: 'Delete this hopper?',
              ok: 'delete hopper',
              danger: true,
            })
          )
            void action.run(remove);
        }}
      >
        delete hopper
      </Button>
    </>
  );
}
async function mentions(
  direction: 'inbound' | 'outbound',
  signal: AbortSignal,
) {
  const rows: (Mention | MentionOutRow)[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await unwrap(
      BlyggerApi.listMentions({
        client,
        query: { direction, offset, limit: 100 },
        signal,
      }),
    );
    rows.push(...page.items);
    if (offset + page.items.length >= page.total) return rows;
    if (!page.items.length)
      throw new Error('Mentions ended before their total');
  }
}
export const inbound = createCollection(
  queryCollectionOptions({
    id: 'mentions-in',
    queryKey: ['mentions-in'],
    queryClient,
    getKey: (row: Mention) => row.id,
    queryFn: async ({ signal }) =>
      (await mentions('inbound', signal)).filter(
        (row): row is Mention => 'hidden' in row,
      ),
  }),
);
export const outbound = createCollection(
  queryCollectionOptions({
    id: 'mentions-out',
    queryKey: ['mentions-out'],
    queryClient,
    getKey: (row: MentionOutRow) => row.id,
    queryFn: async ({ signal }) =>
      (await mentions('outbound', signal)).filter(
        (row): row is MentionOutRow => 'next_attempt_at' in row,
      ),
  }),
);
function MentionRow({ mention }: { mention: Mention }) {
  const action = useAction(),
    navigate = useNavigate();
  const collection = useMemo(() => mentionSource(mention.id), [mention.id]);
  const source = useLiveQuery({ query: (q) => q.from({ source: collection }) })
    .data?.[0];
  usePoll(`mention-source:${mention.id}`, collection.utils.refetch);
  let author = mention.source_origin || mention.source;
  try {
    const name = JSON.parse(mention.source_author_json || '{}')?.name;
    if (typeof name === 'string' && name) author = name;
  } catch {
    /* Old stored metadata can be invalid. */
  }
  return (
    <article
      className={`mention-row ${mention.hidden ? 'hidden-row' : ''} ${mention.status === 'gone' ? 'gone' : ''}`}
    >
      <span className="rel">{mention.relation || 'mention'}</span>{' '}
      <a
        href={mention.source_page || mention.source}
        target="_blank"
        rel="noreferrer"
      >
        {author}
      </a>{' '}
      · v{mention.source_version ?? '?'} · first seen {mention.first_seen}
      {mention.status === 'gone' ? (
        <span> · no longer verifies</span>
      ) : (
        <>
          <Button
            onClick={() =>
              void action.run(async () => {
                await unwrap(
                  BlyggerApi.updateMention({
                    client,
                    path: { id: mention.id },
                    body: { hidden: !mention.hidden },
                  }),
                );
                await changed('mentions-in');
              })
            }
          >
            {mention.hidden ? 'show on page' : 'hide from page'}
          </Button>
          {mention.source_id && source?.holder ? (
            <Button
              className="stub-btn"
              onClick={() =>
                void action.run(async () => {
                  const draft = await unwrap(
                    BlyggerApi.createItem({
                      client,
                      body: {
                        mode: 'response',
                        source: {
                          subscription_id: source.holder!,
                          remote_id: mention.source_id!,
                        },
                      },
                    }),
                  );
                  await changed('items');
                  await navigate({ to: '/edit/$id', params: { id: draft.id } });
                })
              }
            >
              stub back ↗
            </Button>
          ) : mention.source_id ? (
            <span className="subscribe-first">
              {' '}
              —{' '}
              <Link to="/subs">
                {source?.subscription
                  ? 'resync this source to stub back'
                  : `subscribe to ${mention.source_origin} to stub back`}
              </Link>
            </span>
          ) : null}
        </>
      )}
      <Failure error={action.error} />
    </article>
  );
}
const mentionSource = scoped((id) =>
  createCollection(
    queryCollectionOptions({
      id: `mention-source:${id}`,
      queryKey: ['mention-source', id],
      queryClient,
      getKey: (
        row: import('../../sdk/dist/browser.js').GetMentionSourceResponses[200] & {
          key: string;
        },
      ) => row.key,
      queryFn: async ({ signal }) => [
        {
          ...(await unwrap(
            BlyggerApi.getMentionSource({ client, path: { id }, signal }),
          )),
          key: id,
        },
      ],
    }),
  ),
);
export function MentionsPage() {
  const incoming =
    useLiveQuery({ query: (q) => q.from({ mention: inbound }) }).data ?? [];
  const outgoing =
    useLiveQuery({ query: (q) => q.from({ mention: outbound }) }).data ?? [];
  const owned =
    useLiveQuery({ query: (q) => q.from({ item: items }) }).data ?? [];
  const settings = useSettings(),
    action = useAction();
  usePoll('mentions-in', inbound.utils.refetch);
  usePoll('mentions-out', outbound.utils.refetch);
  usePoll('items', items.utils.refetch);
  const groups = new Map<string, Mention[]>();
  for (const mention of incoming) {
    const rows = groups.get(mention.target_item_id) || [];
    rows.push(mention);
    groups.set(mention.target_item_id, rows);
  }
  return (
    <>
      <h2>mentions</h2>
      <Failure error={action.error} />
      <p className="mentions-note">Verified responses from other blygs.</p>
      {[...groups].map(([id, rows]) => {
        const item = owned.find((item) => item.id === id),
          mode = item?.responses || 'default';
        const showing =
          mode === 'show' ||
          (mode === 'default' && settings?.show_responses_default);
        const visible = rows.filter(
          (row) => row.status === 'verified' && !row.hidden,
        ).length;
        return (
          <section className="mention-group" key={id}>
            <h3>
              <Link to="/edit/$id" params={{ id }}>
                {item?.content_md.slice(0, 60) || id.slice(0, 8)}
              </Link>{' '}
              · {rows.length} responses
            </h3>
            <p className="group-controls">
              <label>
                Responses on this item's public page:{' '}
                <select
                  aria-label="item responses"
                  value={mode}
                  disabled={!item || action.busy}
                  onChange={(event) => {
                    const responses = event.target.value as
                      | 'default'
                      | 'show'
                      | 'hide';
                    void action.run(async () => {
                      await items.update(id, (row) => {
                        row.responses = responses;
                      }).isPersisted.promise;
                    });
                  }}
                >
                  <option value="default">
                    default (
                    {settings?.show_responses_default ? 'showing' : 'hidden'})
                  </option>
                  <option value="show">show</option>
                  <option value="hide">hide</option>
                </select>
              </label>{' '}
              · {showing ? visible : 0} on the page now
            </p>
            {rows.map((mention) => (
              <MentionRow key={mention.id} mention={mention} />
            ))}
          </section>
        );
      })}
      {!incoming.length ? <p>No verified mentions.</p> : null}
      <h2>outbound</h2>
      {!settings?.site_url ? (
        <p className="mentions-note">
          No site URL is set. Set it in <Link to="/settings">settings</Link>{' '}
          before relying on outbound delivery.
        </p>
      ) : null}
      {outgoing.map((mention) => (
        <p className="out-row" key={mention.id}>
          <span className={`status ${mention.status}`}>
            {mention.status.replaceAll('_', ' ')}
          </span>{' '}
          <Link to="/edit/$id" params={{ id: mention.item_id }}>
            v{mention.version} of {mention.item_id.slice(0, 8)}…
          </Link>{' '}
          → <a href={mention.target}>{mention.target}</a> · {mention.attempts}{' '}
          attempts{' '}
          {mention.next_attempt_at && mention.status === 'pending'
            ? ` · retrying after ${mention.next_attempt_at}`
            : ''}{' '}
          {mention.last_error}
        </p>
      ))}
    </>
  );
}
export function ForkPage({
  id,
  options,
}: {
  id: string;
  options: Awaited<ReturnType<typeof loadForkOptions>>;
}) {
  const action = useAction();
  const navigate = useNavigate();
  return (
    <>
      <h2>fork {id}</h2>
      <Failure error={action.error || options.error} />
      {options.versions.map((version) => (
        <p key={version.version}>
          v{version.version} · {version.at} {version.note}{' '}
          <Button
            data-action="fork"
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                const draft = await unwrap(
                  BlyggerApi.createItem({
                    client,
                    body: {
                      mode: 'fork',
                      source: {
                        origin: options.origin,
                        id,
                        version: version.version,
                      },
                    },
                  }),
                );
                items.utils.writeUpsert(draft);
                await navigate({ to: '/edit/$id', params: { id: draft.id } });
              })
            }
          >
            fork v{version.version}
          </Button>
        </p>
      ))}
    </>
  );
}
export function loadForkOptions(id: string, sub?: string, origin?: string) {
  return queryClient.fetchQuery({
    staleTime: 0,
    queryKey: ['fork-options', id, sub ?? '', origin ?? ''],
    queryFn: ({ signal }) =>
      unwrap(
        BlyggerApi.getForkOptions({
          client,
          query: { id, sub, origin },
          signal,
        }),
      ),
  });
}

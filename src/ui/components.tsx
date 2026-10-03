import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@base-ui/react/button';
import { Dialog } from '@base-ui/react/dialog';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import {
  settings as settingsCollection,
  polling,
  queryClient,
  updates,
} from './data.ts';
import { readState } from '../versions.ts';
import { CLIENT } from '../client.ts';
export { Button };
export const mount =
  document.getElementById('studio-root')!.dataset.mount ?? '';
export const basepath = `${mount}/studio`;
export function usePoll(key: string, refresh: () => Promise<unknown>) {
  useEffect(() => polling.watch(key, refresh), [key, refresh]);
}
export function useSettings() {
  usePoll('settings', settingsCollection.utils.refetch);
  return useLiveQuery({
    query: (q) => q.from({ settings: settingsCollection }),
  }).data?.[0];
}
export function Html({ html, id }: { html: string; id?: string }) {
  return <div id={id} dangerouslySetInnerHTML={{ __html: html }} />;
}
export function Failure({ error }: { error: unknown }) {
  return error ? (
    <p className="error-banner" role="alert">
      {error instanceof Error ? error.message : String(error)}
    </p>
  ) : null;
}
export function Modal({
  open,
  close,
  title,
  children,
}: {
  open: boolean;
  close: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup className="dialog-popup">
          <Dialog.Title>{title}</Dialog.Title>
          {children}
          <Dialog.Close render={<Button />}>close</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
const nav = [
  ['reading', '/reading'],
  ['compose', '/'],
  ['hoppers', '/hoppers'],
  ['mentions', '/mentions'],
  ['settings', '/settings'],
  ['syntax', '/syntax'],
] as const;
export function Layout({ children }: { children: ReactNode }) {
  const settings = useSettings();
  usePoll('updates', updates.utils.refetch);
  const updateRow = useLiveQuery({ query: (q) => q.from({ update: updates }) })
    .data?.[0];
  const update = updateRow
    ? readState({
        update_latest_seen: updateRow.update_latest_seen || '',
        update_checked_at: updateRow.update_checked_at || '',
      })
    : undefined;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    const failure = (event: Event) => setError((event as CustomEvent).detail);
    window.addEventListener('studio-read-error', failure);
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'error')
        setError(event.query.state.error);
    });
    return () => {
      window.removeEventListener('studio-read-error', failure);
      unsubscribe();
    };
  }, []);
  return (
    <>
      <header className="studio">
        <div className="studio-title">
          <h1>blyg studio</h1>
          <Button
            className="menu-button"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="studio-menu"
            onClick={() => setOpen((value) => !value)}
          >
            ☰
          </Button>
        </div>
        <nav id="studio-menu" className={open ? 'open' : ''}>
          <ul className="menu-main">
            {nav.map(([label, to]) => (
              <li key={label}>
                <Link
                  to={to}
                  activeProps={{ className: 'current', 'aria-current': 'page' }}
                  activeOptions={{
                    exact: to !== '/hoppers',
                    includeSearch: false,
                  }}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="menu-utility">
            <a href={`${mount}/`} target="_blank" rel="noreferrer">
              public page ↗
            </a>
            <form method="post" action={`${basepath}/logout`}>
              <Button type="submit" className="link">
                log out
              </Button>
            </form>
          </div>
        </nav>
      </header>
      <Failure error={error} />
      {error ? (
        <Button
          onClick={() => {
            setError(undefined);
            void polling.refresh();
          }}
        >
          retry reads
        </Button>
      ) : null}
      <main>
        {settings?.update_check && !settings.update_notice_ack ? (
          <div className="update-banner notice" id="update-notice">
            Update alerts are on. You can turn them off in{' '}
            <Link to="/settings">Settings</Link>.{' '}
            <Button
              className="link"
              data-action="ack-update-notice"
              onClick={() =>
                void settingsCollection
                  .update('settings', (row) => {
                    row.update_notice_ack = true;
                  })
                  .isPersisted.promise.catch(setError)
              }
            >
              got it
            </Button>
          </div>
        ) : null}
        {settings?.update_check && update?.behind ? (
          <div className="update-banner">
            <p>
              A new version of {CLIENT.name} is available: {update.latest} (this
              build: {CLIENT.version}).
            </p>
            <a href={CLIENT.url + '/releases'} target="_blank" rel="noreferrer">
              release notes ↗
            </a>{' '}
            · Run <code>npm run upgrade</code> to update.
          </div>
        ) : null}
        {children}
      </main>
    </>
  );
}

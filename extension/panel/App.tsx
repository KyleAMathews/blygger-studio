import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { createBlyggerClient } from '../../sdk/dist/browser.js';
import { createStudioData, type StudioData } from '../../src/ui/data-core.ts';
import { configureHost } from '../../src/ui/host.ts';
import { Button, Failure } from '../../src/ui/primitives.tsx';
import { ask } from '../lib/messages.ts';
import type { Status } from '../lib/tokens.ts';
import { Connect } from './Connect.tsx';

export function App() {
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    ask({ type: 'status' }).then(setStatus, setError);
  }, []);
  if (error) return <main className="panel"><Failure error={error} /></main>;
  if (!status) return <main className="panel"><p className="hint">Loading…</p></main>;
  if (status.state !== 'connected') return <Connect status={status} onStatus={setStatus} />;
  // Keyed by blyg: a change unmounts every consumer before the old data is disposed (Plan 2).
  return <Connected key={`${status.origin}${status.mount}`} status={status} onStatus={setStatus} />;
}

type Connected = Extract<Status, { state: 'connected' }>;

function Connected({ status, onStatus }: { status: Connected; onStatus: (status: Status) => void }) {
  // One client and one data instance per connected blyg; the worker supplies tokens.
  const data = useMemo(() => {
    configureHost({ origin: status.origin, mount: status.mount });
    return createStudioData(
      createBlyggerClient({ baseUrl: status.origin, auth: (auth) => (auth.scheme === 'bearer' ? ask({ type: 'access-token' }) : undefined) }),
    );
  }, [status.origin, status.mount]);
  useEffect(() => () => void data.dispose(), [data]);
  const host = new URL(status.origin).host;
  return (
    <main className="panel">
      <header className="panel-head"><h1>Blygger Clipper</h1></header>
      {status.scope.includes('owner:read') ? <SiteTitle data={data} fallback={host} /> : <p className="connected">Connected to <strong>{host}</strong></p>}
      {status.scope.includes('owner:draft') ? (
        <p className="hint">Select text on any page, right-click and choose <strong>Quote in Blygger</strong>.</p>
      ) : (
        <Failure error="This connection cannot clip: it lacks the draft permission. Disconnect and connect again, leaving drafting ticked." />
      )}
      <Button className="btn btn-ghost" onClick={async () => onStatus(await ask({ type: 'disconnect' }))}>Disconnect</Button>
    </main>
  );
}

function SiteTitle({ data, fallback }: { data: StudioData; fallback: string }) {
  const { data: rows } = useLiveQuery((q) => q.from({ settings: data.settings }));
  return <p className="connected">Connected to <strong>{rows?.[0]?.site_title || fallback}</strong></p>;
}

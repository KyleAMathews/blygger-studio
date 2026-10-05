import { useState } from 'react';
import { Button, Failure } from '../../src/ui/primitives.tsx';
import { ask, type Request } from '../lib/messages.ts';
import type { Status } from '../lib/tokens.ts';

export function Connect({ status, onStatus }: { status: Exclude<Status, { state: 'connected' }>; onStatus: (status: Status) => void }) {
  const [url, setUrl] = useState(status.state === 'reconnect' ? `${status.origin}${status.mount}/` : '');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const run = async (request: Extract<Request, { type: 'connect' | 'connect-manual' }>) => {
    setBusy(true);
    setError(undefined);
    try {
      onStatus(await ask(request));
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="panel">
      <header className="panel-head"><h1>Blygger Clipper</h1></header>
      {status.state === 'reconnect' ? <p className="notice" role="status">{status.reason}</p> : null}
      <form onSubmit={(event) => { event.preventDefault(); void run({ type: 'connect', url }); }}>
        <label htmlFor="blyg-url">Your blyg’s address</label>
        <input id="blyg-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="example.com/blyg/" autoComplete="url" required />
        <Button className="btn btn-primary" type="submit" disabled={busy}>Connect</Button>
        <p className="hint">You approve the clipper on your blyg, and can revoke it any time in Studio → Client access. If you are not signed in to Studio, you sign in first.</p>
      </form>
      <details className="advanced">
        <summary>Advanced: use a token</summary>
        <form onSubmit={(event) => { event.preventDefault(); void run({ type: 'connect-manual', url, token }); }}>
          <label htmlFor="manual-token">Token from Studio → Client access</label>
          <textarea id="manual-token" value={token} onChange={(event) => setToken(event.target.value)} rows={3} required />
          <Button className="btn" type="submit" disabled={busy}>Connect with token</Button>
        </form>
      </details>
      <Failure error={error} />
    </main>
  );
}

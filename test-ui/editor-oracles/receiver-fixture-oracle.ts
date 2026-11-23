/** Release only this history's publication, after its receiving host settles. */
type FixtureHost = { origin: string; cookie: string };
type Fixture = { id: string; settled: () => Promise<void> };
type OwnFixture = (id: string, settled: () => Promise<void>) => void;

export async function receiverFixture(application: FixtureHost, run: (own: OwnFixture) => Promise<void>, release = (id: string) => withdrawOwnedFixture(id, application)) {
  let fixture: Fixture | undefined;
  let failure: { reason: unknown } | undefined;
  try { await run((id, settled) => { fixture = { id, settled }; }); }
  catch (reason) { failure = { reason }; throw reason; }
  finally {
    if (fixture) {
      try { await fixture.settled(); await release(fixture.id); }
      catch (error) {
        throw new AggregateError([...(failure ? [failure.reason] : []), error], 'Receiver fixture cleanup failed: ' + fixture.id, { cause: failure?.reason });
      }
    }
  }
}

async function withdrawOwnedFixture(id: string, { origin, cookie }: FixtureHost) {
  if (!origin || !cookie) throw new Error('Receiver fixture cleanup has no disposable application session');
  const endpoint = origin + '/api/items/' + encodeURIComponent(id);
  const headers = { Cookie: cookie, Origin: origin };
  const current = await fetch(endpoint, { headers, signal: AbortSignal.timeout(7000) });
  const body = await current.text();
  if (!current.ok) throw new Error('Receiver fixture cleanup read failed: ' + current.status);
  const item = JSON.parse(body) as { status?: unknown; revision?: unknown };
  if (item.status === 'draft' || item.status === 'withdrawn') return;
  if (item.status !== 'public' || typeof item.revision !== 'number' || !Number.isSafeInteger(item.revision)) throw new Error('Receiver fixture cleanup read has no public revision');
  const withdrawn = await fetch(endpoint + '/withdraw', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedRevision: item.revision }), signal: AbortSignal.timeout(7000) });
  await withdrawn.text();
  if (!withdrawn.ok) throw new Error('Receiver fixture cleanup withdrawal failed: ' + withdrawn.status);
}

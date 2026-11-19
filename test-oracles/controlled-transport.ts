// These Node oracles supply their HTTP peers. A hostile mutation must fail the
// driver's observed contract instead of dispatching to a real network host.
// The fetch-lifetime oracle replaces and restores this default per history.
globalThis.fetch = async () => {
  throw new Error('Unexpected global fetch outside the controlled oracle transport');
};

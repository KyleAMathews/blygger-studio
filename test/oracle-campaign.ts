
// Named fixture guards remain available to shared setup drivers. Product
// campaigns now register through @tanstack/oracles; no legacy replay remains.
class OracleMismatch extends Error {
  constructor(readonly checkpoint: string, cause: unknown) { super(checkpoint, { cause }); }
}
export function atCheckpoint(name: string, compare: () => void) {
  try { compare(); } catch (cause) { throw new OracleMismatch(name, cause); }
}

/** A validator names representation bytes, independently of which database
 * table changed. The abstract value is the DTO field changed by a derived
 * writer; counters and handler shortcuts never decide this model's answer. */
export function derivedRepresentation(before: unknown, after: unknown) {
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  return { status: changed ? 200 : 304, body: changed ? JSON.stringify({ value: after }) : '', changed };
}

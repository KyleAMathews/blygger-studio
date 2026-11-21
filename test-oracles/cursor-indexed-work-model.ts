/** Existing deep-page work contract from test/cursor-range.test.ts73–116.
 * Fixture arithmetic predicts rows; provider metrics judge work independently
 * of the query spelling. Five indexed ranges may not become an ordered scan.
 */
export const indexedWorkHistories = [100, 101, 199];
export const indexedWorkCount = 5000;
export const indexedWorkLimit = 25;
export const indexedWorkId = (index: number) => `indexed-oracle-${String(index).padStart(5, '0')}`;
export const indexedWorkTime = (index: number) => String(index).padStart(8, '0');
export const indexedWorkModel = (boundary: number) => ({
  ids: Array.from({ length: indexedWorkLimit }, (_, index) => indexedWorkId(boundary - index - 1)),
  more: true,
  // Preserved existing receiving bounds; the old OR is a positive work premise.
  maximumRowsRead: 250,
  minimumOldRowsRead: 4000,
});
export const indexedWorkLaw = 'indexed deep cursor page work';

/** The model stores accepted prefixes and server page availability. It never
 * reads Query's cache, the hook, cursors produced by production or SDK results. */
export type SearchFlow = 'walk' | 'failure' | 'late';
export interface SearchHistory { size: number; count: number; newCount: number; loads: number; flow: SearchFlow; lateFailure: boolean }
export interface SearchPlan extends SearchHistory { actions: ('start' | 'load' | 'retry' | 'hold' | 'switch' | 'release' | 'close')[] }
export interface SearchSnapshot {
  action: SearchPlan['actions'][number]; query: string | null; hits: string[]; hasMore: boolean; loading: boolean; error: string | null;
  requests: { query: string; offset: number }[];
}
export const searchLaw = 'demanded search pages';
export const initialAcquisition = (plan: SearchHistory) => Math.min(plan.count, Math.ceil(Math.min(20, plan.count) / plan.size) * plan.size);
export function searchPlan(history: SearchHistory): SearchPlan {
  const count = history.flow === 'late' ? Math.max(21, history.count) : history.count;
  const plan = { ...history, count };
  const more = count > 20;
  const actions: SearchPlan['actions'] = ['start'];
  if (history.flow === 'walk') actions.push(...Array.from({ length: Math.min(history.loads, Math.max(0, Math.ceil(count / 20) - 1)) }, () => 'load' as const));
  if (history.flow === 'failure' && more) {
    actions.push('load');
    if (count > initialAcquisition(plan)) actions.push('retry');
  }
  if (history.flow === 'late') actions.push('hold', 'switch', 'release', 'close');
  return { ...plan, actions };
}
export function searchModel(plan: SearchPlan): Omit<SearchSnapshot, 'requests'>[] {
  let query: string | null = 'old', visible = 0, acquired = 0, error: string | null = null, loading = false;
  const snapshots: Omit<SearchSnapshot, 'requests'>[] = [];
  const acquire = (count: number, failure: boolean) => {
    const wanted = Math.min(visible + 20, count);
    if (!acquired) acquired = Math.min(plan.size, count);
    while (acquired < wanted) {
      if (failure) { error = 'search unavailable'; return; }
      acquired = Math.min(count, acquired + plan.size);
    }
    visible = wanted;
    error = null;
  };
  for (const action of plan.actions) {
    if (action === 'start' || action === 'load' || action === 'retry') acquire(plan.count, plan.flow === 'failure' && action === 'load');
    if (action === 'hold') loading = true;
    if (action === 'switch') { query = 'new'; visible = 0; acquired = 0; loading = false; acquire(plan.newCount, false); }
    if (action === 'close') { query = null; visible = 0; error = null; loading = false; }
    snapshots.push({ action, query, hits: Array.from({ length: visible }, (_, index) => `${query}-${index}`), hasMore: query === null ? false : visible < (query === 'new' ? plan.newCount : plan.count), loading, error });
  }
  return snapshots;
}

import type { ChangeDomain, ChangeState } from '../change-state.ts';

// Query dependencies are separate from counter names. Unknown/effectful reads
// retain their timer; in particular updates must cross its clock deadline.
function dependencies(key: string): ChangeDomain[] | undefined {
  switch (key.split(':')[0]) {
    case 'items': case 'item': return ['items'];
    case 'reading': return ['reading'];
    case 'subscriptions': return ['subscriptions'];
    case 'hoppers': case 'hopper': case 'hopper-preview': return ['hoppers'];
    case 'signals': return ['signals'];
    case 'settings': return ['settings'];
  }
}
type View = { count: number; refresh: () => Promise<unknown>; pending?: Promise<unknown>; applied?: ChangeState };
/** One visibility-aware timer for mounted views. Hidden tabs make no poll reads.
 * Repeated focus events share pending work. A failed read leaves the DB cache.
 */
export class Polling {
  private views = new Map<string, View>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private stopEvents: (() => void) | undefined;
  constructor(
    private visible: () => boolean,
    private report: (error: unknown) => void,
    readonly interval = 15_000,
    private readChanges?: () => Promise<ChangeState>,
  ) {}
  private check?: Promise<ChangeState>;
  watch(key: string, refresh: () => Promise<unknown>) {
    const view = this.views.get(key);
    if (view) view.count++;
    else this.views.set(key, { count: 1, refresh });
    return () => {
      const current = this.views.get(key);
      if (current && --current.count === 0) this.views.delete(key);
    };
  }
  refresh(): Promise<void> {
    if (!this.visible()) return Promise.resolve();
    return this.run();
  }
  private async run() {
    const watched = [...this.views.entries()];
    // Coalesce the cheap check, not the entire set of loads: a stalled view
    // must not stop another view (or a timed read) from polling again.
    const live = watched.filter(([key]) => !this.readChanges || !dependencies(key)).map(([key, view]) => this.refreshView(key, view));
    const gated = async () => {
      if (!this.readChanges || !watched.some(([key]) => dependencies(key))) return;
      let target: ChangeState;
      try {
        if (!this.check) this.check = this.readChanges().then(observed => ({ epoch: observed.epoch, domains: { ...observed.domains } })).finally(() => { this.check = undefined; });
        target = await this.check;
      } catch (error) { this.report(error); return; }
      if (!this.visible()) return;
      await Promise.all(watched.filter(([key]) => dependencies(key)).map(([key, view]) => this.refreshView(key, view, target)));
    };
    await Promise.all([...live, gated()]);
  }
  private refreshView(key: string, view: View, target?: ChangeState) {
    if (this.views.get(key) !== view) return;
    const domains = this.readChanges ? dependencies(key) : undefined;
    if (domains) {
      if (!target) return;
      if (view.applied?.epoch === target.epoch &&
          domains.every(domain => view.applied!.domains[domain] === target.domains[domain])) return;
    }
    if (!view.pending) {
      view.pending = Promise.resolve()
        .then(view.refresh)
        .then(installed => {
          // false represents canceled/skipped work. Only data installed
          // through the sampled target can move this individual cursor.
          if (domains && installed !== false && this.views.get(key) === view) view.applied = target;
        })
        .catch(this.report)
        .finally(() => {
          view.pending = undefined;
        });
    }
    return view.pending;
  }
  start(
    window: Pick<Window, 'addEventListener' | 'removeEventListener'>,
    document: Pick<Document, 'addEventListener' | 'removeEventListener'>,
  ) {
    this.stop();
    const visibility = () => {
      if (this.timer) clearInterval(this.timer);
      this.timer = undefined;
      if (this.visible()) {
        this.timer = setInterval(() => void this.refresh(), this.interval);
        void this.refresh();
      }
    };
    const focus = () => void this.refresh();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', focus);
    this.stopEvents = () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('focus', focus);
    };
    visibility();
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.stopEvents?.();
    this.stopEvents = undefined;
  }
}

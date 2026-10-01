/** One visibility-aware timer for mounted views. Hidden tabs make no poll reads.
 * Repeated focus events share pending work. A failed read leaves the DB cache.
 */
export class Polling {
  private views = new Map<
    string,
    {
      count: number;
      refresh: () => Promise<unknown>;
      pending?: Promise<unknown>;
    }
  >();
  private timer: ReturnType<typeof setInterval> | undefined;
  private stopEvents: (() => void) | undefined;
  constructor(
    private visible: () => boolean,
    private report: (error: unknown) => void,
    readonly interval = 15_000,
  ) {}
  watch(key: string, refresh: () => Promise<unknown>) {
    const view = this.views.get(key);
    if (view) view.count++;
    else this.views.set(key, { count: 1, refresh });
    return () => {
      const current = this.views.get(key);
      if (current && --current.count === 0) this.views.delete(key);
    };
  }
  async refresh() {
    if (!this.visible()) return;
    await Promise.all(
      [...this.views.values()].map((view) => {
        if (!view.pending)
          view.pending = Promise.resolve()
            .then(view.refresh)
            .catch(this.report)
            .finally(() => {
              view.pending = undefined;
            });
        return view.pending;
      }),
    );
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

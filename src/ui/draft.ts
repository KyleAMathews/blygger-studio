/** Local text has its own revision. Server polling never writes it. */
export class Draft {
  private queue = Promise.resolve();
  private currentRevision = 0;
  private persistedRevision = 0;
  get dirty() {
    return this.currentRevision !== this.persistedRevision;
  }
  accept(text: string) {
    this.edit(text);
    this.persistedRevision = this.currentRevision;
  }
  get revision() {
    return this.currentRevision;
  }
  constructor(
    public text: string,
    private persist: (text: string) => Promise<unknown>,
  ) {}
  edit(text: string) {
    this.text = text;
    this.currentRevision++;
  }
  settle(): Promise<void> {
    return this.queue;
  }
  mutate<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  save(): Promise<boolean> {
    const text = this.text;
    const revision = this.revision;
    const saving = this.queue.then(async () => {
      await this.persist(text);
      this.persistedRevision = revision;
      return this.revision === revision;
    });
    // Retain the caller's rejection, but let the next manual save recover.
    this.queue = saving.then(
      () => undefined,
      () => undefined,
    );
    return saving;
  }
}

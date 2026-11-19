import type * as Worker from '@cloudflare/workers-types/index.ts';

// Node oracle drivers keep the platform Fetch and DOM declarations. Import
// only Worker-only bindings from the module build, so its global Request and
// Element declarations cannot replace Node Fetch options or document elements.
declare global {
  type Ai = Worker.Ai;
  type D1Database = Worker.D1Database;
  type D1PreparedStatement = Worker.D1PreparedStatement;
  type D1Result<T = unknown> = Worker.D1Result<T>;
  type R2Bucket = Worker.R2Bucket;
  type R2Object = Worker.R2Object;
  type ExecutionContext<Props = unknown> = Worker.ExecutionContext<Props>;
  type ScheduledController = Worker.ScheduledController;
  // The HTML handler types stay Worker-specific, while the body boundary uses
  // native Fetch Responses, which have no Worker-only cf/webSocket metadata.
  type HTMLRewriter = Omit<Worker.HTMLRewriter, 'on' | 'onDocument' | 'transform'> & {
    on(...args: Parameters<Worker.HTMLRewriter['on']>): HTMLRewriter;
    onDocument(...args: Parameters<Worker.HTMLRewriter['onDocument']>): HTMLRewriter;
    transform(response: Response): Response;
  };
  const HTMLRewriter: { new(...args: ConstructorParameters<typeof Worker.HTMLRewriter>): HTMLRewriter };
}

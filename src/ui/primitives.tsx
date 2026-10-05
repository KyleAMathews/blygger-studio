// Presentational pieces any host can render. No Studio data, no router.
import type { ReactNode } from 'react';
import { Button } from '@base-ui/react/button';
import { displayUrl } from '../importer/util.ts';
import { Sheet } from './sheets.tsx';
export { Button };
/** Every reading card's citation line: where the entry lives, in a new tab. */
export function SourceLink({ url }: { url?: string | null }) {
  return url ? (
    <a className="entry-src" href={url} target="_blank" rel="noreferrer">
      <span aria-hidden="true">↗ </span>
      {displayUrl(url)}
    </a>
  ) : null;
}
export function Html({ html, id }: { html: string; id?: string }) {
  return <div id={id} dangerouslySetInnerHTML={{ __html: html }} />;
}
export function Failure({ error }: { error: unknown }) {
  return error ? (
    <p className="error-banner" role="alert">
      {error instanceof Error ? error.message : String(error)}
    </p>
  ) : null;
}
/** A titled sheet with arbitrary content. Kept for existing callers; new code
 *  can use <Sheet> from sheets.tsx directly. */
export function Modal({
  open,
  close,
  title,
  children,
  closeButton = true,
}: {
  open: boolean;
  close: () => void;
  title: string;
  children: ReactNode;
  /** Off when the dialog's own actions already include a way out. */
  closeButton?: boolean;
}) {
  return (
    <Sheet open={open} onClose={close} title={title} className="dialog-popup">
      {children}
      {closeButton ? <Sheet.Close>close</Sheet.Close> : null}
    </Sheet>
  );
}
/** A bottom action bar, for screens that hide the tab bar (the editor). */
export function ActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `actionbar ${className}` : 'actionbar'}>
      {children}
    </div>
  );
}

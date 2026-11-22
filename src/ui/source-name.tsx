import { Link } from '@tanstack/react-router';
import type { Lens } from './data.ts';

/**
 * An entry's source name, linked to the feed of just that source (Venkat,
 * session 78): a shortcut to the single-source view the Sources tab opens,
 * with the same search (`offset: 0`, the current lens when one is passed)
 * plus `from: 'feed'`, so that view's back link returns to the main feed.
 * Your own items go to `sub=own`, imported ones to their subscription. Not
 * draggable: a mouse swipe starts from the byline (swipe.ts), and a link's
 * native drag would cancel it, as on the Sources tab's rows.
 */
export function SourceName({ entry, className = 'src', lens }: {
  entry: { imported?: { subscriptionId: string; subscriptionTitle: string } | null };
  className?: string;
  lens?: { lens?: Lens };
}) {
  const sub = entry.imported?.subscriptionId;
  const own = !sub || sub === '~own';
  return (
    <Link className={className} to="/reading" search={{ sub: own ? 'own' : sub, offset: 0, ...(lens ?? {}), from: 'feed' }} draggable={false}>
      {own ? 'you' : entry.imported!.subscriptionTitle}
    </Link>
  );
}

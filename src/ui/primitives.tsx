/*
 * Shared UI primitives. Tooltip and IconButton are taken as they stand in
 * Shannon Bux's design-system PR (studio#88, src/ui/primitives.tsx), landed
 * ahead of it in session 72 so tooltips are one pattern across the studio:
 * same names, props and classes, so #88 merges over them. TooltipProvider is
 * the one addition: a shared, shorter delay, and once one tooltip is open its
 * neighbours open at once.
 *
 * A hover hint on an interactive control is a Tooltip, never a native title,
 * which waits about a second and is never shown to keyboard users. Plain text
 * (a badge, a status dot) keeps its title: a tooltip needs a focusable trigger.
 */
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { Button as BaseButton } from '@base-ui/react/button';

const classes = (...names: Array<string | false | null | undefined>) =>
  names.filter(Boolean).join(' ');

/** Mounted once around the app. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <BaseTooltip.Provider delay={300}>{children}</BaseTooltip.Provider>;
}

/** A Base UI tooltip for a concise description of an icon-only action. */
export function Tooltip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner sideOffset={7}>
          <BaseTooltip.Popup className="tooltip-content">{label}</BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

/** A button with no visible text. Its accessible name is always required. */
export function IconButton({
  label,
  children,
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip label={label}>
      <BaseButton
        {...props}
        aria-label={label}
        className={classes('icon-button', className)}
      >
        {children}
      </BaseButton>
    </Tooltip>
  );
}

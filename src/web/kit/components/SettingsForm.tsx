import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../internal/lib/cn';

/**
 * Settings page title. Prefer wrapping with `.cardo-settings-heading` in product shells
 * so theme recipes keep targeting the settings chrome.
 */
export function PageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 data-cardo-ui="page-title" className={cn('cardo-heading-page', className)}>
      {children}
    </h2>
  );
}

export function PageDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p data-cardo-ui="page-desc" className={cn('cardo-text-lead', className)}>
      {children}
    </p>
  );
}

/**
 * Settings list group: optional section head + row stack.
 * Uses product `cardo-settings-*` classes so official theme recipes continue to apply.
 */
export function SettingsCard({
  children,
  className,
  head,
  description,
  headActions,
  spaced = false,
}: {
  children: ReactNode;
  className?: string;
  head?: ReactNode;
  description?: ReactNode;
  headActions?: ReactNode;
  /** Adds top margin used between setting blocks. */
  spaced?: boolean;
}) {
  return (
    <>
      {head || description || headActions ? (
        <div className="cardo-settings-subheading">
          {head ? <span>{head}</span> : null}
          {description ? <small>{description}</small> : null}
          {headActions}
        </div>
      ) : null}
      <div
        data-cardo-ui="settings-card"
        className={cn(
          'cardo-settings-list-group',
          spaced ? 'cardo-settings-list-group-spaced' : null,
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}

/**
 * One settings row: title / optional description / trailing control.
 */
export function SettingsRow({
  title,
  description,
  control,
  icon,
  className,
  ...props
}: {
  title: ReactNode;
  description?: ReactNode;
  control?: ReactNode;
  icon?: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-cardo-ui="settings-row" className={cn('cardo-settings-card', className)} {...props}>
      <div className="cardo-settings-card-copy">
        {icon}
        <span>
          {title}
          {description ? <small>{description}</small> : null}
        </span>
      </div>
      {control}
    </div>
  );
}

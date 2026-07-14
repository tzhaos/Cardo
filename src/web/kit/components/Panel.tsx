import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../internal/lib/cn';

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-cardo-ui="panel" className={cn('cardo-surface', className)} {...props} />;
}

export function PanelHeader({
  title,
  leading,
  tools,
  className,
  titleClassName,
}: {
  title: ReactNode;
  /** Left of title (e.g. search entry). */
  leading?: ReactNode;
  tools?: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <header data-cardo-ui="panel-header" className={cn('cardo-surface-header', className)}>
      <div className="cardo-surface-header-start">
        {leading ? <div className="cardo-surface-leading">{leading}</div> : null}
        <h1 className={cn('cardo-surface-title', titleClassName)}>{title}</h1>
      </div>
      {tools ? <div className="cardo-surface-tools cardo-shell-panel-tools">{tools}</div> : null}
    </header>
  );
}

export function Divider({ className }: { className?: string }) {
  return (
    <span data-cardo-ui="divider" className={cn('cardo-divider', className)} aria-hidden="true" />
  );
}

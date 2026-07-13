import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../internal/lib/cn';

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-cardo-ui="panel" className={cn('cardo-surface', className)} {...props} />;
}

export function PanelHeader({
  title,
  tools,
  className,
  titleClassName,
}: {
  title: ReactNode;
  tools?: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <header data-cardo-ui="panel-header" className={cn('cardo-surface-header', className)}>
      <h1 className={cn('cardo-surface-title', titleClassName)}>{title}</h1>
      {tools ? <div className="cardo-surface-tools">{tools}</div> : null}
    </header>
  );
}

export function Divider({ className }: { className?: string }) {
  return (
    <span data-cardo-ui="divider" className={cn('cardo-divider', className)} aria-hidden="true" />
  );
}

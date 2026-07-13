import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../internal/lib/cn';

export interface NavItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  /** settings active uses soft green-gray pill */
  tone?: 'default' | 'settings';
  /** box drag-over page target */
  dropTarget?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}

/** Sidebar / settings navigation row. */
export function NavItem({
  active,
  tone = 'default',
  dropTarget,
  icon,
  trailing,
  className,
  children,
  type = 'button',
  ...props
}: NavItemProps) {
  return (
    <button
      type={type}
      data-cardo-ui="nav-item"
      data-active={active ? 'true' : 'false'}
      data-tone={tone}
      data-drop-target={dropTarget ? 'true' : undefined}
      className={cn(
        'cardo-nav-item',
        active && 'cardo-nav-item-active',
        dropTarget && 'cardo-v2-nav-drop-target',
        className,
      )}
      {...props}
    >
      {icon ? (
        <span className="cardo-nav-item-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="cardo-nav-item-label">{children}</span>
      {trailing ? <span className="cardo-nav-item-trail">{trailing}</span> : null}
    </button>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-cardo-ui="section-label" className={cn('cardo-section-label', className)}>
      {children}
    </div>
  );
}

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

/**
 * Shared optical-centering contract for icon-only controls. Host a single
 * Lucide SVG here instead of depending on inline baseline alignment.
 */
export function IconButton({
  children,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button {...props} className={joinClassNames('wbn-icon-button', className)} type={type}>
      {children}
    </button>
  );
}

/**
 * Shared optical-centering contract for decorative icon surfaces and icon
 * slots that also contain text or motion wrappers.
 */
export function IconFrame({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span {...props} className={joinClassNames('wbn-icon-frame', className)}>
      {children}
    </span>
  );
}

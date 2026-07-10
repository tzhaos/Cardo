import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';

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
    <motion.button
      {...props}
      className={joinClassNames('wbn-icon-button', className)}
      type={type}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 520, damping: 30, mass: 0.45 }}
    >
      {children}
    </motion.button>
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

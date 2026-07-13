import type { ReactNode } from 'react';
import { cn } from '../internal/lib/cn';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string = string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onValueChange: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}

/** Segmented control (locale, color mode, etc.). */
export function Segmented<T extends string = string>({
  value,
  options,
  onValueChange,
  className,
  'aria-label': ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-cardo-ui="segmented"
      className={cn('cardo-segmented', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="cardo-segmented-item"
          data-active={option.value === value ? 'true' : 'false'}
          disabled={option.disabled}
          onClick={() => onValueChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../../lib/utils';

export interface SelectOption<Value extends string> {
  label: string;
  value: Value;
}

export interface SegmentedOption<Value extends string> {
  label: string;
  value: Value;
}

export function WinSelect<Value extends string>({
  value,
  options,
  onChange,
}: {
  value: Value;
  options: SelectOption<Value>[];
  onChange: (value: Value) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label;

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-w-[140px] items-center justify-between gap-6 rounded-md border border-win-border-strong bg-win-bg-secondary px-3 py-1.5 text-sm transition-colors hover:bg-win-hover active:bg-win-active"
      >
        <span className="text-win-text">{activeLabel}</span>
        <ChevronDown className="h-4 w-4 text-win-text-secondary" />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-md border border-win-border bg-win-mica py-1 shadow-win-flyout"
          >
            {options.map((option) => {
              const isActive = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className="group relative flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-win-hover"
                >
                  {isActive ? (
                    <div className="absolute left-0 top-1/2 h-3/5 w-1 -translate-y-1/2 rounded-r-full bg-win-accent" />
                  ) : null}
                  <span
                    className={cn(
                      'pl-2',
                      isActive
                        ? 'font-medium text-win-text'
                        : 'text-win-text-secondary group-hover:text-win-text',
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SegmentedControl<Value extends string>({
  value,
  options,
  onChange,
}: {
  value: Value;
  options: SegmentedOption<Value>[];
  onChange: (value: Value) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-win-border bg-win-bg-secondary p-1 shadow-win-button">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              isActive
                ? 'bg-win-active text-win-text'
                : 'text-win-text-secondary hover:bg-win-hover',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span
        className={cn(
          'relative flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-win-accent' : 'bg-win-active',
        )}
      >
        <span
          className={cn(
            'absolute h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}

export function SettingRow({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-win-border bg-win-card p-4 shadow-sm">
      <div className="flex items-center gap-4">
        {icon}
        <span className="text-sm font-medium text-win-text">{title}</span>
      </div>
      {action}
    </div>
  );
}

export function ActionRow({
  icon,
  title,
  onClick,
  roundedClassName,
}: {
  icon: ReactNode;
  title: string;
  onClick: () => void;
  roundedClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between p-4 text-left transition-colors hover:bg-win-hover',
        roundedClassName,
      )}
    >
      <div className="flex items-center gap-4">
        {icon}
        <span className="text-sm font-medium text-win-text">{title}</span>
      </div>
      <ChevronRight className="h-5 w-5 text-win-text-secondary" />
    </button>
  );
}

export function AccentPalette({
  colors,
  value,
  onChange,
}: {
  colors: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {colors.map((color) => {
        const isActive = value.toLowerCase() === color.toLowerCase();

        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg border transition-transform hover:scale-[1.04]',
              isActive ? 'border-win-text shadow-win-button' : 'border-black/10',
            )}
            style={{ backgroundColor: color }}
            aria-label={color}
            title={color}
          >
            {isActive ? <Check className="h-4 w-4 text-white drop-shadow" /> : null}
          </button>
        );
      })}
    </div>
  );
}

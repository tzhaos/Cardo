import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  label?: string;
}

export function CustomDropdown({ value, options, onChange, label }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const { t } = useI18n();

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutside = (event: Event) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', closeOnOutside, true);
    window.addEventListener('contextmenu', closeOnOutside, true);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutside, true);
      window.removeEventListener('contextmenu', closeOnOutside, true);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="wbn-dropdown" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        className="wbn-dropdown-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span>{selected?.label ?? t('field.select')}</span>
        <ChevronDown size={16} />
      </button>
      {open ? (
        <div className="wbn-dropdown-menu" role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className="wbn-dropdown-option"
              key={option.value}
              role="option"
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

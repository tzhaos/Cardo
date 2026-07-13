import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../internal/lib/cn';
import { ThemeIcon } from '../internal/icons/ThemeIcon';
import { Input } from './Input';

export interface SearchFieldProps extends Omit<ComponentProps<'input'>, 'type'> {
  /** Leading icon; default search glyph. */
  icon?: ReactNode;
  containerClassName?: string;
}

/** Round search field used in settings nav / shell search chrome. */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { className, containerClassName, icon, ...props },
  ref,
) {
  return (
    <div data-cardo-ui="search-field" className={cn('cardo-search', containerClassName)}>
      <span className="cardo-nav-item-icon" aria-hidden="true">
        {icon ?? <ThemeIcon name="search" size={14} />}
      </span>
      <Input ref={ref} type="search" className={className} {...props} />
    </div>
  );
});

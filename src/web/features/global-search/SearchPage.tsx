import { useEffect, useRef } from 'react';
import { useUiStore } from '../../app/stores/uiStore';
import { useI18n } from '../../i18n/useI18n';
import { Input } from '../../kit/input';
import { ThemeIcon } from '../../kit/icon';
import { GlobalSearchPanel } from './GlobalSearchPanel';

/**
 * Overlay search panel above the main canvas (WorkspaceCanvas stays mounted).
 * Entry: left sidebar NavItem / Ctrl+K (Cmd+K).
 * Layout: dimmed backdrop + centered solid panel (bar + results, max ~70vh).
 * Close: Escape, backdrop click, sidebar re-click, panel header close, or activating a result.
 */
export function SearchPage() {
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const closeSearch = useUiStore((state) => state.closeSearch);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeSearch]);

  const trimmed = searchQuery.trim();

  return (
    <div className="cardo-search-overlay" role="search" aria-label={t('toolbar.search')}>
      <button
        type="button"
        className="cardo-search-overlay-backdrop"
        aria-label={t('common.close')}
        onClick={closeSearch}
      />
      <div className="cardo-search-page">
        <div className="cardo-search-page-bar">
          <ThemeIcon name="search" size={16} />
          <Input
            ref={inputRef}
            className="cardo-search-page-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                closeSearch();
              }
            }}
            placeholder={t('shell.searchPlaceholder')}
            aria-label={t('toolbar.search')}
          />
        </div>
        <div className="cardo-search-page-body">
          {trimmed ? (
            <GlobalSearchPanel query={searchQuery} onActivate={closeSearch} />
          ) : (
            <div className="cardo-global-search-empty cardo-search-page-hint">
              <ThemeIcon name="search" size={22} />
              <span>{t('toolbar.searchPlaceholder')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

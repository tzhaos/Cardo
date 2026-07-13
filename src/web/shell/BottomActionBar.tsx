import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useCanvasStore } from '../app/stores/canvasStore';
import { usePreferencesStore } from '../app/stores/preferencesStore';
import { useUiStore } from '../app/stores/uiStore';
import { useWorkspaceStore } from '../app/stores/workspaceStore';
import { GlobalSearchPanel } from '../features/global-search/GlobalSearchPanel';
import { IconButton } from '../kit/icon-button';
import { Input } from '../kit/input';
import { ThemeIcon } from '../kit/icon';
import {
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
  getCanvasViewportCenter,
} from '../domain/canvasGeometry';
import { createBoxFrameCenteredAt } from '../domain/placement';
import { createWebSearchUrl } from '../domain/webSearch';
import { isSystemPageId } from '../domain/workspace';
import { useI18n } from '../i18n/useI18n';
import { openExternalUrl } from '../platform/hostPlatform';
import { useFeatureEnabled } from './FeatureGate';

const TOOLBAR_ICON_SIZE = 18;
const SEARCH_PILL_IDLE = 36;
const SEARCH_PILL_ACTIVE = 280;

/**
 * Panel-bottom tools: expand search + create box (settings lives in sidebar foot).
 * Parent FeatureGate chrome.bottomToolbar; search itself is chrome.globalSearch.
 */
export function BottomActionBar() {
  const globalSearchEnabled = useFeatureEnabled('chrome.globalSearch');
  const createBox = useWorkspaceStore((state) => state.createBox);
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const searchEngine = usePreferencesStore((state) => state.searchEngine);
  const customSearchTemplate = usePreferencesStore((state) => state.customSearchTemplate);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const closeSearch = useCallback(() => {
    setIsSearchActive(false);
    setSearchQuery('');
  }, [setSearchQuery]);

  useEffect(() => {
    if (isSearchActive) {
      searchInputRef.current?.focus();
    }
  }, [isSearchActive]);

  useEffect(() => {
    if (!globalSearchEnabled && isSearchActive) {
      closeSearch();
    }
  }, [globalSearchEnabled, isSearchActive, closeSearch]);

  const handleAdd = () => {
    const canvas = useCanvasStore.getState();
    const camera = canvas.pages[activePageId]?.camera ?? { panX: 0, panY: 0 };
    const viewportSize = canvas.viewportSize;
    const center = getCanvasViewportCenter({ panX: camera.panX, panY: camera.panY }, viewportSize);
    const frame = constrainBoxFrameToCanvas(
      createBoxFrameCenteredAt(center),
      createCanvasWorldBounds(viewportSize),
    );
    createBox(frame, t('box.general'));
  };

  const webSearchUrl = createWebSearchUrl(searchEngine, customSearchTemplate, searchQuery);
  const runWebSearch = () => {
    if (!webSearchUrl) return;
    openExternalUrl(webSearchUrl);
  };

  const showCreate = !isSystemPageId(activePageId);

  return (
    <div className="cardo-v2-bottom-shell">
      <AnimatePresence>
        {globalSearchEnabled && isSearchActive && searchQuery.trim() ? (
          <GlobalSearchPanel query={searchQuery} />
        ) : null}
      </AnimatePresence>
      <div className="cardo-v2-bottom-bar" aria-label={t('toolbar.workspaceTools')}>
        {globalSearchEnabled ? (
          <motion.div
            className={['cardo-v2-search-pill', isSearchActive ? 'cardo-v2-search-pill-active' : '']
              .filter(Boolean)
              .join(' ')}
            animate={{ width: isSearchActive ? SEARCH_PILL_ACTIVE : SEARCH_PILL_IDLE }}
            style={{ height: SEARCH_PILL_IDLE }}
          >
            <IconButton
              className="cardo-search-local-trigger"
              onClick={() => {
                if (isSearchActive) closeSearch();
                else setIsSearchActive(true);
              }}
              tooltip={t('toolbar.search')}
              aria-label={t('toolbar.search')}
            >
              <ThemeIcon name="search" size={TOOLBAR_ICON_SIZE} />
            </IconButton>
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  closeSearch();
                  return;
                }
                if (event.key !== 'Enter') return;
                event.preventDefault();
                runWebSearch();
              }}
              placeholder={t('shell.searchPlaceholder')}
              style={{
                opacity: isSearchActive ? 1 : 0,
                pointerEvents: isSearchActive ? 'auto' : 'none',
              }}
            />
            <IconButton
              className="cardo-search-web-trigger"
              disabled={!webSearchUrl}
              onClick={runWebSearch}
              tooltip={t('search.web')}
              aria-label={t('search.web')}
            >
              <ThemeIcon name="globe" size={TOOLBAR_ICON_SIZE} />
            </IconButton>
          </motion.div>
        ) : null}
        {globalSearchEnabled && showCreate ? <div className="cardo-toolbar-divider" /> : null}
        {showCreate ? (
          <IconButton
            className="cardo-toolbar-create"
            onClick={handleAdd}
            tooltip={t('shell.createBox')}
            aria-label={t('shell.createBox')}
          >
            <span className="cardo-icon-frame">
              <ThemeIcon name="add" size={TOOLBAR_ICON_SIZE} />
            </span>
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}

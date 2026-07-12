import { useEffect, useRef, useState } from 'react';
import { Globe2, Plus, Search, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useIndependentMenuStore } from '../../app/stores/independentMenuStore';
import { useCanvasStore } from '../../app/stores/canvasStore';
import {
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
  getCanvasViewportCenter,
} from '../../domain/canvasGeometry';
import { createBoxFrameCenteredAt } from '../../domain/placement';
import { isSystemPageId } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../../ui/cardo/icon-button';
import { GlobalSearchPanel } from '../global-search/GlobalSearchPanel';
import { createWebSearchUrl } from '../../domain/webSearch';
import { openExternalUrl } from '../../platform/hostPlatform';
import { Input } from '../../ui/primitives/input';
import { useFeatureEnabled } from '../../shell/FeatureGate';

export function BottomToolbar() {
  const globalSearchEnabled = useFeatureEnabled('chrome.globalSearch');
  const createBox = useWorkspaceStore((state) => state.createBox);
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);
  // Do not subscribe to panX/panY — pan is pointer-rate; read camera only when creating a box.
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const searchEngine = usePreferencesStore((state) => state.searchEngine);
  const customSearchTemplate = usePreferencesStore((state) => state.customSearchTemplate);
  const isFluent = usePreferencesStore((state) => state.themeId === 'fluent');
  const settingsOpen = useIndependentMenuStore((state) => state.menus.settings.open);
  const toggleIndependentMenu = useIndependentMenuStore((state) => state.toggleMenu);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (isSearchActive) {
      searchInputRef.current?.focus();
    }
  }, [isSearchActive]);

  const handleAdd = () => {
    const canvas = useCanvasStore.getState();
    const camera = canvas.pages[activePageId]?.camera ?? { panX: 0, panY: 0 };
    const viewportSize = canvas.viewportSize;
    const center = getCanvasViewportCenter(
      { panX: camera.panX, panY: camera.panY },
      viewportSize,
    );
    const frame = constrainBoxFrameToCanvas(
      createBoxFrameCenteredAt(center),
      createCanvasWorldBounds(viewportSize),
    );
    createBox(frame, t('box.general'));
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
  };

  const webSearchUrl = createWebSearchUrl(searchEngine, customSearchTemplate, searchQuery);
  const runWebSearch = () => {
    if (!webSearchUrl) return;
    openExternalUrl(webSearchUrl);
  };

  useEffect(() => {
    if (!globalSearchEnabled && isSearchActive) {
      closeSearch();
    }
  }, [globalSearchEnabled, isSearchActive]);

  return (
    <div className="cardo-bottom-shell">
      <AnimatePresence>
        {globalSearchEnabled && isSearchActive && searchQuery.trim() ? (
          <GlobalSearchPanel query={searchQuery} />
        ) : null}
      </AnimatePresence>
      <div className="cardo-bottom-toolbar" aria-label={t('toolbar.workspaceTools')}>
        <IconButton
          className={`cardo-toolbar-button${settingsOpen ? ' cardo-toolbar-button-active' : ''}`}
          aria-controls="cardo-settings-window"
          aria-expanded={settingsOpen}
          onClick={() => {
            toggleIndependentMenu('settings');
          }}
          title={t('toolbar.settings')}
          aria-label={t('toolbar.settings')}
        >
          <motion.span
            className="cardo-settings-trigger-icon cardo-icon-frame"
            animate={{ rotate: settingsOpen ? 120 : 0, scale: settingsOpen ? 1.08 : 1 }}
            transition={{ type: 'spring', stiffness: 330, damping: 22 }}
          >
            <Settings size={18} />
          </motion.span>
        </IconButton>
        {globalSearchEnabled ? <div className="cardo-toolbar-divider" /> : null}
        {globalSearchEnabled ? (
        <motion.div
          className={`cardo-search-pill${isSearchActive ? ' cardo-search-pill-active' : ''}`}
          animate={{ width: isSearchActive ? 360 : 40 }}
        >
          <IconButton
            className="cardo-search-local-trigger"
            onClick={() => {
              if (isSearchActive) closeSearch();
              else setIsSearchActive(true);
            }}
            aria-label={t('toolbar.search')}
          >
            <Search size={18} />
          </IconButton>
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              runWebSearch();
            }}
            placeholder={t('toolbar.searchPlaceholder')}
            style={{
              opacity: isSearchActive ? 1 : 0,
              pointerEvents: isSearchActive ? 'auto' : 'none',
            }}
          />
          <IconButton
            className="cardo-search-web-trigger"
            disabled={!webSearchUrl}
            onClick={runWebSearch}
            aria-label={t('search.web')}
            title={t('search.web')}
          >
            <Globe2 size={17} />
          </IconButton>
        </motion.div>
        ) : null}
        {!isSystemPageId(activePageId) ? (
          <>
            <div className="cardo-toolbar-divider" />
            <IconButton
              className={[
                'cardo-toolbar-create',
                isFluent ? 'cardo-toolbar-create-labeled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={handleAdd}
              aria-label={t('toolbar.newBox')}
              title={t('toolbar.newBox')}
            >
              <motion.span className="cardo-icon-frame" whileTap={{ scale: 0.82, rotate: 90 }}>
                <Plus size={isFluent ? 16 : 20} />
              </motion.span>
              {isFluent ? <span className="cardo-toolbar-create-label">{t('toolbar.new')}</span> : null}
            </IconButton>
          </>
        ) : null}
      </div>
    </div>
  );
}

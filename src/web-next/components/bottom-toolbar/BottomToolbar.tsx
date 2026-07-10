import { useEffect, useRef, useState } from 'react';
import { Globe2, History, LocateFixed, Lock, Plus, Search, Settings, Unlock } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useIndependentMenuStore } from '../../app/stores/independentMenuStore';
import { useCanvasStore } from '../../app/stores/canvasStore';
import {
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
  getCanvasViewportCenter,
} from '../../domain/canvasGeometry';
import { createBoxFrameCenteredAt } from '../../domain/placement';
import { isCollectionPageId, isSystemPageId } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../primitives/IconPrimitives';
import { GlobalSearchPanel } from '../global-search/GlobalSearchPanel';
import { createWebSearchUrl } from '../../domain/webSearch';
import { openExternalUrl } from '../../platform/hostPlatform';

export function BottomToolbar() {
  const createBox = useWorkspaceStore((state) => state.createBox);
  const activePageId = useWorkspaceStore((state) => state.snapshot.activePageId);
  const panX = useCanvasStore((state) => state.pages[activePageId]?.camera.panX ?? 0);
  const panY = useCanvasStore((state) => state.pages[activePageId]?.camera.panY ?? 0);
  const isCanvasLocked = useCanvasStore((state) => state.pages[activePageId]?.isLocked ?? false);
  const viewportSize = useCanvasStore((state) => state.viewportSize);
  const resetCamera = useCanvasStore((state) => state.resetCamera);
  const toggleCanvasLocked = useCanvasStore((state) => state.toggleLocked);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const searchEngine = usePreferencesStore((state) => state.searchEngine);
  const customSearchTemplate = usePreferencesStore((state) => state.customSearchTemplate);
  const settingsOpen = useIndependentMenuStore((state) => state.menus.settings.open);
  const journalOpen = useIndependentMenuStore((state) => state.menus.journal.open);
  const toggleIndependentMenu = useIndependentMenuStore((state) => state.toggleMenu);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchPillRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const isCollection = isCollectionPageId(activePageId);

  useEffect(() => {
    if (isSearchActive) {
      searchInputRef.current?.focus();
    }
  }, [isSearchActive]);

  const handleAdd = () => {
    const center = getCanvasViewportCenter({ panX, panY }, viewportSize);
    const frame = constrainBoxFrameToCanvas(
      createBoxFrameCenteredAt(center),
      createCanvasWorldBounds(viewportSize),
    );
    createBox('general', frame, t('box.general'));
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!isSearchActive) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (searchPillRef.current?.contains(target) || searchPanelRef.current?.contains(target))
        return;
      closeSearch();
    };

    window.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => window.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [isSearchActive]);

  const webSearchUrl = createWebSearchUrl(searchEngine, customSearchTemplate, searchQuery);
  const runWebSearch = () => {
    if (!webSearchUrl) return;
    openExternalUrl(webSearchUrl);
    closeSearch();
  };

  return (
    <div className="wbn-bottom-shell">
      <AnimatePresence>
        {isSearchActive ? (
          <GlobalSearchPanel query={searchQuery} onClose={closeSearch} rootRef={searchPanelRef} />
        ) : null}
      </AnimatePresence>
      <div className="wbn-journal-control">
        <IconButton
          className={journalOpen ? 'wbn-journal-control-active' : undefined}
          onClick={() => toggleIndependentMenu('journal')}
          aria-label={t('journal.title')}
          title={t('journal.title')}
          aria-expanded={journalOpen}
        >
          <History size={17} />
        </IconButton>
      </div>
      <div className="wbn-bottom-toolbar" aria-label={t('toolbar.workspaceTools')}>
        {!isCollection ? (
          <>
            <IconButton
              className="wbn-toolbar-canvas-control"
              disabled={panX === 0 && panY === 0}
              onClick={() => resetCamera(activePageId)}
              aria-label={t('canvas.returnToOrigin')}
              title={t('canvas.returnToOrigin')}
            >
              <LocateFixed size={18} />
            </IconButton>
            <IconButton
              className={`wbn-toolbar-canvas-control${isCanvasLocked ? ' wbn-toolbar-button-active' : ''}`}
              onClick={() => toggleCanvasLocked(activePageId)}
              aria-label={t(isCanvasLocked ? 'canvas.unlockViewport' : 'canvas.lockViewport')}
              aria-pressed={isCanvasLocked}
              title={t(isCanvasLocked ? 'canvas.unlockViewport' : 'canvas.lockViewport')}
            >
              {isCanvasLocked ? <Lock size={18} /> : <Unlock size={18} />}
            </IconButton>
            <div className="wbn-toolbar-divider" />
          </>
        ) : null}
        <IconButton
          className={`wbn-toolbar-button${settingsOpen ? ' wbn-toolbar-button-active' : ''}`}
          aria-controls="wbn-settings-window"
          aria-expanded={settingsOpen}
          onClick={() => {
            toggleIndependentMenu('settings');
          }}
          title={t('toolbar.settings')}
          aria-label={t('toolbar.settings')}
        >
          <motion.span
            className="wbn-settings-trigger-icon wbn-icon-frame"
            animate={{ rotate: settingsOpen ? 120 : 0, scale: settingsOpen ? 1.08 : 1 }}
            transition={{ type: 'spring', stiffness: 330, damping: 22 }}
          >
            <Settings size={18} />
          </motion.span>
        </IconButton>
        <div className="wbn-toolbar-divider" />
        <motion.div
          ref={searchPillRef}
          className={`wbn-search-pill${isSearchActive ? ' wbn-search-pill-active' : ''}`}
          animate={{ width: isSearchActive ? 360 : 40 }}
        >
          <IconButton
            className="wbn-search-local-trigger"
            onClick={() => {
              if (isSearchActive) closeSearch();
              else setIsSearchActive(true);
            }}
            aria-label={t('toolbar.search')}
          >
            <Search size={18} />
          </IconButton>
          <input
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
            className="wbn-search-web-trigger"
            disabled={!webSearchUrl}
            onClick={runWebSearch}
            aria-label={t('search.web')}
            title={t('search.web')}
          >
            <Globe2 size={17} />
          </IconButton>
        </motion.div>
        {!isSystemPageId(activePageId) ? (
          <>
            <div className="wbn-toolbar-divider" />
            <IconButton
              className="wbn-toolbar-create"
              onClick={handleAdd}
              aria-label={t('toolbar.newBox')}
              title={t('toolbar.newBox')}
            >
              <motion.span className="wbn-icon-frame" whileTap={{ scale: 0.82, rotate: 90 }}>
                <Plus size={20} />
              </motion.span>
            </IconButton>
          </>
        ) : null}
      </div>
    </div>
  );
}

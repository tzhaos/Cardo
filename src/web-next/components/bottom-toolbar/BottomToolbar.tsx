import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  History,
  LocateFixed,
  Lock,
  Plus,
  Search,
  Settings,
  Redo2,
  Undo2,
  Unlock,
} from 'lucide-react';
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
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../primitives/IconPrimitives';
import { GlobalSearchPanel } from '../global-search/GlobalSearchPanel';
import { useCanvasLayoutTools } from '../canvas/useCanvasLayoutTools';

export function BottomToolbar() {
  const createBox = useWorkspaceStore((state) => state.createBox);
  const activePageId = useWorkspaceStore((state) => state.snapshot.activePageId);
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);
  const canUndo = useWorkspaceStore((state) => state.historyPast.length > 0);
  const canRedo = useWorkspaceStore((state) => state.historyFuture.length > 0);
  const panX = useCanvasStore((state) => state.pages[activePageId]?.camera.panX ?? 0);
  const panY = useCanvasStore((state) => state.pages[activePageId]?.camera.panY ?? 0);
  const zoom = useCanvasStore((state) => state.pages[activePageId]?.camera.zoom ?? 1);
  const isCanvasLocked = useCanvasStore((state) => state.pages[activePageId]?.isLocked ?? false);
  const viewportSize = useCanvasStore((state) => state.viewportSize);
  const resetCamera = useCanvasStore((state) => state.resetCamera);
  const toggleCanvasLocked = useCanvasStore((state) => state.toggleLocked);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const settingsOpen = useIndependentMenuStore((state) => state.menus.settings.open);
  const journalOpen = useIndependentMenuStore((state) => state.menus.journal.open);
  const toggleIndependentMenu = useIndependentMenuStore((state) => state.toggleMenu);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const { openCanvasLayoutTools } = useCanvasLayoutTools();
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

  return (
    <div className="wbn-bottom-shell">
      <AnimatePresence>
        {isSearchActive ? <GlobalSearchPanel query={searchQuery} onClose={closeSearch} /> : null}
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
      <div className="wbn-history-controls" aria-label={t('history.controls')}>
        <IconButton
          disabled={!canUndo}
          onClick={undo}
          aria-label={t('history.undo')}
          title={t('history.undo')}
        >
          <Undo2 size={17} />
        </IconButton>
        <IconButton
          disabled={!canRedo}
          onClick={redo}
          aria-label={t('history.redo')}
          title={t('history.redo')}
        >
          <Redo2 size={17} />
        </IconButton>
      </div>
      <div className="wbn-bottom-toolbar" aria-label={t('toolbar.workspaceTools')}>
        {!isCollection ? (
          <>
            <IconButton
              className="wbn-toolbar-canvas-control"
              disabled={panX === 0 && panY === 0 && zoom === 1}
              onClick={() => resetCamera(activePageId)}
              aria-label={t('canvas.returnToOrigin')}
              title={t('canvas.returnToOrigin')}
            >
              <LocateFixed size={18} />
            </IconButton>
            <IconButton
              className="wbn-toolbar-canvas-control"
              onClick={(event) => {
                const triggerRect = event.currentTarget.getBoundingClientRect();
                openCanvasLayoutTools(triggerRect.left, triggerRect.top - 8);
              }}
              aria-label={t('canvas.layoutTools')}
              title={t('canvas.layoutTools')}
            >
              <LayoutDashboard size={18} />
            </IconButton>
            <IconButton
              className={`wbn-toolbar-canvas-control${isCanvasLocked ? ' wbn-toolbar-button-active' : ''}`}
              onClick={() => toggleCanvasLocked(activePageId)}
              aria-label={t(isCanvasLocked ? 'canvas.unlockViewport' : 'canvas.lockViewport')}
              aria-pressed={isCanvasLocked}
              title={t(isCanvasLocked ? 'canvas.unlockViewport' : 'canvas.lockViewport')}
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  className="wbn-icon-frame"
                  key={isCanvasLocked ? 'locked' : 'unlocked'}
                  initial={{ opacity: 0, scale: 0.72, rotate: isCanvasLocked ? -18 : 18 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.72, rotate: isCanvasLocked ? 18 : -18 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.5 }}
                >
                  {isCanvasLocked ? <Lock size={18} /> : <Unlock size={18} />}
                </motion.span>
              </AnimatePresence>
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
        <motion.div className="wbn-search-pill" animate={{ width: isSearchActive ? 320 : 40 }}>
          <IconButton
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
            placeholder={t('toolbar.searchPlaceholder')}
            style={{
              opacity: isSearchActive ? 1 : 0,
              pointerEvents: isSearchActive ? 'auto' : 'none',
            }}
          />
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

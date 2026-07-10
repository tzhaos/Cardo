import { useEffect, useRef, useState } from 'react';
import { LocateFixed, Lock, Plus, Search, Settings, Unlock } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useIndependentMenuStore } from '../../app/stores/independentMenuStore';
import { useCanvasStore } from '../../app/stores/canvasStore';
import {
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
  getCanvasViewportCenter,
} from '../../domain/canvasGeometry';
import { createBoxFrameCenteredAt } from '../../domain/placement';
import { isRecycleBinPageId } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../primitives/IconPrimitives';

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
  const settingsOpen = useIndependentMenuStore((state) => state.menus.settings.open);
  const toggleIndependentMenu = useIndependentMenuStore((state) => state.toggleMenu);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const isRecycleBin = isRecycleBinPageId(activePageId);

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
      <div className="wbn-bottom-toolbar" aria-label={t('toolbar.workspaceTools')}>
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
        <motion.div className="wbn-search-pill" animate={{ width: isSearchActive ? 240 : 40 }}>
          <IconButton
            onClick={() => {
              setIsSearchActive((value) => !value);
            }}
            aria-label={t('toolbar.search')}
          >
            <Search size={18} />
          </IconButton>
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onBlur={() => {
              if (!searchQuery) {
                closeSearch();
              }
            }}
            placeholder={t('toolbar.searchPlaceholder')}
            style={{
              opacity: isSearchActive ? 1 : 0,
              pointerEvents: isSearchActive ? 'auto' : 'none',
            }}
          />
        </motion.div>
        {!isRecycleBin ? (
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

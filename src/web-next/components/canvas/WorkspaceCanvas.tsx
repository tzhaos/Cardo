import { useDeferredValue, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence, LayoutGroup, motion, type Variants } from 'motion/react';
import { SearchX, Trash2 } from 'lucide-react';
import { useCanvasPan } from '../../app/useCanvasPan';
import { useCanvasViewport } from '../../app/useCanvasViewport';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import {
  clientPointToCanvasWorld,
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
} from '../../domain/canvasGeometry';
import { createBoxFrameCenteredAt } from '../../domain/placement';
import { isRecycleBinPageId, type WorkspaceBoxPreset } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { useFloatingMenu } from '../floating-menu/useFloatingMenu';
import { WorkspaceBoxRenderer } from './WorkspaceBoxRenderer';

export function WorkspaceCanvas() {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const createBox = useWorkspaceStore((state) => state.createBox);
  const createPage = useWorkspaceStore((state) => state.createPage);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const panX = useCanvasStore((state) => state.pages[snapshot.activePageId]?.camera.panX ?? 0);
  const panY = useCanvasStore((state) => state.pages[snapshot.activePageId]?.camera.panY ?? 0);
  const viewportSize = useCanvasStore((state) => state.viewportSize);
  const { openCanvasMenu } = useFloatingMenu();
  const { t } = useI18n();
  const boxes = useMemo(() => {
    const activeBoxes = snapshot.boxes.filter((box) => box.pageId === snapshot.activePageId);
    const query = deferredSearchQuery.trim().toLowerCase();
    if (!query) {
      return activeBoxes;
    }
    return activeBoxes.filter(
      (box) =>
        box.title.toLowerCase().includes(query) ||
        box.items.some(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            (item.type === 'clipboard' && item.text.toLowerCase().includes(query)),
        ),
    );
  }, [deferredSearchQuery, snapshot.activePageId, snapshot.boxes]);
  const isSearchFiltering = Boolean(deferredSearchQuery.trim());
  const isRecycleBin = isRecycleBinPageId(snapshot.activePageId);
  const previousActivePageIdRef = useRef(snapshot.activePageId);
  const canvasRef = useRef<HTMLElement>(null);
  const { handlePointerDownCapture, isLocked, isPanModifierActive, isPanning } = useCanvasPan(
    snapshot.activePageId,
  );
  useCanvasViewport(canvasRef);
  const canvasBounds = useMemo(() => createCanvasWorldBounds(viewportSize), [viewportSize]);
  const pageOrder = useMemo(
    () => [...snapshot.pages].sort((first, second) => first.order - second.order),
    [snapshot.pages],
  );
  const previousPageIndex = pageOrder.findIndex(
    (page) => page.id === previousActivePageIdRef.current,
  );
  const activePageIndex = pageOrder.findIndex((page) => page.id === snapshot.activePageId);
  const pageTransitionDirection = activePageIndex < previousPageIndex ? -1 : 1;
  const isPageSwitch = previousActivePageIdRef.current !== snapshot.activePageId;
  const canvasClassName = [
    'wbn-canvas',
    isLocked ? 'wbn-canvas-locked' : '',
    isPanModifierActive && !isLocked ? 'wbn-canvas-pan-ready' : '',
    isPanning ? 'wbn-canvas-panning' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const worldStyle = {
    transform: `translate3d(${panX}px, ${panY}px, 0)`,
  } satisfies CSSProperties;
  const boundaryStyle = {
    left: canvasBounds.minX,
    top: canvasBounds.minY,
    width: canvasBounds.width,
    height: canvasBounds.height,
  } satisfies CSSProperties;

  useEffect(() => {
    previousActivePageIdRef.current = snapshot.activePageId;
  }, [snapshot.activePageId]);

  return (
    <main
      className={canvasClassName}
      ref={canvasRef}
      onPointerDownCapture={handlePointerDownCapture}
      onContextMenu={(event) => {
        if (
          isRecycleBin ||
          (event.target instanceof Element && event.target.closest('[data-canvas-box]'))
        ) {
          return;
        }

        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const point = clientPointToCanvasWorld(event, rect, { panX, panY });
        openCanvasMenu(event.clientX, event.clientY, {
          createPage: () => createPage(t('page.untitled')),
          createBox: (preset: WorkspaceBoxPreset) =>
            createBox(
              preset,
              constrainBoxFrameToCanvas(createBoxFrameCenteredAt(point), canvasBounds),
              getBoxPresetLabel(preset, t),
            ),
        });
      }}
    >
      <AnimatePresence initial={false} mode="sync" custom={pageTransitionDirection}>
        <motion.section
          className="wbn-page-scene"
          custom={pageTransitionDirection}
          key={snapshot.activePageId}
          variants={pageSceneVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          <div className="wbn-canvas-world" style={worldStyle}>
            <div className="wbn-canvas-boundary" style={boundaryStyle} />
            <LayoutGroup id={`workspace-items-${snapshot.activePageId}`}>
              {boxes.map((box) => (
                <WorkspaceBoxRenderer
                  box={box}
                  key={box.id}
                  skipEntryAnimation={isSearchFiltering || isPageSwitch}
                />
              ))}
            </LayoutGroup>
          </div>
          <AnimatePresence>
            {isRecycleBin && !isSearchFiltering && boxes.length === 0 ? (
              <motion.div
                className="wbn-recycle-bin-empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <Trash2 size={22} />
                <span>{t('page.recycleBinEmpty')}</span>
              </motion.div>
            ) : isSearchFiltering && boxes.length === 0 ? (
              <motion.div
                className="wbn-search-feedback"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <SearchX size={18} />
                <span>{t('search.noResults')}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.section>
      </AnimatePresence>
    </main>
  );
}

const pageSceneVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 18, scale: 0.992 }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'tween', duration: 0.24, ease: [0.2, 0.8, 0.2, 1] },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -12,
    scale: 0.996,
    transition: { type: 'tween', duration: 0.16, ease: [0.4, 0, 1, 1] },
  }),
};

function getBoxPresetLabel(preset: WorkspaceBoxPreset, t: ReturnType<typeof useI18n>['t']) {
  return preset === 'general'
    ? t('box.general')
    : preset === 'folder'
      ? t('box.folder')
      : preset === 'bookmark'
        ? t('box.bookmark')
        : t('box.clipboard');
}

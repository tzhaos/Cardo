import { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus } from 'lucide-react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { useUiStore } from '../../app/stores/uiStore';
import { getPageCanvasState, useCanvasStore } from '../../app/stores/canvasStore';
import { useStagedOrder } from '../../app/motion/useStagedOrder';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { createLatestFrameScheduler } from '../../app/motion/frameScheduler';
import { startWindowPointerSession } from '../../app/windowPointerSession';
import { findPageLandingFrame } from '../../domain/placement';
import {
  clientPointToCanvasWorld,
  getCanvasViewportCenter,
  getVisibleCanvasWorldBounds,
} from '../../domain/canvasGeometry';
import { isRecycleBinPageId } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { RecycleBinTab } from './RecycleBinTab';
import { TabDeleteConfirmView } from './TabDeleteConfirmView';
import { TabPill } from './TabPill';

export function TopBar() {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const createPage = useWorkspaceStore((state) => state.createPage);
  const renamePage = useWorkspaceStore((state) => state.renamePage);
  const deletePage = useWorkspaceStore((state) => state.deletePage);
  const reorderPages = useWorkspaceStore((state) => state.reorderPages);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const setDefaultPage = useWorkspaceStore((state) => state.setDefaultPage);
  const moveBoxToPage = useWorkspaceStore((state) => state.moveBoxToPage);
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const boxDragOverTopBar = useUiStore((state) => state.boxDragOverTopBar);
  const boxDropPageId = useUiStore((state) => state.boxDropPageId);
  const boxDropRelease = useUiStore((state) => state.boxDropRelease);
  const setBoxDragOverTopBar = useUiStore((state) => state.setBoxDragOverTopBar);
  const setBoxDropPage = useUiStore((state) => state.setBoxDropPage);
  const finishBoxDrop = useUiStore((state) => state.finishBoxDrop);
  const clearBoxDropRelease = useUiStore((state) => state.clearBoxDropRelease);
  const endBoxDrag = useUiStore((state) => state.endBoxDrag);
  const [editing, setEditing] = useState(false);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const { t } = useI18n();

  const persistedPages = useMemo(
    () => [...snapshot.pages].sort((first, second) => first.order - second.order),
    [snapshot.pages],
  );
  const workspacePages = useMemo(
    () => persistedPages.filter((page) => !isRecycleBinPageId(page.id)),
    [persistedPages],
  );
  const recycleBinPage = persistedPages.find((page) => isRecycleBinPageId(page.id));
  const {
    orderedIds: pageIds,
    startReordering,
    updateOrder,
    finishReordering,
  } = useStagedOrder(workspacePages, reorderPages);
  const pagesById = useMemo(
    () => new Map(workspacePages.map((page) => [page.id, page])),
    [workspacePages],
  );
  const pages = pageIds
    .map((pageId) => pagesById.get(pageId))
    .filter((page): page is (typeof persistedPages)[number] => Boolean(page));
  const pageToDelete = workspacePages.find((page) => page.id === deletePageId);
  const deleteBoxCount = snapshot.boxes.filter((box) => box.pageId === deletePageId).length;

  useEffect(() => {
    if (!deletePageId) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDeletePageId(null);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-top-bar]')) {
        setDeletePageId(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [deletePageId]);

  useEffect(() => {
    if (!boxDropRelease) {
      return;
    }
    const timeoutId = window.setTimeout(clearBoxDropRelease, 1400);
    return () => window.clearTimeout(timeoutId);
  }, [boxDropRelease, clearBoxDropRelease]);

  useEffect(() => {
    if (!draggedBoxId) {
      return;
    }

    const topBarElement = document.querySelector<HTMLElement>('[data-top-bar]');
    let topBarRect = topBarElement?.getBoundingClientRect();
    const resolveDropPageId = (clientX: number, clientY: number) => {
      const target = document
        .elementsFromPoint(clientX, clientY)
        .map((element) => element.closest<HTMLElement>('[data-page-drop-id]'))
        .find(Boolean);
      return target?.dataset.pageDropId ?? null;
    };
    const resolveTopBarHover = (clientX: number, clientY: number) => {
      return Boolean(
        topBarRect &&
        clientX >= topBarRect.left - 8 &&
        clientX <= topBarRect.right + 8 &&
        clientY >= topBarRect.top - 10 &&
        clientY <= topBarRect.bottom + 10,
      );
    };
    const updateDropTarget = ({ clientX, clientY }: { clientX: number; clientY: number }) => {
      const overTopBar = resolveTopBarHover(clientX, clientY);
      setBoxDragOverTopBar(overTopBar);
      setBoxDropPage(overTopBar ? resolveDropPageId(clientX, clientY) : null);
    };
    const frameScheduler = createLatestFrameScheduler(updateDropTarget);
    const updateTopBarRect = () => {
      topBarRect = topBarElement?.getBoundingClientRect();
    };

    const session = startWindowPointerSession({
      onMove: (event) => {
        frameScheduler.schedule({ clientX: event.clientX, clientY: event.clientY });
      },
      onEnd: (reason, event) => {
        if (reason === 'pointerup' && event instanceof PointerEvent) {
          const currentSnapshot = useWorkspaceStore.getState().snapshot;
          const targetPageId =
            resolveDropPageId(event.clientX, event.clientY) ?? useUiStore.getState().boxDropPageId;
          const movingBox = currentSnapshot.boxes.find((box) => box.id === draggedBoxId);
          if (targetPageId && movingBox && movingBox.pageId !== targetPageId) {
            const canvasState = useCanvasStore.getState();
            const targetPageCanvas = getPageCanvasState(canvasState, targetPageId);
            const landingFrame = findPageLandingFrame(
              currentSnapshot,
              draggedBoxId,
              targetPageId,
              getCanvasViewportCenter(targetPageCanvas.camera, canvasState.viewportSize),
              getVisibleCanvasWorldBounds(targetPageCanvas.camera, canvasState.viewportSize),
            );
            const targetFrame = landingFrame ?? movingBox.frame;
            const visibleBounds = getVisibleCanvasWorldBounds(
              targetPageCanvas.camera,
              canvasState.viewportSize,
            );
            const compactScale = Math.max(
              0.22,
              Math.min(0.46, 136 / movingBox.frame.width, 86 / movingBox.frame.height),
            );
            const entryScale = compactScale * 0.9;
            const releaseElement = document.querySelector<HTMLElement>(
              `[data-box-id="${draggedBoxId}"]`,
            );
            const releaseRect = releaseElement?.getBoundingClientRect();
            const computedOrigin = releaseElement
              ? window.getComputedStyle(releaseElement).transformOrigin
              : `${movingBox.frame.width / 2}px ${movingBox.frame.height / 2}px`;
            const [originX = movingBox.frame.width / 2, originY = movingBox.frame.height / 2] =
              computedOrigin.split(' ').map((value) => Number.parseFloat(value));
            const canvasRect = document
              .querySelector<HTMLElement>('[data-workspace-canvas]')
              ?.getBoundingClientRect() ?? { left: 0, top: 0 };
            const releaseTopLeft = releaseRect
              ? clientPointToCanvasWorld(
                  { clientX: releaseRect.left, clientY: releaseRect.top },
                  canvasRect,
                  targetPageCanvas.camera,
                )
              : {
                  x: visibleBounds.minX + visibleBounds.width / 2,
                  y: visibleBounds.minY,
                };
            const entryFrame = {
              ...targetFrame,
              x: releaseTopLeft.x - originX * (1 - entryScale),
              y: releaseTopLeft.y - originY * (1 - entryScale),
            };
            finishBoxDrop(draggedBoxId, targetPageId, entryFrame, entryScale, computedOrigin);
            moveBoxToPage(draggedBoxId, targetPageId, targetFrame);
          }
        }
        endBoxDrag();
      },
    });

    window.addEventListener('resize', updateTopBarRect);
    return () => {
      frameScheduler.cancel();
      window.removeEventListener('resize', updateTopBarRect);
      session.dispose();
    };
  }, [
    draggedBoxId,
    endBoxDrag,
    finishBoxDrop,
    moveBoxToPage,
    setBoxDragOverTopBar,
    setBoxDropPage,
  ]);

  const topBarClassName = [
    'wbn-top-bar',
    draggedBoxId ? 'wbn-top-bar-drop-mode' : '',
    boxDragOverTopBar ? 'wbn-top-bar-drag-over' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={topBarClassName} data-editing={editing || undefined} data-top-bar>
      <AnimatePresence mode="popLayout">
        {pageToDelete ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <TabDeleteConfirmView
              title={pageToDelete.title}
              boxCount={deleteBoxCount}
              onCancel={() => setDeletePageId(null)}
              onConfirm={() => {
                deletePage(pageToDelete.id);
                setDeletePageId(null);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            className="wbn-top-inner"
            key="tabs"
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ layout: { type: 'spring', stiffness: 460, damping: 38, mass: 0.72 } }}
          >
            <Reorder.Group
              as="nav"
              axis="x"
              className="wbn-tabs"
              values={pageIds}
              onReorder={updateOrder}
              aria-label={t('page.workspacePages')}
            >
              <AnimatePresence mode="popLayout">
                {pages.map((page) => (
                  <Reorder.Item
                    as="div"
                    className={[
                      boxDropPageId === page.id ? 'wbn-box-drop-target' : '',
                      boxDropRelease?.pageId === page.id ? 'wbn-box-drop-released' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    data-page-drop-id={page.id}
                    key={page.id}
                    value={page.id}
                    dragListener={editing}
                    layout="position"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, width: 0 }}
                    whileDrag={{ opacity: 0.68, scale: 1.03, zIndex: 80 }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                    onDragStart={startReordering}
                    onDragEnd={finishReordering}
                  >
                    <TabPill
                      active={page.id === snapshot.activePageId}
                      canDelete={pages.length > 1}
                      defaultPage={page.id === snapshot.defaultPageId}
                      editing={editing}
                      page={page}
                      onActivate={() => setActivePage(page.id)}
                      onSetDefault={() => setDefaultPage(page.id)}
                      onRename={(title) => renamePage(page.id, title)}
                      onDelete={() => {
                        if (snapshot.boxes.some((box) => box.pageId === page.id)) {
                          setDeletePageId(page.id);
                        } else {
                          deletePage(page.id);
                        }
                      }}
                    />
                  </Reorder.Item>
                ))}
              </AnimatePresence>
              {recycleBinPage ? (
                <RecycleBinTab
                  active={recycleBinPage.id === snapshot.activePageId}
                  highlighted={boxDropPageId === recycleBinPage.id}
                  page={recycleBinPage}
                  released={boxDropRelease?.pageId === recycleBinPage.id}
                  onActivate={() => setActivePage(recycleBinPage.id)}
                />
              ) : null}
            </Reorder.Group>
            <motion.div className="wbn-top-actions" layout="position">
              <motion.button
                className="wbn-icon-button"
                type="button"
                onClick={() => createPage(t('page.untitled'))}
                aria-label={t('page.add')}
                whileTap={{ scale: 0.9 }}
              >
                <Plus size={18} />
              </motion.button>
              <motion.button
                className={`wbn-icon-button${editing ? ' wbn-check-button' : ''}`}
                type="button"
                onClick={() => setEditing((value) => !value)}
                aria-label={editing ? t('page.finishEditing') : t('page.edit')}
                whileTap={{ scale: 0.9 }}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    className="wbn-top-action-icon wbn-icon-frame"
                    key={editing ? 'done' : 'edit'}
                    initial={{ opacity: 0, rotate: editing ? -38 : 38, scale: 0.68 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: editing ? 38 : -38, scale: 0.68 }}
                    transition={{ type: 'spring', stiffness: 540, damping: 32, mass: 0.54 }}
                  >
                    {editing ? <Check size={18} /> : <Pencil size={18} />}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

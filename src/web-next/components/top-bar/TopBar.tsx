import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { House, Plus, SquarePen, Trash2 } from 'lucide-react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { useUiStore } from '../../app/stores/uiStore';
import { useStagedOrder } from '../../app/motion/useStagedOrder';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { isCollectionPageId, isRecycleBinPageId, isSystemPageId } from '../../domain/workspace';
import { registerTopBarElement } from '../../app/interactionElementRegistry';
import { useI18n } from '../../i18n/useI18n';
import { CollectionTab } from './CollectionTab';
import { RecycleBinTab } from './RecycleBinTab';
import { TabDeleteConfirmView } from './TabDeleteConfirmView';
import { SortablePageTab } from './SortablePageTab';
import { MotionButton } from '../../ui/primitives/motion-button';
import { IconButton } from '../../ui/cardo/icon-button';
import { useContextMenu } from '../../ui/cardo/context-menu';
import { useFeatureEnabled } from '../../shell/FeatureGate';
import { useCanvasTools } from '../canvas/useCanvasTools';

export function TopBar() {
  const showCollection = useFeatureEnabled('workspace.collection');
  const showRecycleBin = useFeatureEnabled('workspace.recycleBin');
  const multiPage = useFeatureEnabled('workspace.multiPage');
  const showCanvasTools = useFeatureEnabled('chrome.canvasTools');
  const themeId = usePreferencesStore((state) => state.themeId);
  const isFluent = themeId === 'fluent';
  const { isLocked, items: canvasToolItems } = useCanvasTools();
  const persistedPageRows = useWorkspaceStore((state) => state.projection.pages);
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);
  const defaultPageId = useWorkspaceStore((state) => state.projection.defaultPageId);
  const createPage = useWorkspaceStore((state) => state.createPage);
  const renamePage = useWorkspaceStore((state) => state.renamePage);
  const deletePage = useWorkspaceStore((state) => state.deletePage);
  const reorderPages = useWorkspaceStore((state) => state.reorderPages);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const setDefaultPage = useWorkspaceStore((state) => state.setDefaultPage);
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const boxDragOverTopBar = useUiStore((state) => state.boxDragOverTopBar);
  const boxDropPageId = useUiStore((state) => state.boxDropPageId);
  const boxDropRelease = useUiStore((state) => state.boxDropRelease);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [renamePageId, setRenamePageId] = useState<string | null>(null);
  const contextMenu = useContextMenu();
  const { t } = useI18n();

  const persistedPages = useMemo(
    () => [...persistedPageRows].sort((first, second) => first.order - second.order),
    [persistedPageRows],
  );
  const workspacePages = useMemo(
    () => persistedPages.filter((page) => !isSystemPageId(page.id)),
    [persistedPages],
  );
  /**
   * Visible tab strip: collection / recycle (if enabled) + workspace pages.
   * Single-page mode only shows the active workspace tab among user pages.
   */
  const stripPages = useMemo(() => {
    return persistedPages.filter((page) => {
      if (isCollectionPageId(page.id)) return showCollection;
      if (isRecycleBinPageId(page.id)) return showRecycleBin;
      if (!multiPage) return page.id === activePageId;
      return true;
    });
  }, [persistedPages, showCollection, showRecycleBin, multiPage, activePageId]);
  const commitStripOrder = useCallback(
    (orderedIds: string[]) => {
      if (multiPage) {
        reorderPages(orderedIds);
        return;
      }
      // Hidden workspace pages stay after the visible strip, prior relative order kept.
      const hiddenWorkspaceIds = workspacePages
        .map((page) => page.id)
        .filter((id) => !orderedIds.includes(id));
      reorderPages([...orderedIds, ...hiddenWorkspaceIds]);
    },
    [multiPage, reorderPages, workspacePages],
  );
  const {
    orderedIds: stripPageIds,
    startReordering,
    updateOrder,
    finishReordering,
  } = useStagedOrder(stripPages, commitStripOrder);
  const pagesById = useMemo(
    () => new Map(persistedPages.map((page) => [page.id, page])),
    [persistedPages],
  );
  const orderedStripPages = stripPageIds
    .map((pageId) => pagesById.get(pageId))
    .filter((page): page is (typeof persistedPages)[number] => Boolean(page));
  const pageToDelete = workspacePages.find((page) => page.id === deletePageId);
  const deleteBoxCount = useWorkspaceStore(
    (state) => state.projection.boxes.filter((box) => box.pageId === deletePageId).length,
  );

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

  const topBarClassName = [
    'cardo-top-bar',
    pageToDelete ? 'cardo-top-bar-confirming' : '',
    draggedBoxId ? 'cardo-top-bar-drop-mode' : '',
    boxDragOverTopBar ? 'cardo-top-bar-drag-over' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const openNewPage = () => createPage(t('page.untitled'));
  const openPageMenu = (
    event: ReactMouseEvent<HTMLElement>,
    page?: (typeof workspacePages)[number],
  ) => {
    event.preventDefault();
    contextMenu.openMenu(event.clientX, event.clientY, [
      ...(multiPage
        ? [
            {
              id: 'new-page',
              label: t('menu.newPage'),
              icon: <Plus size={16} />,
              onSelect: openNewPage,
            },
          ]
        : []),
      ...(page
        ? [
            {
              id: 'rename-page',
              label: t('menu.rename'),
              icon: <SquarePen size={16} />,
              onSelect: () => setRenamePageId(page.id),
            },
            ...(multiPage
              ? [
                  {
                    id: 'set-default-page',
                    label: t(page.id === defaultPageId ? 'page.default' : 'page.setDefault'),
                    icon: <House size={16} />,
                    disabled: page.id === defaultPageId,
                    onSelect: () => setDefaultPage(page.id),
                  },
                  {
                    id: 'delete-page',
                    label: t('page.delete', { title: page.title }),
                    icon: <Trash2 size={16} />,
                    danger: true,
                    disabled: workspacePages.length <= 1,
                    onSelect: () => setDeletePageId(page.id),
                  },
                ]
              : []),
          ]
        : []),
    ]);
  };

  const canReorderTabs = multiPage || stripPages.length > 1;
  const beginTabReorder = canReorderTabs ? startReordering : () => undefined;
  const endTabReorder = canReorderTabs ? finishReordering : () => undefined;

  const tabStrip = (
    <AnimatePresence mode="popLayout">
      {orderedStripPages.map((page) => {
        if (isCollectionPageId(page.id)) {
          return (
            <CollectionTab
              key={page.id}
              active={page.id === activePageId}
              highlighted={boxDropPageId === page.id}
              page={page}
              released={boxDropRelease?.pageId === page.id}
              reorderable={canReorderTabs}
              onActivate={() => {
                useUiStore.getState().selectBox(null);
                setActivePage(page.id);
              }}
              onContextMenu={(event) => openPageMenu(event)}
              onReorderStart={beginTabReorder}
              onReorderEnd={endTabReorder}
            />
          );
        }
        if (isRecycleBinPageId(page.id)) {
          return (
            <RecycleBinTab
              key={page.id}
              active={page.id === activePageId}
              highlighted={boxDropPageId === page.id}
              page={page}
              released={boxDropRelease?.pageId === page.id}
              reorderable={canReorderTabs}
              onActivate={() => setActivePage(page.id)}
              onContextMenu={(event) => openPageMenu(event)}
              onReorderStart={beginTabReorder}
              onReorderEnd={endTabReorder}
            />
          );
        }
        return (
          <SortablePageTab
            active={page.id === activePageId}
            className={[
              boxDropPageId === page.id ? 'cardo-box-drop-target' : '',
              boxDropRelease?.pageId === page.id ? 'cardo-box-drop-released' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={page.id}
            page={page}
            renameRequested={renamePageId === page.id}
            onActivate={() => setActivePage(page.id)}
            onContextMenu={(event) => openPageMenu(event, page)}
            onRename={(title) => renamePage(page.id, title)}
            onRenameRequestHandled={() => setRenamePageId(null)}
            onReorderStart={beginTabReorder}
            onReorderEnd={endTabReorder}
            reorderable={canReorderTabs}
          />
        );
      })}
    </AnimatePresence>
  );

  return (
    <header className={topBarClassName} data-top-bar ref={registerTopBarElement}>
      <motion.div
        className="cardo-top-inner"
        layout="position"
        initial={false}
        animate={{ opacity: pageToDelete ? 0 : 1, x: pageToDelete ? -6 : 0 }}
        transition={{
          opacity: { duration: 0.12, delay: pageToDelete ? 0 : 0.1 },
          x: { duration: 0.16, delay: pageToDelete ? 0 : 0.08 },
          layout: draggedBoxId
            ? { type: 'tween', duration: 0 }
            : { type: 'spring', stiffness: 460, damping: 38, mass: 0.72 },
        }}
        aria-hidden={Boolean(pageToDelete)}
      >
        <div className="cardo-top-leading" aria-hidden="true" />
        <div className="cardo-top-center">
          <Reorder.Group
            as="nav"
            axis="x"
            className="cardo-tabs"
            values={stripPageIds}
            onReorder={updateOrder}
            aria-label={t('page.workspacePages')}
          >
            {tabStrip}
          </Reorder.Group>
          {multiPage ? (
            <motion.div className="cardo-top-actions" layout="position">
              <MotionButton
                variant="icon"
                className="cardo-icon-button"
                type="button"
                onClick={openNewPage}
                aria-label={t('page.add')}
                whileTap={{ scale: 0.9 }}
              >
                <Plus size={18} />
              </MotionButton>
            </motion.div>
          ) : null}
        </div>
        <div className="cardo-top-trailing">
          {isFluent && showCanvasTools
            ? canvasToolItems.map((item) => (
                <IconButton
                  key={item.id}
                  className={[
                    'cardo-top-tool-button',
                    item.id === 'toggle-canvas-lock' && isLocked
                      ? 'cardo-canvas-tools-button-active'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={item.disabled}
                  aria-label={item.label}
                  aria-pressed={item.id === 'toggle-canvas-lock' ? isLocked : undefined}
                  title={item.label}
                  onClick={() => item.onSelect?.()}
                >
                  {item.icon}
                </IconButton>
              ))
            : null}
        </div>
      </motion.div>
      <AnimatePresence>
        {pageToDelete ? (
          <motion.div
            className="cardo-tab-confirm-layer"
            key={pageToDelete.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6, transition: { duration: 0.12, ease: 'easeIn' } }}
            transition={{ duration: 0.18, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
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
        ) : null}
      </AnimatePresence>
    </header>
  );
}

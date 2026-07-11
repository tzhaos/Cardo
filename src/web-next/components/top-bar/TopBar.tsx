import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { House, Plus, SquarePen, Trash2 } from 'lucide-react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { useUiStore } from '../../app/stores/uiStore';
import { useStagedOrder } from '../../app/motion/useStagedOrder';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { isCollectionPageId, isRecycleBinPageId, isSystemPageId } from '../../domain/workspace';
import { registerTopBarElement } from '../../app/interactionElementRegistry';
import { useI18n } from '../../i18n/useI18n';
import { CollectionTab } from './CollectionTab';
import { RecycleBinTab } from './RecycleBinTab';
import { TabDeleteConfirmView } from './TabDeleteConfirmView';
import { SortablePageTab } from './SortablePageTab';
import { useFloatingMenu } from '../floating-menu/useFloatingMenu';

export function TopBar() {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
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
  const { openMenu } = useFloatingMenu();
  const { t } = useI18n();

  const persistedPages = useMemo(
    () => [...snapshot.pages].sort((first, second) => first.order - second.order),
    [snapshot.pages],
  );
  const workspacePages = useMemo(
    () => persistedPages.filter((page) => !isSystemPageId(page.id)),
    [persistedPages],
  );
  const collectionPage = persistedPages.find((page) => isCollectionPageId(page.id));
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

  const topBarClassName = [
    'wbn-top-bar',
    pageToDelete ? 'wbn-top-bar-confirming' : '',
    draggedBoxId ? 'wbn-top-bar-drop-mode' : '',
    boxDragOverTopBar ? 'wbn-top-bar-drag-over' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const openNewPage = () => createPage(t('page.untitled'));
  const openPageMenu = (
    event: ReactMouseEvent<HTMLElement>,
    page?: (typeof workspacePages)[number],
  ) => {
    event.preventDefault();
    openMenu({
      id: page ? `page-${page.id}` : 'system-page',
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          id: 'new-page',
          label: t('menu.newPage'),
          icon: <Plus size={16} />,
          onSelect: openNewPage,
        },
        ...(page
          ? [
              {
                id: 'rename-page',
                label: t('menu.rename'),
                icon: <SquarePen size={16} />,
                onSelect: () => setRenamePageId(page.id),
              },
              {
                id: 'set-default-page',
                label: t(page.id === snapshot.defaultPageId ? 'page.default' : 'page.setDefault'),
                icon: <House size={16} />,
                disabled: page.id === snapshot.defaultPageId,
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
      ],
    });
  };

  return (
    <header className={topBarClassName} data-top-bar ref={registerTopBarElement}>
      <motion.div
        className="wbn-top-inner"
        layout="position"
        initial={false}
        animate={{ opacity: pageToDelete ? 0 : 1, x: pageToDelete ? -6 : 0 }}
        transition={{
          opacity: { duration: 0.12, delay: pageToDelete ? 0 : 0.1 },
          x: { duration: 0.16, delay: pageToDelete ? 0 : 0.08 },
          layout: { type: 'spring', stiffness: 460, damping: 38, mass: 0.72 },
        }}
        aria-hidden={Boolean(pageToDelete)}
      >
        <Reorder.Group
          as="nav"
          axis="x"
          className="wbn-tabs"
          values={pageIds}
          onReorder={updateOrder}
          aria-label={t('page.workspacePages')}
        >
          {collectionPage ? (
            <CollectionTab
              active={collectionPage.id === snapshot.activePageId}
              highlighted={boxDropPageId === collectionPage.id}
              page={collectionPage}
              released={boxDropRelease?.pageId === collectionPage.id}
              onActivate={() => {
                useUiStore.getState().selectBox(null);
                setActivePage(collectionPage.id);
              }}
              onContextMenu={(event) => openPageMenu(event)}
            />
          ) : null}
          <AnimatePresence mode="popLayout">
            {pages.map((page) => (
              <SortablePageTab
                active={page.id === snapshot.activePageId}
                className={[
                  boxDropPageId === page.id ? 'wbn-box-drop-target' : '',
                  boxDropRelease?.pageId === page.id ? 'wbn-box-drop-released' : '',
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
                onReorderStart={startReordering}
                onReorderEnd={finishReordering}
              />
            ))}
          </AnimatePresence>
          {recycleBinPage ? (
            <RecycleBinTab
              active={recycleBinPage.id === snapshot.activePageId}
              highlighted={boxDropPageId === recycleBinPage.id}
              page={recycleBinPage}
              released={boxDropRelease?.pageId === recycleBinPage.id}
              onActivate={() => setActivePage(recycleBinPage.id)}
              onContextMenu={(event) => openPageMenu(event)}
            />
          ) : null}
        </Reorder.Group>
        <motion.div className="wbn-top-actions" layout="position">
          <motion.button
            className="wbn-icon-button"
            type="button"
            onClick={openNewPage}
            aria-label={t('page.add')}
            whileTap={{ scale: 0.9 }}
          >
            <Plus size={18} />
          </motion.button>
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {pageToDelete ? (
          <motion.div
            className="wbn-tab-confirm-layer"
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

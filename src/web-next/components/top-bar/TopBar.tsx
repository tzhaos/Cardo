import { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus } from 'lucide-react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { startWindowPointerSession } from '../../app/windowPointerSession';
import { findPageLandingFrame } from '../../domain/placement';
import { useI18n } from '../../i18n/useI18n';
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
  const boxDropPageId = useUiStore((state) => state.boxDropPageId);
  const setBoxDropPage = useUiStore((state) => state.setBoxDropPage);
  const endBoxDrag = useUiStore((state) => state.endBoxDrag);
  const [editing, setEditing] = useState(false);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const { t } = useI18n();

  const pages = useMemo(
    () => [...snapshot.pages].sort((first, second) => first.order - second.order),
    [snapshot.pages],
  );
  const pageToDelete = pages.find((page) => page.id === deletePageId);
  const pageIds = pages.map((page) => page.id);
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
    if (!draggedBoxId) {
      return;
    }

    const resolveDropPageId = (clientX: number, clientY: number) => {
      const target = document
        .elementsFromPoint(clientX, clientY)
        .map((element) => element.closest<HTMLElement>('[data-page-drop-id]'))
        .find(Boolean);
      return target?.dataset.pageDropId ?? null;
    };

    const session = startWindowPointerSession({
      onMove: (event) => {
        setBoxDropPage(resolveDropPageId(event.clientX, event.clientY));
      },
      onEnd: (reason, event) => {
        if (reason === 'pointerup' && event instanceof PointerEvent) {
          const currentSnapshot = useWorkspaceStore.getState().snapshot;
          const targetPageId =
            resolveDropPageId(event.clientX, event.clientY) ??
            useUiStore.getState().boxDropPageId;
          const movingBox = currentSnapshot.boxes.find((box) => box.id === draggedBoxId);
          if (targetPageId && movingBox && movingBox.pageId !== targetPageId) {
            const landingFrame = findPageLandingFrame(
              currentSnapshot,
              draggedBoxId,
              targetPageId,
              {
                width: window.innerWidth,
                height: window.innerHeight,
              },
            );
            moveBoxToPage(draggedBoxId, targetPageId, landingFrame ?? undefined);
          }
        }
        endBoxDrag();
      },
    });

    return session.dispose;
  }, [draggedBoxId, endBoxDrag, moveBoxToPage, setBoxDropPage]);

  return (
    <header className={`wbn-top-bar${draggedBoxId ? ' wbn-top-bar-drop-mode' : ''}`} data-top-bar>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Reorder.Group
              as="nav"
              axis="x"
              className="wbn-tabs"
              values={pageIds}
              onReorder={reorderPages}
              aria-label={t('page.workspacePages')}
            >
              <AnimatePresence mode="popLayout">
                {pages.map((page) => (
                  <Reorder.Item
                    as="div"
                    className={boxDropPageId === page.id ? 'wbn-box-drop-target' : ''}
                    data-page-drop-id={page.id}
                    key={page.id}
                    value={page.id}
                    dragListener={editing}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, width: 0 }}
                    whileDrag={{ opacity: 0.68, scale: 1.03, zIndex: 80 }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
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
            </Reorder.Group>
            <div className="wbn-top-actions">
              <button
                type="button"
                onClick={() => createPage(t('page.untitled'))}
                aria-label={t('page.add')}
              >
                <Plus size={18} />
              </button>
              <button
                className={editing ? 'wbn-check-button' : ''}
                type="button"
                onClick={() => setEditing((value) => !value)}
                aria-label={editing ? t('page.finishEditing') : t('page.edit')}
              >
                {editing ? <Check size={18} /> : <Pencil size={18} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

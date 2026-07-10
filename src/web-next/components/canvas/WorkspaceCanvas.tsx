import { useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { SearchX, Trash2 } from 'lucide-react';
import { isRecycleBinPageId, type WorkspaceBoxType } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import { getViewportCenterFrame, useWorkspaceStore } from '../../app/stores/workspaceStore';
import { useFloatingMenu } from '../floating-menu/useFloatingMenu';
import { WorkspaceBoxRenderer } from './WorkspaceBoxRenderer';
import { useI18n } from '../../i18n/useI18n';

export function WorkspaceCanvas() {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const createBox = useWorkspaceStore((state) => state.createBox);
  const createPage = useWorkspaceStore((state) => state.createPage);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery);
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
        box.items.some((item) => item.title.toLowerCase().includes(query)),
    );
  }, [deferredSearchQuery, snapshot.activePageId, snapshot.boxes]);
  const isSearchFiltering = Boolean(deferredSearchQuery.trim());
  const isRecycleBin = isRecycleBinPageId(snapshot.activePageId);
  const previousActivePageIdRef = useRef(snapshot.activePageId);
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

  useEffect(() => {
    previousActivePageIdRef.current = snapshot.activePageId;
  }, [snapshot.activePageId]);

  return (
    <main
      className="wbn-canvas"
      onContextMenu={(event) => {
        if (isRecycleBin) {
          return;
        }

        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        openCanvasMenu(event.clientX, event.clientY, {
          createPage: () => createPage(t('page.untitled')),
          createBox: (type: WorkspaceBoxType) =>
            createBox(type, getViewportCenterFrame(type, point), getBoxTypeLabel(type, t)),
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
          {boxes.map((box) => (
            <WorkspaceBoxRenderer
              box={box}
              key={box.id}
              skipEntryAnimation={isSearchFiltering || isPageSwitch}
            />
          ))}
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

function getBoxTypeLabel(type: WorkspaceBoxType, t: ReturnType<typeof useI18n>['t']) {
  return type === 'folder'
    ? t('box.folder')
    : type === 'bookmark'
      ? t('box.bookmark')
      : t('box.clipboard');
}

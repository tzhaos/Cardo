import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SearchX } from 'lucide-react';
import type { WorkspaceBoxType } from '../../domain/workspace';
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
  const { openCanvasMenu } = useFloatingMenu();
  const { t } = useI18n();
  const boxes = useMemo(() => {
    const activeBoxes = snapshot.boxes.filter((box) => box.pageId === snapshot.activePageId);
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return activeBoxes;
    }
    return activeBoxes.filter(
      (box) =>
        box.title.toLowerCase().includes(query) ||
        box.items.some((item) => item.title.toLowerCase().includes(query)),
    );
  }, [searchQuery, snapshot.activePageId, snapshot.boxes]);

  return (
    <main
      className="wbn-canvas"
      onContextMenu={(event) => {
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
      <AnimatePresence mode="popLayout">
        {boxes.map((box) => (
          <WorkspaceBoxRenderer box={box} key={box.id} />
        ))}
      </AnimatePresence>
      <AnimatePresence>
        {searchQuery.trim() && boxes.length === 0 ? (
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
    </main>
  );
}

function getBoxTypeLabel(type: WorkspaceBoxType, t: ReturnType<typeof useI18n>['t']) {
  return type === 'folder'
    ? t('box.folder')
    : type === 'bookmark'
      ? t('box.bookmark')
      : t('box.clipboard');
}

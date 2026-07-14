import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { BookmarkItem as BookmarkItemModel } from '../../domain/workspace';
import { ItemDeleteView } from './ItemDeleteView';
import { ItemContentEditView } from './ItemContentEditView';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';
import { useI18n } from '../../i18n/useI18n';
import { openExternalUrl, resolveWebsiteIcon } from '../../platform/hostPlatform';
import { useItemContextMenu } from './useItemContextMenu';
import { useItemRowInteraction } from './useItemRowInteraction';
import { recordItemActivity } from '../../app/operationActivity';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { showToast } from '../../app/stores/toastStore';
import { Input } from '../../kit/input';
import { IconFrame } from '../../kit/icon-button';
import { ThemeIcon } from '../../kit/icon';
import { FaviconImage } from './FaviconImage';

export function BookmarkItem({
  boxId,
  item,
  highlight,
}: {
  boxId: string;
  item: BookmarkItemModel;
  highlight: boolean;
}) {
  const rename = useItemRename(boxId, item.id, item.title);
  const [deleteView, setDeleteView] = useState(false);
  const [editView, setEditView] = useState(false);
  const setBookmarkFavicon = useWorkspaceStore((state) => state.setBookmarkFavicon);
  const locateHighlight = useUiStore(
    (state) => state.locateHighlight?.boxId === boxId && state.locateHighlight?.itemId === item.id,
  );
  const { t } = useI18n();
  const interactionBlocked = deleteView || editView || rename.renaming;
  const openItem = async () => {
    try {
      const result = await openExternalUrl(item.url);
      if (result.status === 'failed') {
        showToast(t('toast.openFailed'), 'error');
        return;
      }
      recordItemActivity(boxId, item, 'item.open');
    } catch {
      showToast(t('toast.openFailed'), 'error');
    }
  };
  const contextMenu = useItemContextMenu({
    pinned: Boolean(item.isPinned),
    primaryAction: {
      label: t('item.open'),
      icon: <ThemeIcon name="externalLink" size={16} />,
      onSelect: () => void openItem(),
    },
    onRename: rename.startRenaming,
    onEdit: () => setEditView(true),
    onPin: () => rename.setPinned(!item.isPinned),
    onDelete: () => setDeleteView(true),
  });
  const row = useItemRowInteraction({
    boxId,
    itemId: item.id,
    primaryAction: () => void openItem(),
    openContextMenuAt: contextMenu.openAt,
    blocked: interactionBlocked,
  });

  useEffect(() => {
    if (item.favicon) return;
    let active = true;
    void resolveWebsiteIcon(item.url).then((favicon) => {
      if (active && favicon) setBookmarkFavicon(boxId, item.id, favicon);
    });
    return () => {
      active = false;
    };
  }, [boxId, item.favicon, item.id, item.url, setBookmarkFavicon]);

  return (
    <div
      className={`cardo-item-row cardo-bookmark-item${item.isPinned ? ' cardo-item-pinned' : ''}${highlight ? ' cardo-item-new' : ''}${locateHighlight ? ' cardo-item-locate' : ''}${deleteView ? ' cardo-item-delete-state' : ''}${editView ? ' cardo-item-edit-state' : ''}${row.selected ? ' cardo-item-selected' : ''}`}
      tabIndex={interactionBlocked ? -1 : 0}
      onContextMenu={rename.renaming ? rename.onContextMenu : contextMenu.onContextMenu}
      onKeyDown={row.onKeyDown}
      onClick={row.handleSelectionClick}
    >
      <AnimatePresence initial={false} mode="wait">
        {deleteView ? (
          <ItemDeleteView
            key="delete"
            onCancel={() => setDeleteView(false)}
            onConfirm={rename.deleteItem}
          />
        ) : editView ? (
          <ItemContentEditView
            key="edit"
            boxId={boxId}
            item={item}
            onCancel={() => setEditView(false)}
          />
        ) : (
          <motion.div
            className="cardo-item-view-content cardo-item-view-content-row"
            key="content"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
          >
            <IconFrame
              className="cardo-item-glyph"
              role="button"
              tabIndex={0}
              onClick={() => {
                void openItem();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  void openItem();
                }
              }}
            >
              <FaviconImage src={item.favicon} size={12} />
            </IconFrame>
            <div className="cardo-item-main">
              {rename.renaming ? (
                <Input
                  ref={rename.inputRef}
                  className="cardo-inline-rename cardo-item-title-input"
                  value={rename.draft}
                  onChange={(event) => rename.setDraft(event.target.value)}
                  onBlur={rename.commit}
                  onKeyDown={rename.onKeyDown}
                  onContextMenu={rename.onContextMenu}
                />
              ) : item.title ? (
                <strong onDoubleClick={() => rename.startRenaming()}>{item.title}</strong>
              ) : (
                <strong
                  className="cardo-item-title-placeholder"
                  onDoubleClick={() => rename.startRenaming()}
                >
                  {t('item.untitled')}
                </strong>
              )}
              <a
                className="cardo-item-secondary cardo-item-subtitle-link"
                href={item.url}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  event.preventDefault();
                  void openItem();
                }}
              >
                {item.url}
              </a>
            </div>
            <ItemActions
              pinned={Boolean(item.isPinned)}
              onPin={() => rename.setPinned(!item.isPinned)}
              onEdit={() => setEditView(true)}
              onDelete={() => setDeleteView(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

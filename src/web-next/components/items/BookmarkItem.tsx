import { useEffect, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { BookmarkItem as BookmarkItemModel } from '../../domain/workspace';
import { ItemDeleteView } from './ItemDeleteView';
import { ItemContentEditView } from './ItemContentEditView';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';
import { Input } from '../../ui/primitives/input';
import { useI18n } from '../../i18n/useI18n';
import { openExternalUrl } from '../../platform/hostPlatform';
import { IconFrame } from '../../ui/cardo/icon-button';
import { useItemContextMenu } from './useItemContextMenu';
import { recordItemActivity } from '../../app/operationActivity';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { resolveWebsiteIcon } from '../../platform/hostPlatform';

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
  const { t } = useI18n();
  const openItem = () => {
    openExternalUrl(item.url);
    recordItemActivity(boxId, item, 'item.open');
  };
  const contextMenu = useItemContextMenu({
    pinned: Boolean(item.isPinned),
    primaryAction: {
      label: t('item.open'),
      icon: <ExternalLink size={16} />,
      onSelect: openItem,
    },
    onRename: rename.startRenaming,
    onEdit: () => setEditView(true),
    onPin: () => rename.setPinned(!item.isPinned),
    onDelete: () => setDeleteView(true),
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
      className={`wbn-item-row wbn-bookmark-item${item.isPinned ? ' wbn-item-pinned' : ''}${highlight ? ' wbn-item-new' : ''}${deleteView ? ' wbn-item-delete-state' : ''}${editView ? ' wbn-item-edit-state' : ''}`}
      onContextMenu={rename.renaming ? rename.onContextMenu : contextMenu.onContextMenu}
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
            className="wbn-item-view-content wbn-item-view-content-row"
            key="content"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
          >
            <IconFrame
              className="wbn-item-glyph"
              role="button"
              tabIndex={0}
              onClick={() => {
                openItem();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openItem();
                }
              }}
            >
              {item.favicon ? (
                <img className="wbn-website-icon" src={item.favicon} alt="" />
              ) : (
                <Globe size={16} />
              )}
            </IconFrame>
            <div className="wbn-item-main">
              {rename.renaming ? (
                <Input
                  ref={rename.inputRef}
                  className="wbn-inline-rename wbn-item-title-input"
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
                  className="wbn-item-title-placeholder"
                  onDoubleClick={() => rename.startRenaming()}
                >
                  {t('item.untitled')}
                </strong>
              )}
              <a
                className="wbn-item-secondary wbn-item-subtitle-link"
                href={item.url}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  event.preventDefault();
                  openItem();
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

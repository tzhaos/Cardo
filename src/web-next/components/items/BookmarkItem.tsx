import { useState } from 'react';
import { ExternalLink, Globe2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { BookmarkItem as BookmarkItemModel } from '../../domain/workspace';
import { ItemDeleteView } from './ItemDeleteView';
import { ItemContentEditView } from './ItemContentEditView';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';
import { useI18n } from '../../i18n/useI18n';
import { openExternalUrl } from '../../platform/hostPlatform';
import { IconFrame } from '../primitives/IconPrimitives';
import { useItemContextMenu } from './useItemContextMenu';
import { recordItemActivity } from '../../app/operationActivity';

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
  const { t } = useI18n();
  const openItem = () => {
    openExternalUrl(item.url);
    recordItemActivity(boxId, item, 'item.open');
  };
  const openContextMenu = useItemContextMenu({
    itemId: item.id,
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

  return (
    <div
      className={`wbn-item-row wbn-bookmark-item${item.isPinned ? ' wbn-item-pinned' : ''}${highlight ? ' wbn-item-new' : ''}${deleteView ? ' wbn-item-delete-state' : ''}${editView ? ' wbn-item-edit-state' : ''}`}
      onContextMenu={openContextMenu}
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
              <Globe2 size={16} />
            </IconFrame>
            <div className="wbn-item-main">
              {rename.renaming ? (
                <input
                  ref={rename.inputRef}
                  className="wbn-inline-rename wbn-item-title-input"
                  value={rename.draft}
                  onChange={(event) => rename.setDraft(event.target.value)}
                  onBlur={rename.commit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') rename.cancel();
                  }}
                />
              ) : item.title ? (
                <strong onDoubleClick={rename.startRenaming}>{item.title}</strong>
              ) : (
                <strong className="wbn-item-title-placeholder" onDoubleClick={rename.startRenaming}>
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

import { useState } from 'react';
import { AppWindow, File, Folder } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { FileItem, FolderItem, ShortcutItem } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { openLocalResource } from '../../platform/hostPlatform';
import { IconFrame } from '../primitives/IconPrimitives';
import { ItemContentEditView } from './ItemContentEditView';
import { ItemDeleteView } from './ItemDeleteView';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';

type LocalResourceItemModel = FileItem | FolderItem | ShortcutItem;

export function LocalResourceItem({
  boxId,
  item,
  highlight,
}: {
  boxId: string;
  item: LocalResourceItemModel;
  highlight: boolean;
}) {
  const Icon = item.type === 'folder' ? Folder : item.type === 'file' ? File : AppWindow;
  const rename = useItemRename(boxId, item.id, item.title);
  const [deleteView, setDeleteView] = useState(false);
  const [editView, setEditView] = useState(false);
  const { t } = useI18n();

  return (
    <div
      className={`wbn-item-row wbn-local-item wbn-local-item-${item.type}${item.isPinned ? ' wbn-item-pinned' : ''}${highlight ? ' wbn-item-new' : ''}${deleteView ? ' wbn-item-delete-state' : ''}${editView ? ' wbn-item-edit-state' : ''}`}
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
              onClick={() => void openLocalResource(item.path)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  void openLocalResource(item.path);
                }
              }}
            >
              <Icon size={16} />
              {item.type === 'shortcut' ? <span className="wbn-shortcut-badge">↗</span> : null}
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
              ) : (
                <strong
                  className={item.title ? undefined : 'wbn-item-title-placeholder'}
                  onDoubleClick={rename.startRenaming}
                >
                  {item.title || t('item.untitled')}
                </strong>
              )}
              <small className="wbn-item-secondary">{item.path}</small>
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

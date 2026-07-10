import { useState } from 'react';
import { File, Folder, Link } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { FolderItem as FolderItemModel } from '../../domain/workspace';
import { ItemDeleteView } from './ItemDeleteView';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';

export function FolderItem({
  boxId,
  item,
  highlight,
}: {
  boxId: string;
  item: FolderItemModel;
  highlight: boolean;
}) {
  const Icon = item.kind === 'folder' ? Folder : item.kind === 'file' ? File : Link;
  const rename = useItemRename(boxId, item.id, item.title);
  const [deleteView, setDeleteView] = useState(false);

  return (
    <div
      className={`wbn-item-row${highlight ? ' wbn-item-new' : ''}${deleteView ? ' wbn-item-delete-state' : ''}`}
    >
      <AnimatePresence initial={false} mode="wait">
        {deleteView ? (
          <ItemDeleteView
            key="delete"
            onCancel={() => setDeleteView(false)}
            onConfirm={rename.deleteItem}
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
            <span className="wbn-item-glyph">
              <Icon size={16} />
            </span>
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
                <strong onDoubleClick={rename.startRenaming}>{item.title}</strong>
              )}
              <small>{item.path}</small>
            </div>
            <ItemActions
              onEdit={rename.startRenaming}
              onDelete={() => setDeleteView(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

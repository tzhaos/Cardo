import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { BookmarkItem as BookmarkItemModel } from '../../domain/workspace';
import { ItemDeleteView } from './ItemDeleteView';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';
import { useI18n } from '../../i18n/useI18n';
import { openExternalUrl } from '../../platform/hostPlatform';
import { IconFrame } from '../primitives/IconPrimitives';

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
  const { t } = useI18n();

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
            <IconFrame
              className="wbn-item-glyph"
              onClick={() => {
                void openExternalUrl(item.url);
              }}
            >
              <Bookmark size={16} />
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
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    event.preventDefault();
                    openExternalUrl(item.url);
                  }}
                >
                  <strong>{item.title}</strong>
                </a>
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
                  openExternalUrl(item.url);
                }}
              >
                {item.url}
              </a>
            </div>
            <ItemActions onEdit={rename.startRenaming} onDelete={() => setDeleteView(true)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

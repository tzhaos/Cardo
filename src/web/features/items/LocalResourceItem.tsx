import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { FileItem, FolderItem, ShortcutItem } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { openLocalResource } from '../../platform/hostPlatform';
import { showToast } from '../../app/stores/toastStore';
import { ItemContentEditView } from './ItemContentEditView';
import { ItemDeleteView } from './ItemDeleteView';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';
import { useItemContextMenu } from './useItemContextMenu';
import { recordItemActivity } from '../../app/operationActivity';
import { IconFrame } from '../../kit/icon-button';
import { ThemeIcon } from '../../kit/icon';
import { Input } from '../../kit/input';
import type { ThemeIconName } from '../../kit/icon';

type LocalResourceItemModel = FileItem | FolderItem | ShortcutItem;

function localItemIconName(type: LocalResourceItemModel['type']): ThemeIconName {
  if (type === 'folder') return 'folder';
  if (type === 'file') return 'document';
  return 'window';
}

export function LocalResourceItem({
  boxId,
  item,
  highlight,
}: {
  boxId: string;
  item: LocalResourceItemModel;
  highlight: boolean;
}) {
  const iconName = localItemIconName(item.type);
  const rename = useItemRename(boxId, item.id, item.title);
  const [deleteView, setDeleteView] = useState(false);
  const [editView, setEditView] = useState(false);
  const { t } = useI18n();
  const openItem = async () => {
    try {
      const result = await openLocalResource(item.path);
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

  return (
    <div
      className={`cardo-item-row cardo-local-item cardo-local-item-${item.type}${item.isPinned ? ' cardo-item-pinned' : ''}${highlight ? ' cardo-item-new' : ''}${deleteView ? ' cardo-item-delete-state' : ''}${editView ? ' cardo-item-edit-state' : ''}`}
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
              onClick={() => void openItem()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  void openItem();
                }
              }}
            >
              <ThemeIcon name={iconName} size={12} />
              {item.type === 'shortcut' ? <span className="cardo-shortcut-badge">↗</span> : null}
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
              ) : (
                <strong
                  className={item.title ? undefined : 'cardo-item-title-placeholder'}
                  onDoubleClick={() => rename.startRenaming()}
                >
                  {item.title || t('item.untitled')}
                </strong>
              )}
              <small className="cardo-item-secondary">{item.path}</small>
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

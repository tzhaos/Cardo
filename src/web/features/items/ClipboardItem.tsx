import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ThemeIcon } from '../../kit/icon';
import type { ClipboardItem as ClipboardItemModel } from '../../domain/workspace';
import { ItemDeleteView } from './ItemDeleteView';
import { ItemContentEditView } from './ItemContentEditView';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';
import { writeClipboardText } from '../../platform/hostPlatform';
import { showToast } from '../../app/stores/toastStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useI18n } from '../../i18n/useI18n';
import { useItemContextMenu } from './useItemContextMenu';
import { useItemRowInteraction } from './useItemRowInteraction';
import { recordItemActivity } from '../../app/operationActivity';
import { Input } from '../../kit/input';

export function ClipboardItem({
  boxId,
  item,
  highlight,
}: {
  boxId: string;
  item: ClipboardItemModel;
  highlight: boolean;
}) {
  const rename = useItemRename(boxId, item.id, item.title);
  const locateHighlight = useUiStore(
    (state) => state.locateHighlight?.boxId === boxId && state.locateHighlight?.itemId === item.id,
  );
  const [copied, setCopied] = useState(false);
  const [deleteView, setDeleteView] = useState(false);
  const [editView, setEditView] = useState(false);
  const copyResetRef = useRef<number | null>(null);
  const { t } = useI18n();
  const interactionBlocked = deleteView || editView || rename.renaming;

  useEffect(
    () => () => {
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
    },
    [],
  );

  const copyText = async () => {
    try {
      await writeClipboardText(item.text);
      recordItemActivity(boxId, item, 'item.copy');
      setCopied(true);
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
      showToast(t('toast.copyFailed'), 'error');
    }
  };
  const contextMenu = useItemContextMenu({
    pinned: Boolean(item.isPinned),
    primaryAction: {
      label: t('item.copy'),
      icon: <ThemeIcon name="copy" size={16} />,
      onSelect: () => void copyText(),
    },
    onRename: rename.startRenaming,
    onEdit: () => setEditView(true),
    onPin: () => rename.setPinned(!item.isPinned),
    onDelete: () => setDeleteView(true),
  });
  const row = useItemRowInteraction({
    boxId,
    itemId: item.id,
    primaryAction: () => void copyText(),
    openContextMenuAt: contextMenu.openAt,
    blocked: interactionBlocked,
  });

  return (
    <div
      className={`cardo-item-row cardo-clipboard-item${item.isPinned ? ' cardo-item-pinned' : ''}${highlight ? ' cardo-item-new' : ''}${locateHighlight ? ' cardo-item-locate' : ''}${deleteView ? ' cardo-item-delete-state' : ''}${editView ? ' cardo-item-edit-state' : ''}${row.selected ? ' cardo-item-selected' : ''}`}
      title={!deleteView && !editView && !rename.renaming ? t('item.copy') : undefined}
      tabIndex={interactionBlocked ? -1 : 0}
      onContextMenu={rename.renaming ? rename.onContextMenu : contextMenu.onContextMenu}
      onKeyDown={row.onKeyDown}
      onClick={(event) => {
        if (row.handleSelectionClick(event)) return;
        if (interactionBlocked) return;
        void copyText();
      }}
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
            className="cardo-item-view-content cardo-clipboard-card-content"
            key="content"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
          >
            <div className="cardo-clipboard-main">
              {rename.renaming ? (
                <Input
                  ref={rename.inputRef}
                  className="cardo-inline-rename cardo-item-title-input"
                  value={rename.draft}
                  onChange={(event) => rename.setDraft(event.target.value)}
                  onBlur={rename.commit}
                  onKeyDown={rename.onKeyDown}
                  onContextMenu={rename.onContextMenu}
                  onClick={(event) => event.stopPropagation()}
                />
              ) : item.title ? (
                <strong
                  className="cardo-clipboard-title"
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    rename.startRenaming();
                  }}
                >
                  {item.title}
                </strong>
              ) : null}
              <p className="cardo-clipboard-body">{item.text}</p>
            </div>
            <AnimatePresence>
              {copied ? (
                <motion.span
                  className="cardo-clipboard-copied"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.16 }}
                >
                  <ThemeIcon name="check" size={15} />
                  <span>{t('item.copied')}</span>
                </motion.span>
              ) : null}
            </AnimatePresence>
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

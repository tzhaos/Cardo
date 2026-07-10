import { useState } from 'react';
import { motion } from 'motion/react';
import { isUrlText } from '../../../core/domains/items/services/isUrlText';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { parseFolderPathInput } from '../../domain/itemMetadata';
import type { BoxItem } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';

export function ItemContentEditView({
  boxId,
  item,
  onCancel,
}: {
  boxId: string;
  item: BoxItem;
  onCancel: () => void;
}) {
  const updateItemContent = useWorkspaceStore((state) => state.updateItemContent);
  const [draft, setDraft] = useState(getItemContent(item));
  const { t } = useI18n();
  const normalizedContent = normalizeContent(item, draft);
  const showInvalid = draft.trim().length > 0 && normalizedContent === null;

  return (
    <motion.form
      className="wbn-item-edit-view"
      aria-label={t('item.editContent')}
      initial={{ opacity: 0, x: 8, scale: 0.985 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 8, scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.62 }}
      onSubmit={(event) => {
        event.preventDefault();
        if (normalizedContent === null) {
          return;
        }
        updateItemContent(boxId, item.id, normalizedContent);
        onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onCancel();
        }
      }}
    >
      {item.type === 'clipboard' ? (
        <textarea
          autoFocus
          aria-invalid={showInvalid}
          placeholder={t('field.clipText')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      ) : (
        <input
          autoFocus
          aria-invalid={showInvalid}
          placeholder={t(item.type === 'folder' ? 'field.folderPath' : 'field.pasteUrl')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      )}
      {showInvalid ? (
        <small className="wbn-field-error">
          {t(item.type === 'folder' ? 'field.folderPathError' : 'field.urlError')}
        </small>
      ) : null}
      <span className="wbn-item-edit-actions">
        <button type="button" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button className="wbn-item-edit-save" type="submit" disabled={normalizedContent === null}>
          {t('common.save')}
        </button>
      </span>
    </motion.form>
  );
}

function getItemContent(item: BoxItem) {
  if (item.type === 'folder') return item.path;
  if (item.type === 'bookmark') return item.url;
  return item.text;
}

function normalizeContent(item: BoxItem, draft: string) {
  if (item.type === 'folder') return parseFolderPathInput(draft);
  if (item.type === 'bookmark') return isUrlText(draft) ? draft.trim() : null;
  return draft.trim() || null;
}

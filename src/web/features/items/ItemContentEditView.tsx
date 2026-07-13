import { useState } from 'react';
import { motion } from 'motion/react';
import { isUrlText } from '../../../core/domains/items/services/isUrlText';
import { parseLocalPathText } from '../../../core/domains/items/services/parseLocalPathText';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import type { BoxItem } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { Input } from '../../kit/input';
import { Textarea } from '../../kit/textarea';
import { Button } from '../../kit/button';

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
      className="cardo-item-edit-view"
      aria-label={t('item.editContent')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14 }}
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
        <Textarea
          autoFocus
          aria-invalid={showInvalid}
          placeholder={t('field.clipText')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      ) : (
        <Input
          autoFocus
          aria-invalid={showInvalid}
          placeholder={t(item.type === 'bookmark' ? 'field.pasteUrl' : 'field.localPath')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      )}
      {showInvalid ? (
        <small className="cardo-field-error">
          {t(item.type === 'bookmark' ? 'field.urlError' : 'field.localPathError')}
        </small>
      ) : null}
      <span className="cardo-item-edit-actions">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          className="cardo-item-edit-save"
          type="submit"
          size="sm"
          variant="primary"
          disabled={normalizedContent === null}
        >
          {t('common.save')}
        </Button>
      </span>
    </motion.form>
  );
}

function getItemContent(item: BoxItem) {
  if (item.type === 'folder' || item.type === 'file' || item.type === 'shortcut') return item.path;
  if (item.type === 'bookmark') return item.url;
  return item.text;
}

function normalizeContent(item: BoxItem, draft: string) {
  if (item.type === 'folder') {
    const parsedPath = parseLocalPathText(draft);
    return parsedPath?.type === 'folder' ? parsedPath.normalizedPath : null;
  }
  if (item.type === 'file' || item.type === 'shortcut') {
    const parsedPath = parseLocalPathText(draft);
    return parsedPath?.type === item.type ? parsedPath.normalizedPath : null;
  }
  if (item.type === 'bookmark') return isUrlText(draft) ? draft.trim() : null;
  return draft.trim() || null;
}

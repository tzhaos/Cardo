import { ClipboardPaste, File, Folder, Link as LinkIcon, Plus, Rocket, X } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import {
  ITEM_TYPE_LABEL_KEYS,
  ITEM_TYPE_PLURAL_KEYS,
} from '../../../../core/domains/i18n/model/messages';
import { cn } from '../../../lib/utils';
import type { ItemType } from '../../../../core/domains/items/model/item';
import ItemDraftForm from './ItemDraftForm';

interface AddItemPanelProps {
  layout: 'grid' | 'list';
  addingType: ItemType | null;
  newItemTitle: string;
  newItemContent: string;
  onStartAdd: (type: ItemType) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onOpen: () => void;
  showAddMenu: boolean;
}

export default function AddItemPanel({
  layout,
  addingType,
  newItemTitle,
  newItemContent,
  onStartAdd,
  onTitleChange,
  onContentChange,
  onConfirm,
  onCancel,
  onOpen,
  showAddMenu,
}: AddItemPanelProps) {
  const { t } = useI18n();
  const contentPlaceholder =
    addingType === 'url'
      ? t('addItem.urlPlaceholder')
      : addingType === 'file' || addingType === 'folder' || addingType === 'shortcut'
        ? t('addItem.pathPlaceholder')
        : t('addItem.contentPlaceholder');
  const contentAsTextarea = addingType === 'note';
  const handleEditorKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }

    if (
      event.key === 'Enter' &&
      (event.currentTarget.tagName === 'INPUT' || event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      onConfirm();
    }
  };

  if (!showAddMenu) {
    return (
      <button
        onClick={onOpen}
        title={t('addItem.button')}
        aria-label={t('addItem.button')}
        className={cn(
          'kb-add-trigger mt-2 flex items-center justify-center gap-2 rounded-full border p-2 text-sm transition-colors',
          layout === 'grid' ? 'aspect-square flex-col' : 'w-full shrink-0 py-1.5',
        )}
      >
        <span className="kb-add-trigger-icon flex h-7 w-7 items-center justify-center rounded-full">
          <Plus size={15} />
        </span>
        {layout === 'list' ? <span>{t('addItem.button')}</span> : null}
      </button>
    );
  }

  if (addingType) {
    return (
      <ItemDraftForm
        className={cn('mt-2', layout === 'grid' ? 'col-span-3' : 'w-full shrink-0')}
        headerLabel={t('addItem.addType', { type: t(ITEM_TYPE_LABEL_KEYS[addingType]) })}
        titleAutoFocus
        titleValue={newItemTitle}
        titlePlaceholder={t('addItem.titleOptional')}
        contentValue={newItemContent}
        contentPlaceholder={contentPlaceholder}
        contentAsTextarea={contentAsTextarea}
        submitLabel={t('common.add')}
        cancelLabel={t('common.cancel')}
        saveDisabled={!newItemContent.trim()}
        onTitleChange={onTitleChange}
        onContentChange={onContentChange}
        onEditorKeyDown={handleEditorKeyDown}
        onSave={onConfirm}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div
      className={cn(
        'kb-add-panel mt-2 flex flex-col gap-2 rounded-2xl border p-2',
        layout === 'grid' ? 'col-span-3' : 'w-full shrink-0',
      )}
    >
      <div className="kb-subtle-text flex items-center justify-between px-1 text-xs">
        <span>{t('addItem.chooseType')}</span>
        <button onClick={onCancel} className="kb-secondary-button transition-colors">
          <X size={12} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onStartAdd('file')}
          className="kb-secondary-button flex items-center gap-2 rounded-full border p-2 text-xs transition-colors"
        >
          <File size={12} className="text-[var(--role-note-fg)]" />
          {t(ITEM_TYPE_PLURAL_KEYS.file)}
        </button>
        <button
          onClick={() => onStartAdd('folder')}
          className="kb-secondary-button flex items-center gap-2 rounded-full border p-2 text-xs transition-colors"
        >
          <Folder size={12} className="text-[var(--role-folder-fg)]" />
          {t(ITEM_TYPE_PLURAL_KEYS.folder)}
        </button>
        <button
          onClick={() => onStartAdd('url')}
          className="kb-secondary-button flex items-center gap-2 rounded-full border p-2 text-xs transition-colors"
        >
          <LinkIcon size={12} className="text-[var(--role-link-fg)]" />
          {t(ITEM_TYPE_PLURAL_KEYS.url)}
        </button>
        <button
          onClick={() => onStartAdd('shortcut')}
          className="kb-secondary-button flex items-center gap-2 rounded-full border p-2 text-xs transition-colors"
        >
          <Rocket size={12} className="text-[var(--role-generic-fg)]" />
          {t(ITEM_TYPE_PLURAL_KEYS.shortcut)}
        </button>
        <button
          onClick={() => onStartAdd('note')}
          className="kb-secondary-button flex items-center gap-2 rounded-full border p-2 text-xs transition-colors"
        >
          <ClipboardPaste size={12} className="text-[var(--role-generic-fg)]" />
          {t(ITEM_TYPE_PLURAL_KEYS.note)}
        </button>
      </div>
    </div>
  );
}

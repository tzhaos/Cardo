import { ClipboardPaste, File, Folder, Link as LinkIcon, Plus, X } from 'lucide-react';
import { useI18n } from '../../../domains/i18n/hooks/useI18n';
import { ITEM_TYPE_LABEL_KEYS, ITEM_TYPE_PLURAL_KEYS } from '../../../domains/i18n/model/messages';
import { cn } from '../../../lib/utils';
import type { ItemType } from '../../../types/item';

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

  if (!showAddMenu) {
    return (
      <button
        onClick={onOpen}
        className={cn(
          'kb-add-trigger flex items-center justify-center gap-2 rounded-lg border border-dashed transition-all',
          layout === 'grid' ? 'aspect-square flex-col' : 'mt-2 h-10 w-full shrink-0',
        )}
      >
        <Plus size={16} />
        <span className="text-xs font-medium">{t('addItem.button')}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'kb-add-panel flex flex-col gap-1 rounded-lg border border-dashed p-2',
        layout === 'grid' ? 'col-span-3' : 'mt-2 w-full shrink-0',
      )}
    >
      {addingType ? (
        <div className="flex flex-col gap-2">
          <div className="kb-subtle-text flex items-center justify-between px-1 text-xs">
            <span>{t('addItem.addType', { type: t(ITEM_TYPE_LABEL_KEYS[addingType]) })}</span>
            <button onClick={onCancel} className="kb-secondary-button transition-colors">
              <X size={12} />
            </button>
          </div>

          <input
            autoFocus
            value={newItemTitle}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={t('addItem.titleOptional')}
            className="kb-add-input w-full rounded px-2 py-1.5 text-xs outline-none"
          />

          <input
            value={newItemContent}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder={
              addingType === 'url'
                ? t('addItem.urlPlaceholder')
                : addingType === 'file' || addingType === 'folder'
                  ? t('addItem.pathPlaceholder')
                  : t('addItem.contentPlaceholder')
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onConfirm();
              }

              if (event.key === 'Escape') {
                onCancel();
              }
            }}
            className="kb-add-input w-full rounded px-2 py-1.5 text-xs outline-none"
          />

          <div className="mt-1 flex justify-end gap-1">
            <button
              onClick={onCancel}
              className="kb-secondary-button rounded px-2 py-1 text-xs transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={!newItemContent.trim()}
              className="kb-primary-button rounded px-2 py-1 text-xs transition-colors disabled:opacity-50"
            >
              {t('common.add')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="kb-subtle-text flex items-center justify-between px-1 text-xs">
            <span>{t('addItem.chooseType')}</span>
            <button onClick={onCancel} className="kb-secondary-button transition-colors">
              <X size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => onStartAdd('file')}
              className="kb-secondary-button flex items-center gap-2 rounded p-1.5 text-xs transition-colors"
            >
              <File size={12} className="text-blue-400" />
              {t(ITEM_TYPE_PLURAL_KEYS.file)}
            </button>
            <button
              onClick={() => onStartAdd('folder')}
              className="kb-secondary-button flex items-center gap-2 rounded p-1.5 text-xs transition-colors"
            >
              <Folder size={12} className="text-amber-400" />
              {t(ITEM_TYPE_PLURAL_KEYS.folder)}
            </button>
            <button
              onClick={() => onStartAdd('url')}
              className="kb-secondary-button flex items-center gap-2 rounded p-1.5 text-xs transition-colors"
            >
              <LinkIcon size={12} className="text-emerald-400" />
              {t(ITEM_TYPE_PLURAL_KEYS.url)}
            </button>
            <button
              onClick={() => onStartAdd('note')}
              className="kb-secondary-button flex items-center gap-2 rounded p-1.5 text-xs transition-colors"
            >
              <ClipboardPaste size={12} className="text-purple-400" />
              {t(ITEM_TYPE_PLURAL_KEYS.note)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

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
          'flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 text-white/40 transition-all hover:border-white/40 hover:bg-white/5 hover:text-white/80',
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
        'flex flex-col gap-1 rounded-lg border border-dashed border-white/20 bg-white/5 p-2',
        layout === 'grid' ? 'col-span-3' : 'mt-2 w-full shrink-0',
      )}
    >
      {addingType ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 text-xs text-white/50">
            <span>{t('addItem.addType', { type: t(ITEM_TYPE_LABEL_KEYS[addingType]) })}</span>
            <button onClick={onCancel} className="hover:text-white">
              <X size={12} />
            </button>
          </div>

          <input
            autoFocus
            value={newItemTitle}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={t('addItem.titleOptional')}
            className="w-full rounded bg-black/40 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/30 focus:ring-1 focus:ring-white/40"
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
            className="w-full rounded bg-black/40 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/30 focus:ring-1 focus:ring-white/40"
          />

          <div className="mt-1 flex justify-end gap-1">
            <button
              onClick={onCancel}
              className="rounded px-2 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={!newItemContent.trim()}
              className="rounded bg-white/10 px-2 py-1 text-xs text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              {t('common.add')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1 text-xs text-white/50">
            <span>{t('addItem.chooseType')}</span>
            <button onClick={onCancel} className="hover:text-white">
              <X size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => onStartAdd('file')}
              className="flex items-center gap-2 rounded p-1.5 text-xs text-white/80 transition-colors hover:bg-white/10"
            >
              <File size={12} className="text-blue-400" />
              {t(ITEM_TYPE_PLURAL_KEYS.file)}
            </button>
            <button
              onClick={() => onStartAdd('folder')}
              className="flex items-center gap-2 rounded p-1.5 text-xs text-white/80 transition-colors hover:bg-white/10"
            >
              <Folder size={12} className="text-amber-400" />
              {t(ITEM_TYPE_PLURAL_KEYS.folder)}
            </button>
            <button
              onClick={() => onStartAdd('url')}
              className="flex items-center gap-2 rounded p-1.5 text-xs text-white/80 transition-colors hover:bg-white/10"
            >
              <LinkIcon size={12} className="text-emerald-400" />
              {t(ITEM_TYPE_PLURAL_KEYS.url)}
            </button>
            <button
              onClick={() => onStartAdd('note')}
              className="flex items-center gap-2 rounded p-1.5 text-xs text-white/80 transition-colors hover:bg-white/10"
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

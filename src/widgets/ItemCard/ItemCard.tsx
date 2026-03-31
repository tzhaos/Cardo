import { Check, Pencil, Pin, PinOff, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../domains/i18n/hooks/useI18n';
import { deriveItemTitle } from '../../domains/items/services/deriveItemTitle';
import { useUIStore } from '../../domains/ui/store/useUIStore';
import { useItemActions } from '../../hooks/useItemActions';
import { cn } from '../../lib/utils';
import type { BoxItemData } from '../../types/item';

interface ItemCardProps {
  item: BoxItemData;
  layout: 'grid' | 'list';
  icon: React.ReactNode;
  onUpdate: (updates: Partial<BoxItemData>) => void;
  onDelete: () => void;
}

export default function ItemCard({ item, layout, icon, onUpdate, onDelete }: ItemCardProps) {
  const { t } = useI18n();
  const editorId = `item:${item.id}`;
  const editingSessionId = useUIStore((state) => state.editingSessionId);
  const setEditingSessionId = useUIStore((state) => state.setEditingSessionId);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editContent, setEditContent] = useState(item.content);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { openItem } = useItemActions();

  const isEditing = editingSessionId === editorId;
  const isInteractionLocked = Boolean(editingSessionId && editingSessionId !== editorId);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    setEditTitle(item.title);
    setEditContent(item.content);
  }, [isEditing, item.content, item.title]);

  useEffect(() => {
    if (!isEditing || !titleInputRef.current) {
      return;
    }

    titleInputRef.current.focus();
    titleInputRef.current.select();
  }, [isEditing]);

  useEffect(
    () => () => {
      const state = useUIStore.getState();

      if (state.editingSessionId === editorId) {
        state.setEditingSessionId(null);
      }
    },
    [editorId],
  );

  const stopInteraction = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const openEditor = (event: React.SyntheticEvent) => {
    event.stopPropagation();

    if (isInteractionLocked) {
      return;
    }

    setEditTitle(item.title);
    setEditContent(item.content);
    setEditingSessionId(editorId);
  };

  const closeEditor = () => {
    if (useUIStore.getState().editingSessionId === editorId) {
      setEditingSessionId(null);
    }
  };

  const handleCancel = (event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    setEditTitle(item.title);
    setEditContent(item.content);
    closeEditor();
  };

  const handleSave = (event?: React.SyntheticEvent) => {
    event?.stopPropagation();

    const nextContent = editContent.trim();

    if (!nextContent) {
      return;
    }

    onUpdate({
      title: editTitle.trim() || deriveItemTitle(item.type, nextContent),
      content: nextContent,
    });
    closeEditor();
  };

  const handleEditorKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
      return;
    }

    if (
      event.key === 'Enter' &&
      (event.currentTarget.tagName === 'INPUT' || event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      handleSave();
    }
  };

  const contentLabel =
    item.type === 'note' ? t('item.content') : item.type === 'url' ? t('item.address') : t('item.path');
  const usesSingleLineContentEditor = item.type !== 'note';
  const textInputClassName =
    'kb-item-input w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors';

  if (isEditing) {
    return (
      <div
        className={cn(
          'kb-item-editor relative overflow-hidden rounded-2xl border backdrop-blur-xl',
          layout === 'grid' ? 'min-h-[210px]' : '',
        )}
        onClick={stopInteraction}
        onPointerDown={stopInteraction}
      >
        <div className="flex items-start gap-3 p-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <label className="block">
              <input
                ref={titleInputRef}
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                onKeyDown={handleEditorKeyDown}
                onPointerDown={stopInteraction}
                onPaste={stopInteraction}
                onDragStart={stopInteraction}
                onDrop={stopInteraction}
                className={cn(textInputClassName, 'h-11 text-lg font-semibold')}
                placeholder={t('item.title')}
                aria-label={t('item.title')}
              />
            </label>

            <label className="block flex-1">
              {usesSingleLineContentEditor ? (
                <input
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  onPointerDown={stopInteraction}
                  onPaste={stopInteraction}
                  onDragStart={stopInteraction}
                  onDrop={stopInteraction}
                  className={cn(textInputClassName, 'h-9 font-mono text-[12px]')}
                  placeholder={contentLabel}
                  aria-label={contentLabel}
                />
              ) : (
                <textarea
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  onPointerDown={stopInteraction}
                  onPaste={stopInteraction}
                  onDragStart={stopInteraction}
                  onDrop={stopInteraction}
                  className={cn(textInputClassName, 'min-h-[96px] resize-none')}
                  placeholder={contentLabel}
                  aria-label={contentLabel}
                />
              )}
            </label>
          </div>

          <div className="flex shrink-0 items-start gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!editContent.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-[0_12px_24px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-35"
              title={t('item.saveChanges')}
              aria-label={t('item.saveChanges')}
            >
              <Check size={18} />
            </button>
            <button
              onClick={handleCancel}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500 text-white shadow-[0_12px_24px_rgba(239,68,68,0.2)] transition-colors hover:bg-red-400"
              title={t('item.cancelEditing')}
              aria-label={t('item.cancelEditing')}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (editingSessionId) {
          return;
        }

        void openItem(item);
      }}
      className={cn(
        'group rounded-xl border border-transparent transition-all duration-200',
        layout === 'grid'
          ? 'kb-item-card-grid relative flex cursor-pointer flex-col items-center gap-2 p-3'
          : 'kb-item-card-list flex shrink-0 cursor-pointer items-center justify-between p-2.5',
        isInteractionLocked ? 'cursor-default opacity-55' : '',
      )}
    >
      <div
        className={cn(
          layout === 'grid'
            ? 'flex w-full flex-col items-center gap-2'
            : 'flex flex-1 items-center gap-3 overflow-hidden',
        )}
      >
        <div
          className={cn(
            'kb-item-icon-chip relative rounded-xl shadow-inner transition-transform duration-300',
            layout === 'grid' ? 'p-2 group-hover:scale-110' : 'shrink-0 rounded-lg p-1.5 group-hover:scale-105',
          )}
        >
          {icon}
          {item.isPinned && (
            <div
              className={cn(
                'absolute -right-1 -top-1 rounded-full border border-black/50 bg-rose-500',
                layout === 'grid'
                  ? 'h-2.5 w-2.5 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                  : 'h-2 w-2 shadow-[0_0_6px_rgba(244,63,94,0.6)]',
              )}
            />
          )}
        </div>

        {layout === 'grid' ? (
          <span className="kb-item-title w-full break-words px-1 text-center text-xs font-medium leading-tight line-clamp-2">
            {item.title}
          </span>
        ) : (
          <div className="flex flex-col justify-center overflow-hidden">
            <span className="kb-item-title truncate text-sm font-medium">{item.title}</span>
            <span className="kb-item-content mt-0.5 truncate text-[11px]">{item.content}</span>
          </div>
        )}
      </div>

      <div
        className={cn(
          'transition-opacity duration-200',
          layout === 'grid'
            ? 'absolute right-1 top-1 z-10 flex flex-col gap-1'
            : 'ml-3 flex shrink-0 items-center gap-1',
          isInteractionLocked ? 'pointer-events-none opacity-0' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <button
          onClick={(event) => {
            event.stopPropagation();
            onUpdate({ isPinned: !item.isPinned });
          }}
          className={cn(
            'transition-colors',
            layout === 'grid'
              ? 'kb-item-grid-control rounded-md border p-1.5 shadow-sm backdrop-blur-sm'
              : 'kb-item-list-control rounded-md p-1.5',
          )}
          title={item.isPinned ? t('item.unpin') : layout === 'grid' ? t('item.pin') : t('item.pinToTop')}
        >
          {item.isPinned ? (
            <PinOff size={layout === 'grid' ? 12 : 14} />
          ) : (
            <Pin size={layout === 'grid' ? 12 : 14} />
          )}
        </button>
        <button
          onClick={openEditor}
          className={cn(
            'transition-colors',
            layout === 'grid'
              ? 'kb-item-grid-control rounded-md border p-1.5 shadow-sm backdrop-blur-sm hover:bg-blue-500/80 hover:text-white'
              : 'kb-item-list-control rounded-md p-1.5 hover:bg-blue-500/20 hover:text-blue-400',
          )}
          title={t('item.edit')}
        >
          <Pencil size={layout === 'grid' ? 12 : 14} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className={cn(
            'transition-colors',
            layout === 'grid'
              ? 'kb-item-grid-control rounded-md border p-1.5 shadow-sm backdrop-blur-sm hover:bg-red-500/80 hover:text-white'
              : 'kb-item-list-control rounded-md p-1.5 hover:bg-red-500/20 hover:text-red-400',
          )}
          title={t('item.delete')}
        >
          <X size={layout === 'grid' ? 12 : 14} />
        </button>
      </div>
    </div>
  );
}

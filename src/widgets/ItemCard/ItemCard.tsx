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
  const editorLabel =
    item.type === 'folder'
      ? t('item.folderEditor')
      : item.type === 'file'
        ? t('item.fileEditor')
        : item.type === 'url'
          ? t('item.linkEditor')
          : t('item.noteEditor');

  if (isEditing) {
    return (
      <div
        className={cn(
          'relative flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/80 shadow-[0_20px_45px_rgba(0,0,0,0.4)] backdrop-blur-xl',
          layout === 'grid' ? 'min-h-[230px]' : 'min-h-[210px]',
        )}
        onClick={stopInteraction}
        onPointerDown={stopInteraction}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80">{icon}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/90">{item.title}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                {editorLabel}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="rounded-lg border border-white/10 p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title={t('item.cancelEditing')}
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">
              {t('item.title')}
            </span>
            <input
              ref={titleInputRef}
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              onPointerDown={stopInteraction}
              onPaste={stopInteraction}
              onDragStart={stopInteraction}
              onDrop={stopInteraction}
              className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-medium text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/20 focus:ring-2 focus:ring-white/10"
              placeholder={t('item.title')}
            />
          </label>

          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">
              {contentLabel}
            </span>
            <textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              onPointerDown={stopInteraction}
              onPaste={stopInteraction}
              onDragStart={stopInteraction}
              onDrop={stopInteraction}
              className={cn(
                'min-h-[92px] flex-1 resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white/80 outline-none transition-colors placeholder:text-white/25 focus:border-white/20 focus:ring-2 focus:ring-white/10',
                item.type === 'file' || item.type === 'folder' || item.type === 'url'
                  ? 'font-mono text-[12px]'
                  : '',
              )}
              placeholder={contentLabel}
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-white/35">{t('item.saveHint')}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!editContent.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/12 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={14} />
                {t('item.saveChanges')}
              </button>
            </div>
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
          ? 'relative flex cursor-pointer flex-col items-center gap-2 p-3 hover:border-white/10 hover:bg-white/10 hover:shadow-md'
          : 'flex shrink-0 cursor-pointer items-center justify-between p-2.5 hover:border-white/5 hover:bg-white/10',
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
            'relative rounded-xl bg-black/20 shadow-inner transition-transform duration-300',
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
          <span className="w-full break-words px-1 text-center text-xs font-medium leading-tight text-white/90 line-clamp-2">
            {item.title}
          </span>
        ) : (
          <div className="flex flex-col justify-center overflow-hidden">
            <span className="truncate text-sm font-medium text-white/90">{item.title}</span>
            <span className="mt-0.5 truncate text-[11px] text-white/50">{item.content}</span>
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
              ? 'rounded-md border border-white/10 bg-zinc-800/90 p-1.5 text-white/80 shadow-sm backdrop-blur-sm hover:bg-zinc-700 hover:text-white'
              : 'rounded-md p-1.5 text-white/50 hover:bg-white/15 hover:text-white',
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
              ? 'rounded-md border border-white/10 bg-zinc-800/90 p-1.5 text-white/80 shadow-sm backdrop-blur-sm hover:bg-blue-500/80 hover:text-white'
              : 'rounded-md p-1.5 text-white/50 hover:bg-blue-500/20 hover:text-blue-400',
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
              ? 'rounded-md border border-white/10 bg-zinc-800/90 p-1.5 text-white/80 shadow-sm backdrop-blur-sm hover:bg-red-500/80 hover:text-white'
              : 'rounded-md p-1.5 text-white/50 hover:bg-red-500/20 hover:text-red-400',
          )}
          title={t('item.delete')}
        >
          <X size={layout === 'grid' ? 12 : 14} />
        </button>
      </div>
    </div>
  );
}

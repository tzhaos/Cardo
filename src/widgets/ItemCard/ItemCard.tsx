import type { KeyboardEvent, ReactNode, RefObject, SyntheticEvent } from 'react';
import { cn } from '../../lib/utils';
import type { WorkspaceItem } from '../../domains/items/model/item';

export interface ItemCardProps {
  item: WorkspaceItem;
  layout: 'grid' | 'list';
  icon: ReactNode;
  isEditing: boolean;
  isInteractionLocked: boolean;
  editTitle: string;
  editContent: string;
  editorRootRef?: RefObject<HTMLDivElement | null>;
  titleInputRef: RefObject<HTMLInputElement | null>;
  contentLabel: string;
  titlePlaceholder: string;
  saveLabel: string;
  cancelLabel: string;
  pinLabel: string;
  pinToTopLabel: string;
  unpinLabel: string;
  editLabel: string;
  deleteLabel: string;
  saveIcon: ReactNode;
  cancelIcon: ReactNode;
  editIcon: ReactNode;
  pinIcon: ReactNode;
  unpinIcon: ReactNode;
  deleteIcon: ReactNode;
  onCardClick: () => void;
  onStartEdit: (event: SyntheticEvent) => void;
  onEditTitleChange: (value: string) => void;
  onEditContentChange: (value: string) => void;
  onEditorKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSave: (event?: SyntheticEvent) => void;
  onCancel: (event?: SyntheticEvent) => void;
  onTogglePinned: (event: SyntheticEvent) => void;
  onDeleteClick: (event: SyntheticEvent) => void;
}

function getIconChipClassName(item: WorkspaceItem, layout: 'grid' | 'list') {
  if (item.type === 'folder') {
    return cn(
      'bg-folder-bg border border-folder-border',
      layout === 'grid' ? 'rounded-md p-2' : 'rounded p-1.5',
    );
  }

  return cn('bg-file-bg', layout === 'grid' ? 'rounded-md p-2' : 'rounded p-1.5');
}

export default function ItemCard({
  item,
  layout,
  icon,
  isEditing,
  isInteractionLocked,
  editTitle,
  editContent,
  editorRootRef,
  titleInputRef,
  contentLabel,
  titlePlaceholder,
  saveLabel,
  cancelLabel,
  pinLabel,
  pinToTopLabel,
  unpinLabel,
  editLabel,
  deleteLabel,
  saveIcon,
  cancelIcon,
  editIcon,
  pinIcon,
  unpinIcon,
  deleteIcon,
  onCardClick,
  onStartEdit,
  onEditTitleChange,
  onEditContentChange,
  onEditorKeyDown,
  onSave,
  onCancel,
  onTogglePinned,
  onDeleteClick,
}: ItemCardProps) {
  const usesSingleLineContentEditor = item.type !== 'note';
  const textInputClassName =
    'kb-item-input w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors';
  const pinnedButtonClassName =
    layout === 'grid'
      ? cn(
          'kb-item-grid-control rounded-md border p-1.5 shadow-sm backdrop-blur-sm',
          item.isPinned ? 'bg-win-hover text-win-accent border-win-border-strong' : '',
        )
      : cn(
          'kb-item-list-control rounded-md p-1.5 text-win-text-secondary hover:bg-win-hover hover:text-win-text',
          item.isPinned ? 'bg-win-hover text-win-accent' : '',
        );

  const stopInteraction = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  if (isEditing) {
    return (
      <div
        ref={editorRootRef}
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
                onChange={(event) => onEditTitleChange(event.target.value)}
                onKeyDown={onEditorKeyDown}
                onPointerDown={stopInteraction}
                onPaste={stopInteraction}
                onDragStart={stopInteraction}
                onDrop={stopInteraction}
                className={cn(textInputClassName, 'h-11 text-lg font-semibold')}
                placeholder={titlePlaceholder}
                aria-label={titlePlaceholder}
              />
            </label>

            <label className="block flex-1">
              {usesSingleLineContentEditor ? (
                <input
                  value={editContent}
                  onChange={(event) => onEditContentChange(event.target.value)}
                  onKeyDown={onEditorKeyDown}
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
                  onChange={(event) => onEditContentChange(event.target.value)}
                  onKeyDown={onEditorKeyDown}
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
              onClick={onSave}
              disabled={!editContent.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-[0_12px_24px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-35"
              title={saveLabel}
              aria-label={saveLabel}
            >
              {saveIcon}
            </button>
            <button
              onClick={onCancel}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500 text-white shadow-[0_12px_24px_rgba(239,68,68,0.2)] transition-colors hover:bg-red-400"
              title={cancelLabel}
              aria-label={cancelLabel}
            >
              {cancelIcon}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onCardClick}
      className={cn(
        'group transition-all duration-200',
        layout === 'grid'
          ? 'kb-item-card-grid relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-transparent p-3'
          : 'flex shrink-0 cursor-pointer items-center justify-between gap-3 rounded-md p-2 hover:bg-win-hover active:bg-win-active',
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
            'relative transition-transform duration-300',
            getIconChipClassName(item, layout),
            layout === 'grid'
              ? 'group-hover:scale-110'
              : 'shrink-0 group-hover:scale-105',
          )}
        >
          {icon}
          {item.isPinned && (
            <div
              className={cn(
                'absolute -right-1 -top-1 rounded-full border bg-win-accent',
                layout === 'grid'
                  ? 'h-2.5 w-2.5 border-win-card'
                  : 'h-2 w-2 border-win-card',
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
            <span className="truncate text-sm text-win-text">{item.title}</span>
            <span className="mt-0.5 truncate text-xs text-win-text-secondary">{item.content}</span>
          </div>
        )}
      </div>

      <div
        className={cn(
          'transition-opacity duration-200',
          layout === 'grid'
            ? 'absolute right-1 top-1 z-10 flex flex-col gap-1'
            : 'ml-2 flex shrink-0 items-center gap-1',
          isInteractionLocked
            ? 'pointer-events-none opacity-0'
            : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <button
          onClick={onTogglePinned}
          className={cn('transition-colors', pinnedButtonClassName)}
          title={item.isPinned ? unpinLabel : layout === 'grid' ? pinLabel : pinToTopLabel}
        >
          {item.isPinned ? unpinIcon : pinIcon}
        </button>
        <button
          onClick={onStartEdit}
          className={cn(
            'transition-colors',
            layout === 'grid'
              ? 'kb-item-grid-control rounded-md border p-1.5 shadow-sm backdrop-blur-sm hover:bg-win-accent hover:text-white'
              : 'kb-item-list-control rounded-md p-1.5 text-win-text-secondary hover:bg-win-hover hover:text-win-text',
          )}
          title={editLabel}
        >
          {editIcon}
        </button>
        <button
          onClick={onDeleteClick}
          className={cn(
            'transition-colors',
            layout === 'grid'
              ? 'kb-item-grid-control rounded-md border p-1.5 shadow-sm backdrop-blur-sm hover:bg-red-500/80 hover:text-white'
              : 'kb-item-list-control rounded-md p-1.5 text-win-text-secondary hover:bg-win-hover hover:text-win-text',
          )}
          title={deleteLabel}
        >
          {deleteIcon}
        </button>
      </div>
    </div>
  );
}

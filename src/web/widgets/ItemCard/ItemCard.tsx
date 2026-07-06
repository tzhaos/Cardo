import type { KeyboardEvent, ReactNode, RefObject, SyntheticEvent } from 'react';
import { cn } from '../../lib/utils';
import {
  getWorkspaceItemContent,
  type PlacedWorkspaceItem,
  type WorkspaceItem,
} from '../../../core/domains/items/model/item';
import ItemDraftForm from '../../features/item-management/ui/ItemDraftForm';

export interface ItemCardProps {
  item: PlacedWorkspaceItem;
  layout: 'grid' | 'list';
  icon: ReactNode;
  isFocused: boolean;
  isEditing: boolean;
  isInteractionLocked: boolean;
  editTitle: string;
  editContent: string;
  editorRootRef?: RefObject<HTMLDivElement | null>;
  titleInputRef: RefObject<HTMLInputElement | null>;
  editorLabel: string;
  contentPlaceholder: string;
  titlePlaceholder: string;
  saveLabel: string;
  cancelLabel: string;
  pinLabel: string;
  pinToTopLabel: string;
  unpinLabel: string;
  editLabel: string;
  deleteLabel: string;
  addBookmarkLabel: string;
  removeBookmarkLabel: string;
  editIcon: ReactNode;
  pinIcon: ReactNode;
  unpinIcon: ReactNode;
  bookmarkIcon: ReactNode;
  deleteIcon: ReactNode;
  isBookmarked: boolean;
  onCardClick: () => void;
  onStartEdit: (event: SyntheticEvent) => void;
  onEditTitleChange: (value: string) => void;
  onEditContentChange: (value: string) => void;
  onEditorKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSave: (event?: SyntheticEvent) => void;
  onCancel: (event?: SyntheticEvent) => void;
  onTogglePinned: (event: SyntheticEvent) => void;
  onToggleBookmark: (event: SyntheticEvent) => void;
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
  isFocused,
  isEditing,
  isInteractionLocked,
  editTitle,
  editContent,
  editorRootRef,
  titleInputRef,
  editorLabel,
  contentPlaceholder,
  titlePlaceholder,
  saveLabel,
  cancelLabel,
  pinLabel,
  pinToTopLabel,
  unpinLabel,
  editLabel,
  deleteLabel,
  addBookmarkLabel,
  removeBookmarkLabel,
  editIcon,
  pinIcon,
  unpinIcon,
  bookmarkIcon,
  deleteIcon,
  isBookmarked,
  onCardClick,
  onStartEdit,
  onEditTitleChange,
  onEditContentChange,
  onEditorKeyDown,
  onSave,
  onCancel,
  onTogglePinned,
  onToggleBookmark,
  onDeleteClick,
}: ItemCardProps) {
  const usesSingleLineContentEditor = item.type !== 'note';
  const itemContent = getWorkspaceItemContent(item);
  const pinnedButtonClassName =
    layout === 'grid'
      ? cn(
          'kb-item-grid-control rounded-md border p-1.5 shadow-sm',
          item.isPinned ? 'bg-win-hover text-win-accent border-win-border-strong' : '',
        )
      : cn(
          'kb-item-list-control rounded-md p-1.5 text-win-text-secondary hover:bg-win-hover hover:text-win-text',
          item.isPinned ? 'bg-win-hover text-win-accent' : '',
        );

  if (isEditing) {
    return (
      <ItemDraftForm
        rootRef={editorRootRef}
        className={cn(layout === 'grid' ? 'min-h-[160px]' : 'w-full shrink-0')}
        headerLabel={editorLabel}
        titleInputRef={titleInputRef}
        titleValue={editTitle}
        titlePlaceholder={titlePlaceholder}
        contentValue={editContent}
        contentPlaceholder={contentPlaceholder}
        contentAsTextarea={!usesSingleLineContentEditor}
        submitLabel={saveLabel}
        cancelLabel={cancelLabel}
        saveDisabled={!editContent.trim()}
        onTitleChange={onEditTitleChange}
        onContentChange={onEditContentChange}
        onEditorKeyDown={onEditorKeyDown}
        onSave={onSave}
        onCancel={onCancel}
      />
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
        isFocused ? 'kb-item-focused' : '',
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
            layout === 'grid' ? 'group-hover:scale-110' : 'shrink-0 group-hover:scale-105',
          )}
        >
          {icon}
          {item.isPinned && (
            <div
              className={cn(
                'absolute -right-1 -top-1 rounded-full border bg-win-accent',
                layout === 'grid' ? 'h-2.5 w-2.5 border-win-card' : 'h-2 w-2 border-win-card',
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
            <span className="mt-0.5 truncate text-xs text-win-text-secondary">{itemContent}</span>
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
        {item.type === 'url' ? (
          <button
            onClick={onToggleBookmark}
            className={cn(
              'transition-colors',
              layout === 'grid'
                ? 'kb-item-grid-control rounded-md border p-1.5 shadow-sm hover:bg-win-accent hover:text-white'
                : 'kb-item-list-control rounded-md p-1.5 text-win-text-secondary hover:bg-win-hover hover:text-win-text',
              isBookmarked ? 'text-win-accent' : '',
            )}
            title={isBookmarked ? removeBookmarkLabel : addBookmarkLabel}
          >
            <span className={cn(isBookmarked ? '[&>svg]:fill-current' : '')}>{bookmarkIcon}</span>
          </button>
        ) : null}
        <button
          onClick={onStartEdit}
          className={cn(
            'transition-colors',
            layout === 'grid'
              ? 'kb-item-grid-control rounded-md border p-1.5 shadow-sm hover:bg-win-accent hover:text-white'
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
              ? 'kb-item-grid-control rounded-md border p-1.5 shadow-sm hover:bg-red-500 hover:text-white'
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

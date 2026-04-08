import { cn } from '../../lib/utils';
import type { WorkspaceItem } from '../../domains/items/model/item';

export interface ItemCardProps {
  item: WorkspaceItem;
  layout: 'grid' | 'list';
  icon: React.ReactNode;
  isEditing: boolean;
  isInteractionLocked: boolean;
  editTitle: string;
  editContent: string;
  editorRootRef?: React.RefObject<HTMLDivElement | null>;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  contentLabel: string;
  titlePlaceholder: string;
  saveLabel: string;
  cancelLabel: string;
  pinLabel: string;
  pinToTopLabel: string;
  unpinLabel: string;
  editLabel: string;
  deleteLabel: string;
  saveIcon: React.ReactNode;
  cancelIcon: React.ReactNode;
  editIcon: React.ReactNode;
  pinIcon: React.ReactNode;
  unpinIcon: React.ReactNode;
  deleteIcon: React.ReactNode;
  onCardClick: () => void;
  onStartEdit: (event: React.SyntheticEvent) => void;
  onEditTitleChange: (value: string) => void;
  onEditContentChange: (value: string) => void;
  onEditorKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSave: (event?: React.SyntheticEvent) => void;
  onCancel: (event?: React.SyntheticEvent) => void;
  onTogglePinned: (event: React.SyntheticEvent) => void;
  onDeleteClick: (event: React.SyntheticEvent) => void;
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

  const stopInteraction = (event: React.SyntheticEvent) => {
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
            layout === 'grid'
              ? 'p-2 group-hover:scale-110'
              : 'shrink-0 rounded-lg p-1.5 group-hover:scale-105',
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
          isInteractionLocked
            ? 'pointer-events-none opacity-0'
            : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <button
          onClick={onTogglePinned}
          className={cn(
            'transition-colors',
            layout === 'grid'
              ? 'kb-item-grid-control rounded-md border p-1.5 shadow-sm backdrop-blur-sm'
              : 'kb-item-list-control rounded-md p-1.5',
          )}
          title={item.isPinned ? unpinLabel : layout === 'grid' ? pinLabel : pinToTopLabel}
        >
          {item.isPinned ? unpinIcon : pinIcon}
        </button>
        <button
          onClick={onStartEdit}
          className={cn(
            'transition-colors',
            layout === 'grid'
              ? 'kb-item-grid-control rounded-md border p-1.5 shadow-sm backdrop-blur-sm hover:bg-blue-500/80 hover:text-white'
              : 'kb-item-list-control rounded-md p-1.5 hover:bg-blue-500/20 hover:text-blue-400',
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
              : 'kb-item-list-control rounded-md p-1.5 hover:bg-red-500/20 hover:text-red-400',
          )}
          title={deleteLabel}
        >
          {deleteIcon}
        </button>
      </div>
    </div>
  );
}

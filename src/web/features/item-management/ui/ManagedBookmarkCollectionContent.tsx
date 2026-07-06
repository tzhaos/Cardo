import { ExternalLink, Folder, Plus, Star } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import { cn } from '../../../lib/utils';
import { useManagedBookmarkCollectionContent } from '../hooks/useManagedBookmarkCollectionContent';

interface ManagedBookmarkCollectionContentProps {
  box: WorkspaceBox;
  mode: 'library' | 'frequent';
}

export default function ManagedBookmarkCollectionContent({
  box,
  mode,
}: ManagedBookmarkCollectionContentProps) {
  const controller = useManagedBookmarkCollectionContent(box, mode);

  return (
    <div
      className={cn(
        'kb-scroll-hidden flex-1 overflow-y-auto p-2 pt-0',
        box.layout === 'grid' ? 'grid grid-cols-2 content-start gap-2' : 'flex flex-col gap-1',
      )}
      onPointerDown={controller.handlePointerDown}
    >
      {controller.bookmarks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-win-border px-3 py-4 text-center text-sm text-win-text-secondary">
          {mode === 'frequent' ? controller.labels.noFrequent : controller.labels.empty}
        </div>
      ) : null}
      {controller.bookmarks.map((bookmark) => {
        const folder = bookmark.folderId ? controller.foldersById[bookmark.folderId] : null;
        const alreadyInBox = controller.isBookmarkInBox(bookmark);

        return (
          <div
            key={bookmark.id}
            role="button"
            tabIndex={0}
            onClick={() => controller.openBookmark(bookmark)}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                controller.openBookmark(bookmark);
              }
            }}
            className={cn(
              'group kb-item-card-list flex min-w-0 cursor-pointer gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-win-hover',
              box.layout === 'grid' ? 'min-h-[8rem] flex-col' : 'items-center',
            )}
          >
            <div className="kb-item-icon-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-file-bg text-[var(--role-link-fg)]">
              <ExternalLink size={17} />
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-win-text">{bookmark.title}</span>
              <span className="mt-0.5 block truncate text-xs text-win-text-secondary">
                {bookmark.url}
              </span>
              {folder ? (
                <span className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-win-bg-secondary px-2 py-0.5 text-xs text-win-text-secondary">
                  <Folder size={11} />
                  <span className="truncate">{folder.title}</span>
                </span>
              ) : null}
            </span>
            <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onKeyDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  controller.togglePinned(bookmark);
                }}
                title={bookmark.isPinned ? controller.labels.unpin : controller.labels.pin}
                className="kb-item-list-control rounded-full p-1.5 transition-colors hover:bg-win-hover"
              >
                <Star
                  size={14}
                  className="text-win-text-secondary"
                  fill={bookmark.isPinned ? 'currentColor' : 'none'}
                />
              </button>
              <button
                type="button"
                disabled={alreadyInBox}
                onKeyDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  controller.addBookmarkToBox(bookmark);
                }}
                title={alreadyInBox ? controller.labels.alreadyInBox : controller.labels.addToBox}
                className="kb-item-list-control rounded-full p-1.5 transition-colors hover:bg-win-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

import type { PointerEvent } from 'react';
import type { Bookmark } from '../../../../core/domains/bookmarks/model/bookmark';
import { getFrequentBookmarks } from '../../../../core/domains/bookmarks/services/frequentBookmarks';
import { normalizeBookmarkUrl } from '../../../../core/domains/bookmarks/services/normalizeBookmarkUrl';
import { createWorkspaceItem } from '../../../../core/domains/items/model/item';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import { getBoxItems } from '../../../../core/domains/workspace/model/workspaceSelectors';
import { useI18n } from '../../../app/hooks/useI18n';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import {
  useWorkspaceDispatch,
  useWorkspaceSnapshot,
} from '../../../app/stores/useWorkspaceSelectors';
import { createId } from '../../../app/use-cases/createId';
import { openBookmark } from '../../../app/use-cases/openBookmark';

function getSortedLibraryBookmarks(bookmarks: Bookmark[]) {
  return [...bookmarks].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    return left.title.localeCompare(right.title);
  });
}

export function useManagedBookmarkCollectionContent(
  box: WorkspaceBox,
  mode: 'library' | 'frequent',
) {
  const { t } = useI18n();
  const snapshot = useWorkspaceSnapshot();
  const dispatch = useWorkspaceDispatch();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const bookmarks =
    mode === 'frequent'
      ? getFrequentBookmarks(Object.values(snapshot.bookmarksById), 24)
      : getSortedLibraryBookmarks(Object.values(snapshot.bookmarksById));
  const boxItems = getBoxItems(snapshot, box.id);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setActiveBox(box.id);
    dispatch({ type: 'box.bringToFront', boxId: box.id });
  };

  const isBookmarkInBox = (bookmark: Bookmark) =>
    boxItems.some(
      (item) =>
        item.type === 'url' &&
        (item.bookmarkId === bookmark.id ||
          normalizeBookmarkUrl(item.url) === bookmark.normalizedUrl),
    );

  const addBookmarkToBox = (bookmark: Bookmark) => {
    if (isBookmarkInBox(bookmark)) {
      return;
    }

    const item = createWorkspaceItem(createId('item'), {
      type: 'url',
      title: bookmark.title,
      content: bookmark.url,
      bookmarkId: bookmark.id,
    });

    dispatch({
      type: 'item.add',
      boxId: box.id,
      item,
    });
  };

  const togglePinned = (bookmark: Bookmark) => {
    dispatch({
      type: 'bookmark.upsert',
      bookmark: {
        ...bookmark,
        isPinned: !bookmark.isPinned,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  return {
    bookmarks,
    foldersById: snapshot.bookmarkFoldersById,
    labels: {
      empty: t('bookmarks.empty'),
      noFrequent: t('bookmarks.noFrequent'),
      addToBox: t('bookmarks.addToBox'),
      alreadyInBox: t('bookmarks.alreadyInBox'),
      pin: t('bookmarks.pin'),
      unpin: t('bookmarks.unpin'),
    },
    handlePointerDown,
    isBookmarkInBox,
    addBookmarkToBox,
    togglePinned,
    openBookmark,
  };
}

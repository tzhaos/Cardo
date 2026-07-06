import type { Bookmark } from '../../../core/domains/bookmarks/model/bookmark';
import { tabsPort } from '../ports/defaultPorts';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

export function recordBookmarkOpen(bookmarkId: string, openedAt = new Date()) {
  useWorkspaceStore.getState().dispatch({
    type: 'bookmark.recordOpen',
    bookmarkId,
    openedAt: openedAt.toISOString(),
  });
}

export function openBookmark(bookmark: Bookmark, openedAt = new Date()) {
  tabsPort.openUrl(bookmark.url);
  recordBookmarkOpen(bookmark.id, openedAt);
}

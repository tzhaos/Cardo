import type { BrowserBookmarkTreeNode } from '../../../ports/BrowserBookmarksPort';
import type { Bookmark, BookmarkFolder } from '../model/bookmark';
import { createBookmark, createBookmarkFolder } from './createBookmark';
import { isBookmarkUrl } from './normalizeBookmarkUrl';
import type { BookmarkIdFactory, BrowserBookmarksImportResult } from './browserBookmarksHtml';

function isoFromBrowserBookmarkDate(value: number | undefined, fallback: Date) {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback.toISOString();
  }

  const timestamp = value < 10_000_000_000 ? value * 1000 : value;
  return new Date(timestamp).toISOString();
}

function hasChildren(node: BrowserBookmarkTreeNode) {
  return Array.isArray(node.children) && node.children.length > 0;
}

function walkBrowserBookmarkTree(
  nodes: BrowserBookmarkTreeNode[],
  parentFolderId: string | null,
  createId: BookmarkIdFactory,
  now: Date,
  result: {
    bookmarks: Bookmark[];
    folders: BookmarkFolder[];
    folderOrder: string[];
    invalidUrlCount: number;
  },
) {
  for (const node of nodes) {
    const title = node.title?.trim() ?? '';

    if (hasChildren(node)) {
      const folder =
        title.length > 0
          ? createBookmarkFolder(
              createId('bookmark-folder'),
              {
                title,
                parentId: parentFolderId,
                source: 'import',
                createdAt: isoFromBrowserBookmarkDate(node.dateAdded, now),
                updatedAt: now.toISOString(),
              },
              now,
            )
          : null;
      const nextParentFolderId = folder?.id ?? parentFolderId;

      if (folder) {
        result.folders.push(folder);
        result.folderOrder.push(folder.id);
      }

      walkBrowserBookmarkTree(node.children ?? [], nextParentFolderId, createId, now, result);
      continue;
    }

    if (!node.url) {
      continue;
    }

    const url = node.url.trim();

    if (!isBookmarkUrl(url)) {
      result.invalidUrlCount += 1;
      continue;
    }

    result.bookmarks.push(
      createBookmark(
        createId('bookmark'),
        {
          title: title || url,
          url,
          folderId: parentFolderId,
          source: 'import',
          createdAt: isoFromBrowserBookmarkDate(node.dateAdded, now),
          updatedAt: now.toISOString(),
        },
        now,
      ),
    );
  }
}

export function parseBrowserBookmarksTree(
  tree: BrowserBookmarkTreeNode[],
  createId: BookmarkIdFactory,
  now = new Date(),
): BrowserBookmarksImportResult {
  const result = {
    bookmarks: [] as Bookmark[],
    folders: [] as BookmarkFolder[],
    folderOrder: [] as string[],
    invalidUrlCount: 0,
  };

  walkBrowserBookmarkTree(tree, null, createId, now, result);

  return result;
}

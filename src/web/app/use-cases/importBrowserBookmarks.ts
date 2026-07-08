import { parseBrowserBookmarksHtml } from '../../../core/domains/bookmarks/services/browserBookmarksHtml';
import type { BrowserBookmarksImportResult } from '../../../core/domains/bookmarks/services/browserBookmarksHtml';
import { parseBrowserBookmarksTree } from '../../../core/domains/bookmarks/services/browserBookmarksTree';
import { browserBookmarksPort, fileImportPort } from '../ports/defaultPorts';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { createId } from './createId';

export interface BrowserBookmarksImportSummary {
  addedCount: number;
  duplicateCount: number;
  invalidUrlCount: number;
  folderCount: number;
}

function importParsedBrowserBookmarks(
  parsed: BrowserBookmarksImportResult,
): BrowserBookmarksImportSummary {
  const snapshot = useWorkspaceStore.getState().snapshot;
  const knownUrls = new Set(
    Object.values(snapshot.bookmarksById).map((bookmark) => bookmark.normalizedUrl),
  );
  let duplicateCount = 0;
  const bookmarks = parsed.bookmarks.filter((bookmark) => {
    if (knownUrls.has(bookmark.normalizedUrl)) {
      duplicateCount += 1;
      return false;
    }

    knownUrls.add(bookmark.normalizedUrl);
    return true;
  });

  useWorkspaceStore.getState().dispatch({
    type: 'bookmarks.import',
    bookmarks,
    folders: parsed.folders,
    folderOrder: parsed.folderOrder,
  });

  return {
    addedCount: bookmarks.length,
    duplicateCount,
    invalidUrlCount: parsed.invalidUrlCount,
    folderCount: parsed.folders.length,
  };
}

export async function importBrowserBookmarks(
  source: unknown,
): Promise<BrowserBookmarksImportSummary> {
  const html = await fileImportPort.readText(source);
  return importParsedBrowserBookmarks(parseBrowserBookmarksHtml(html, createId));
}

export function canImportBrowserBookmarksFromBrowser() {
  return browserBookmarksPort.isSupported();
}

export async function importBrowserBookmarksFromBrowser(): Promise<BrowserBookmarksImportSummary> {
  const tree = await browserBookmarksPort.requestTree();
  return importParsedBrowserBookmarks(parseBrowserBookmarksTree(tree, createId));
}

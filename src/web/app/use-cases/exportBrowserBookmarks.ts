import { exportBrowserBookmarksHtml } from '../../../core/domains/bookmarks/services/browserBookmarksHtml';
import { fileExportPort } from '../ports/defaultPorts';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

export function exportBrowserBookmarks(filenamePrefix: string, now = new Date()) {
  const snapshot = useWorkspaceStore.getState().snapshot;
  const html = exportBrowserBookmarksHtml(
    Object.values(snapshot.bookmarksById),
    Object.values(snapshot.bookmarkFoldersById),
    snapshot.bookmarkFolderOrder,
  );
  const filename = `${filenamePrefix}-${now.toISOString().slice(0, 10)}.html`;

  fileExportPort.downloadText(filename, html, 'text/html;charset=utf-8');

  return {
    exportedCount: Object.keys(snapshot.bookmarksById).length,
  };
}

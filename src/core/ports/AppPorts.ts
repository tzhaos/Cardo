import type { BrowserBookmarksPort } from './BrowserBookmarksPort';
import type { ClipboardPort } from './ClipboardPort';
import type { DatabasePort } from './DatabasePort';
import type { FileExportPort } from './FileExportPort';
import type { FileImportPort } from './FileImportPort';
import type { LocalResourcePort } from './LocalResourcePort';
import type { RuntimeDocumentPort } from './RuntimeDocumentPort';
import type { TabsPort } from './TabsPort';
import type { WebDavPort } from './WebDavPort';
import type { WorkspaceStoragePort } from './WorkspaceStoragePort';
import type { WebsiteIconPort } from './WebsiteIconPort';

export interface AppPorts {
  browserBookmarks: BrowserBookmarksPort;
  database: DatabasePort;
  workspaceStorage: WorkspaceStoragePort;
  clipboard: ClipboardPort;
  fileExport: FileExportPort;
  fileImport: FileImportPort;
  tabs: TabsPort;
  runtimeDocument: RuntimeDocumentPort;
  localResource: LocalResourcePort;
  webDav: WebDavPort;
  websiteIcons: WebsiteIconPort;
}

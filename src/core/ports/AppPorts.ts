import type { ClipboardPort } from './ClipboardPort';
import type { FileExportPort } from './FileExportPort';
import type { LocalResourcePort } from './LocalResourcePort';
import type { TabsPort } from './TabsPort';
import type { WebsiteIconPort } from './WebsiteIconPort';

/**
 * Shell capabilities shared by Web / Extension / Desktop clients.
 * Business database I/O is Runtime-only via RuntimeClient; no DatabasePort here.
 */
export interface AppPorts {
  clipboard: ClipboardPort;
  fileExport: FileExportPort;
  tabs: TabsPort;
  localResource: LocalResourcePort;
  websiteIcons: WebsiteIconPort;
}

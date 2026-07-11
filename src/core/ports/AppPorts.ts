import type { ClipboardPort } from './ClipboardPort';
import type { DatabasePort } from './DatabasePort';
import type { FileExportPort } from './FileExportPort';
import type { LocalResourcePort } from './LocalResourcePort';
import type { TabsPort } from './TabsPort';
import type { WebsiteIconPort } from './WebsiteIconPort';

export interface AppPorts {
  database: DatabasePort;
  clipboard: ClipboardPort;
  fileExport: FileExportPort;
  tabs: TabsPort;
  localResource: LocalResourcePort;
  websiteIcons: WebsiteIconPort;
}

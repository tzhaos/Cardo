import { log } from '../../../core/log';
import { openWorkspaceItem, type OpenItemResult } from '../../../core/services/workspaceActions';
import { clipboardPort, localResourcePort, tabsPort } from '../ports/defaultPorts';
import type { WorkspaceItem } from '../../../core/domains/items/model/item';

export type { OpenItemResult };

export async function openItem(item: WorkspaceItem): Promise<OpenItemResult> {
  const result = await openWorkspaceItem(item, {
    openUrl: (url) => tabsPort.openUrl(url),
    writeText: (text) => clipboardPort.writeText(text),
    requestOpen: (resourcePath) => localResourcePort.requestOpen(resourcePath),
  });

  if (result.status === 'failed') {
    log.error('Failed to open item', item.type, item.id, result.errorMessage);
  }

  return result;
}

import { clipboardPort, localResourcePort, tabsPort } from '../ports/defaultPorts';
import type { WorkspaceItem } from '../../domains/items/model/item';

export type OpenItemResult =
  | { status: 'opened-url' }
  | { status: 'copied-note' }
  | { status: 'requested-local-resource' }
  | { status: 'failed'; errorMessage: string };

export async function openItem(item: WorkspaceItem): Promise<OpenItemResult> {
  try {
    if (item.type === 'url') {
      tabsPort.openUrl(item.content);
      return { status: 'opened-url' };
    }

    if (item.type === 'note') {
      await clipboardPort.writeText(item.content);
      return { status: 'copied-note' };
    }

    const result = localResourcePort.requestOpen(item.content);

    return result.status === 'requested'
      ? { status: 'requested-local-resource' }
      : { status: 'failed', errorMessage: result.errorMessage };
  } catch (error) {
    return {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unexpected error',
    };
  }
}

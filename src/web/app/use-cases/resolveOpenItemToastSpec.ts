import type { WorkspaceItem } from '../../../core/domains/items/model/item';
import type { ToastSpec } from '../presentation/toastSpec';
import type { OpenItemResult } from './openItem';

export function resolveOpenItemToastSpec(
  result: OpenItemResult,
  item: WorkspaceItem,
): ToastSpec | null {
  if (result.status === 'copied-note') {
    return { level: 'success', messageKey: 'toast.copiedToClipboard' };
  }

  if (result.status === 'requested-local-resource') {
    return {
      level: 'message',
      messageKey: 'toast.requestedLocalResource',
      params: { title: item.title },
    };
  }

  if (result.status === 'failed') {
    return {
      level: 'error',
      messageKey: 'toast.unableToOpen',
      params: { title: item.title },
    };
  }

  return null;
}

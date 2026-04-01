import { writeExtensionText } from '../../extension/clipboard/writeText';
import { openExtensionUrl } from '../../extension/navigation/openUrl';
import { requestOpenLocalResource } from '../../integrations/companion/requestOpenLocalResource';
import type { BoxItemData } from '../../types/item';

export type OpenItemResult =
  | { status: 'opened-url' }
  | { status: 'copied-note' }
  | { status: 'requested-local-resource' }
  | { status: 'failed'; errorMessage: string };

export async function openItem(item: BoxItemData): Promise<OpenItemResult> {
  try {
    if (item.type === 'url') {
      openExtensionUrl(item.content);
      return { status: 'opened-url' };
    }

    if (item.type === 'note') {
      await writeExtensionText(item.content);
      return { status: 'copied-note' };
    }

    const result = requestOpenLocalResource(item.content);

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

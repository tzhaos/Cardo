import { log } from '../../../core/log';
import { readClipboardItemDraft } from '../../../core/services/workspaceActions';
import { clipboardPort } from '../ports/defaultPorts';

export async function readClipboardItem() {
  try {
    return await readClipboardItemDraft(clipboardPort);
  } catch (error) {
    log.warn('Clipboard read failed (permission denied or unavailable)', error);
    return null;
  }
}

import { log } from '../../lib/log';
import { parseTextToItemDraft } from '../../domains/items/services/parseTextToItemDraft';
import { clipboardPort } from '../ports/defaultPorts';

export async function readClipboardItem() {
  try {
    const clipboardText = await clipboardPort.readText();

    return clipboardText ? parseTextToItemDraft(clipboardText) : null;
  } catch (error) {
    log.warn('Clipboard read failed (permission denied or unavailable)', error);
    return null;
  }
}

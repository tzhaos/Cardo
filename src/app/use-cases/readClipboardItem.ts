import { parseTextToItemDraft } from '../../domains/items/services/parseTextToItemDraft';
import { clipboardPort } from '../ports/defaultPorts';

export async function readClipboardItem() {
  try {
    const clipboardText = await clipboardPort.readText();

    return clipboardText ? parseTextToItemDraft(clipboardText) : null;
  } catch {
    return null;
  }
}

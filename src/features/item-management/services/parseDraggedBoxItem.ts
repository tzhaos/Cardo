export interface DraggedBoxItemPayload {
  type: 'box-item';
  itemId: string;
  sourceBoxId: string;
}

import { log } from '../../../lib/log';

export function parseDraggedBoxItem(dataTransfer: DataTransfer) {
  try {
    const jsonData = dataTransfer.getData('application/json');

    if (!jsonData) {
      return null;
    }

    const parsed = JSON.parse(jsonData) as Partial<DraggedBoxItemPayload>;

    if (parsed.type !== 'box-item' || !parsed.itemId || !parsed.sourceBoxId) {
      return null;
    }

    return parsed as DraggedBoxItemPayload;
  } catch (error) {
    log.debug('Failed to parse dragged box item payload', error);
    return null;
  }
}

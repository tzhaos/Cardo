import { parseDataTransferToTextDraft } from '../../../../core/domains/items/services/parseDataTransferToTextDraft';

export function createTextItemFromTransfer(dataTransfer: DataTransfer) {
  return parseDataTransferToTextDraft(dataTransfer);
}

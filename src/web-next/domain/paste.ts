import { isUrlText } from '../../core/domains/items/services/isUrlText';
import { parseLocalPathText } from '../../core/domains/items/services/parseLocalPathText';
import {
  deriveBookmarkItemTitle,
  deriveFolderItemTitle,
  parseFolderPathInput,
} from './itemMetadata';
import type { WorkspaceBox, WorkspaceBoxType } from './workspace';

export function createPasteDraftForBox(
  box: WorkspaceBox,
  text: string,
): Record<string, string> | null {
  const value = text.trim();
  if (!value) {
    return null;
  }

  switch (box.type) {
    case 'folder': {
      const path = parseFolderPathInput(value);
      if (!path) {
        return null;
      }
      return {
        title: deriveFolderItemTitle(path),
        path,
        kind: 'folder',
      };
    }
    case 'bookmark':
      if (!isUrlText(value)) {
        return null;
      }
      return {
        title: deriveBookmarkItemTitle(value),
        url: value,
      };
    case 'clipboard':
      if (isUrlText(value) || parseLocalPathText(value)) {
        return null;
      }
      return {
        title: '',
        text: value,
      };
  }
}

export function boxTypeAcceptsPaste(type: WorkspaceBoxType, text: string) {
  if (type === 'folder') {
    return parseFolderPathInput(text) !== null;
  }
  if (type === 'bookmark') {
    return isUrlText(text);
  }
  return !isUrlText(text) && parseLocalPathText(text) === null;
}

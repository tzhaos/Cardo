import { isUrlText } from '../../core/domains/items/services/isUrlText';
import { parseLocalPathText } from '../../core/domains/items/services/parseLocalPathText';
import {
  deriveBookmarkItemTitle,
  deriveFolderItemTitle,
  parseFolderPathInput,
} from './itemMetadata';
import type { WorkspaceItemType } from './workspace';

export interface PasteItemDraft {
  type: WorkspaceItemType;
  draft: Record<string, string>;
}

export function createPasteItemDraft(text: string): PasteItemDraft | null {
  const value = text.trim();
  if (!value) {
    return null;
  }

  const path = parseFolderPathInput(value);
  if (path) {
    return {
      type: 'folder',
      draft: {
        title: deriveFolderItemTitle(path),
        path,
        kind: 'folder',
      },
    };
  }

  if (isUrlText(value)) {
    return {
      type: 'bookmark',
      draft: {
        title: deriveBookmarkItemTitle(value),
        url: value,
      },
    };
  }

  if (parseLocalPathText(value)) {
    return null;
  }

  return {
    type: 'clipboard',
    draft: { title: '', text: value },
  };
}

export function boxAcceptsPaste(text: string) {
  return createPasteItemDraft(text) !== null;
}

import { isUrlText } from '../../core/domains/items/services/isUrlText';
import { parseLocalPathText } from '../../core/domains/items/services/parseLocalPathText';
import { deriveBookmarkItemTitle, deriveFolderItemTitle } from './itemMetadata';
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

  const localPath = parseLocalPathText(value);
  if (localPath) {
    return {
      type: localPath.type,
      draft: {
        title: deriveFolderItemTitle(localPath.normalizedPath),
        path: localPath.normalizedPath,
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

  return {
    type: 'clipboard',
    draft: { title: '', text: value },
  };
}

export function boxAcceptsPaste(text: string) {
  return createPasteItemDraft(text) !== null;
}

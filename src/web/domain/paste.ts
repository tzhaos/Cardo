import { isUrlText } from '../../core/domains/items/services/isUrlText';
import { parseLocalPathText } from '../../core/domains/items/services/parseLocalPathText';
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

function deriveFolderItemTitle(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? '';
}

function deriveBookmarkItemTitle(url: string) {
  const hostname = new URL(url).hostname.replace(/^www\./i, '');
  const labels = hostname.split('.').filter(Boolean);
  return labels.length > 1 ? (labels.at(-2) ?? hostname) : hostname;
}

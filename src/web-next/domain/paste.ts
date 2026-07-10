import { isUrlText } from '../../core/domains/items/services/isUrlText';
import { parseLocalPathText } from '../../core/domains/items/services/parseLocalPathText';
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
      const parsedPath = parseLocalPathText(value);
      if (!parsedPath || parsedPath.type === 'shortcut') {
        return null;
      }
      return {
        title: derivePathTitle(parsedPath.normalizedPath),
        path: parsedPath.normalizedPath,
        kind: parsedPath.type,
      };
    }
    case 'bookmark':
      if (!isUrlText(value)) {
        return null;
      }
      return {
        title: deriveUrlTitle(value),
        url: value,
      };
    case 'clipboard':
      if (isUrlText(value) || parseLocalPathText(value)) {
        return null;
      }
      return {
        title: value.split(/\r?\n/)[0]?.slice(0, 48) || 'Clipboard',
        text: value,
      };
  }
}

export function boxTypeAcceptsPaste(type: WorkspaceBoxType, text: string) {
  return type === 'bookmark' ? isUrlText(text) : true;
}

function deriveUrlTitle(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function derivePathTitle(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

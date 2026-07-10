import { parseLocalPathText } from '../../core/domains/items/services/parseLocalPathText';

export function parseFolderPathInput(value: string) {
  const parsedPath = parseLocalPathText(value);
  return parsedPath?.type === 'folder' ? parsedPath.normalizedPath : null;
}

export function deriveFolderItemTitle(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? '';
}

export function deriveBookmarkItemTitle(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '');
    const labels = hostname.split('.').filter(Boolean);
    return labels.length > 1 ? (labels.at(-2) ?? hostname) : hostname;
  } catch {
    return '';
  }
}

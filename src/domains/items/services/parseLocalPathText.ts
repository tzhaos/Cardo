import type { ItemType } from '../model/item';

interface ParsedLocalPath {
  normalizedPath: string;
  type: Extract<ItemType, 'file' | 'folder'>;
}

const COMMON_FILE_EXTENSIONS = new Set([
  '7z',
  'apk',
  'bat',
  'cmd',
  'csv',
  'doc',
  'docx',
  'dll',
  'exe',
  'gif',
  'iso',
  'jpeg',
  'jpg',
  'json',
  'log',
  'md',
  'msi',
  'pdf',
  'png',
  'ppt',
  'pptx',
  'ps1',
  'rar',
  'svg',
  'tar',
  'txt',
  'wav',
  'webp',
  'xls',
  'xlsx',
  'xml',
  'yaml',
  'yml',
  'zip',
]);

function trimWrappingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function isWindowsDriveRoot(path: string) {
  return /^[A-Za-z]:\\$/.test(path);
}

function trimTrailingSeparators(path: string) {
  if (isWindowsDriveRoot(path)) {
    return path;
  }

  return path.replace(/[\\/]+$/, '');
}

function hasFileLikeExtension(path: string) {
  const lastSegment = path.split(/[/\\]/).pop() ?? '';
  const extensionMatch = lastSegment.match(/\.([^./\\\s]+)$/);

  if (!extensionMatch) {
    return false;
  }

  const extension = extensionMatch[1]?.toLowerCase() ?? '';

  if (!extension || /^\d+$/.test(extension)) {
    return false;
  }

  // Be conservative for pasted local paths: versioned folders like "v2.2.0"
  // are common, so we only treat known extensions as files.
  return COMMON_FILE_EXTENSIONS.has(extension);
}

function fromFileUri(value: string) {
  if (!/^file:/i.test(value)) {
    return null;
  }

  try {
    const parsedUrl = new URL(value);
    const decodedPathname = decodeURIComponent(parsedUrl.pathname || '');

    if (parsedUrl.host) {
      return trimTrailingSeparators(
        `\\\\${parsedUrl.host}${decodedPathname.replace(/\//g, '\\')}`,
      );
    }

    const drivePath = decodedPathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\//g, '\\');
    return trimTrailingSeparators(drivePath);
  } catch {
    return null;
  }
}

function normalizeWindowsPath(value: string) {
  const trimmedValue = trimWrappingQuotes(value.trim());

  if (!trimmedValue) {
    return null;
  }

  const fromUri = fromFileUri(trimmedValue);

  if (fromUri) {
    return fromUri;
  }

  if (/^[A-Za-z]:[\\/]/.test(trimmedValue)) {
    return trimTrailingSeparators(trimmedValue.replace(/\//g, '\\'));
  }

  if (/^\\\\[^\\]+\\[^\\]+/.test(trimmedValue)) {
    return trimTrailingSeparators(trimmedValue.replace(/\//g, '\\'));
  }

  return null;
}

export function parseLocalPathText(value: string): ParsedLocalPath | null {
  const normalizedPath = normalizeWindowsPath(value);

  if (!normalizedPath) {
    return null;
  }

  return {
    normalizedPath,
    type: hasFileLikeExtension(normalizedPath) ? 'file' : 'folder',
  };
}

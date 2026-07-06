import type { Bookmark, BookmarkFolder } from '../model/bookmark';
import { createBookmark, createBookmarkFolder } from './createBookmark';
import { isBookmarkUrl } from './normalizeBookmarkUrl';

export interface BrowserBookmarksImportResult {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  folderOrder: string[];
  invalidUrlCount: number;
}

export type BookmarkIdFactory = (prefix: string) => string;

const BOOKMARK_TOKEN_PATTERN = /<DT>\s*<(A|H3)\b([^>]*)>([\s\S]*?)<\/\1>|<DL\b[^>]*>|<\/DL>/gi;
const ATTRIBUTE_PATTERN = /([A-Z_:-]+)\s*=\s*"([^"]*)"/gi;

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseAttributes(rawAttributes: string) {
  const attributes: Record<string, string> = {};

  for (const match of rawAttributes.matchAll(ATTRIBUTE_PATTERN)) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2]);
  }

  return attributes;
}

function secondsFromDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : undefined;
}

function isoFromBookmarkTimestamp(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback.toISOString();
  }

  const timestamp = Number(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp * 1000).toISOString()
    : fallback.toISOString();
}

export function parseBrowserBookmarksHtml(
  html: string,
  createId: BookmarkIdFactory,
  now = new Date(),
): BrowserBookmarksImportResult {
  const bookmarks: Bookmark[] = [];
  const folders: BookmarkFolder[] = [];
  const folderOrder: string[] = [];
  const folderStack: Array<string | null> = [null];
  let pendingFolderId: string | null = null;
  let invalidUrlCount = 0;

  for (const match of html.matchAll(BOOKMARK_TOKEN_PATTERN)) {
    const token = match[0].toUpperCase();

    if (token.startsWith('</DL')) {
      if (folderStack.length > 1) {
        folderStack.pop();
      }
      continue;
    }

    if (token.startsWith('<DL')) {
      if (pendingFolderId) {
        folderStack.push(pendingFolderId);
        pendingFolderId = null;
      }
      continue;
    }

    const tagName = match[1]?.toUpperCase();
    const attributes = parseAttributes(match[2] ?? '');
    const title = decodeHtml(match[3] ?? '');

    if (tagName === 'H3') {
      const folder = createBookmarkFolder(
        createId('bookmark-folder'),
        {
          title: title || 'Untitled Folder',
          parentId: folderStack[folderStack.length - 1],
          source: 'import',
          createdAt: isoFromBookmarkTimestamp(attributes.add_date, now),
          updatedAt: now.toISOString(),
        },
        now,
      );

      folders.push(folder);
      folderOrder.push(folder.id);
      pendingFolderId = folder.id;
      continue;
    }

    if (tagName === 'A') {
      const url = attributes.href?.trim() ?? '';

      if (!isBookmarkUrl(url)) {
        invalidUrlCount += 1;
        continue;
      }

      bookmarks.push(
        createBookmark(
          createId('bookmark'),
          {
            title: title || url,
            url,
            folderId: folderStack[folderStack.length - 1],
            source: 'import',
            createdAt: isoFromBookmarkTimestamp(attributes.add_date, now),
            updatedAt: now.toISOString(),
          },
          now,
        ),
      );
    }
  }

  return {
    bookmarks,
    folders,
    folderOrder,
    invalidUrlCount,
  };
}

function renderBookmark(bookmark: Bookmark, depth: number) {
  const indent = '    '.repeat(depth);
  const createdAt = secondsFromDate(bookmark.createdAt) ?? Math.floor(Date.now() / 1000);

  return `${indent}<DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${createdAt}">${escapeHtml(
    bookmark.title,
  )}</A>`;
}

export function exportBrowserBookmarksHtml(
  bookmarks: Bookmark[],
  folders: BookmarkFolder[],
  folderOrder: string[],
) {
  const folderOrderIndex = new Map(folderOrder.map((folderId, index) => [folderId, index]));
  const foldersByParent = new Map<string | null, BookmarkFolder[]>();
  const bookmarksByFolder = new Map<string | null, Bookmark[]>();

  for (const folder of folders) {
    const siblings = foldersByParent.get(folder.parentId) ?? [];
    foldersByParent.set(folder.parentId, [...siblings, folder]);
  }

  for (const bookmark of bookmarks) {
    const siblings = bookmarksByFolder.get(bookmark.folderId) ?? [];
    bookmarksByFolder.set(bookmark.folderId, [...siblings, bookmark]);
  }

  const sortFolders = (items: BookmarkFolder[]) =>
    [...items].sort((left, right) => {
      const leftIndex = folderOrderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = folderOrderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      return leftIndex === rightIndex
        ? left.title.localeCompare(right.title)
        : leftIndex - rightIndex;
    });
  const sortBookmarks = (items: Bookmark[]) =>
    [...items].sort((left, right) => left.title.localeCompare(right.title));

  const renderFolder = (folder: BookmarkFolder, depth: number): string[] => {
    const indent = '    '.repeat(depth);
    const createdAt = secondsFromDate(folder.createdAt) ?? Math.floor(Date.now() / 1000);
    const lines = [
      `${indent}<DT><H3 ADD_DATE="${createdAt}">${escapeHtml(folder.title)}</H3>`,
      `${indent}<DL><p>`,
    ];

    for (const childFolder of sortFolders(foldersByParent.get(folder.id) ?? [])) {
      lines.push(...renderFolder(childFolder, depth + 1));
    }

    for (const bookmark of sortBookmarks(bookmarksByFolder.get(folder.id) ?? [])) {
      lines.push(renderBookmark(bookmark, depth + 1));
    }

    lines.push(`${indent}</DL><p>`);
    return lines;
  };

  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>KhaosBox Bookmarks</TITLE>',
    '<H1>KhaosBox Bookmarks</H1>',
    '<DL><p>',
  ];

  for (const folder of sortFolders(foldersByParent.get(null) ?? [])) {
    lines.push(...renderFolder(folder, 1));
  }

  for (const bookmark of sortBookmarks(bookmarksByFolder.get(null) ?? [])) {
    lines.push(renderBookmark(bookmark, 1));
  }

  lines.push('</DL><p>');
  return `${lines.join('\n')}\n`;
}

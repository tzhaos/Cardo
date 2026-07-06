import type {
  Bookmark,
  BookmarkDraft,
  BookmarkFolder,
  BookmarkFolderDraft,
} from '../model/bookmark';
import { normalizeBookmarkUrl } from './normalizeBookmarkUrl';

function cleanTags(tags: string[] | undefined) {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0)));
}

export function createBookmark(bookmarkId: string, draft: BookmarkDraft, now = new Date()) {
  const timestamp = now.toISOString();
  const title = draft.title.trim() || draft.url.trim();
  const url = draft.url.trim();

  return {
    id: bookmarkId,
    title,
    url,
    normalizedUrl: normalizeBookmarkUrl(url),
    description: draft.description?.trim() || null,
    tags: cleanTags(draft.tags),
    folderId: draft.folderId ?? null,
    source: draft.source ?? 'manual',
    createdAt: draft.createdAt ?? timestamp,
    updatedAt: draft.updatedAt ?? timestamp,
    lastOpenedAt: draft.lastOpenedAt ?? null,
    openCount: Math.max(0, Math.round(draft.openCount ?? 0)),
    isFavorite: draft.isFavorite ?? false,
    isPinned: draft.isPinned ?? false,
  } satisfies Bookmark;
}

export function createBookmarkFolder(
  folderId: string,
  draft: BookmarkFolderDraft,
  now = new Date(),
) {
  const timestamp = now.toISOString();

  return {
    id: folderId,
    title: draft.title.trim(),
    parentId: draft.parentId ?? null,
    source: draft.source ?? 'manual',
    createdAt: draft.createdAt ?? timestamp,
    updatedAt: draft.updatedAt ?? timestamp,
  } satisfies BookmarkFolder;
}

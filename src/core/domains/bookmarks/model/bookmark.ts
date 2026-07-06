export type BookmarkSource = 'manual' | 'import' | 'item';

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  normalizedUrl: string;
  description: string | null;
  tags: string[];
  folderId: string | null;
  source: BookmarkSource;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  openCount: number;
  isFavorite: boolean;
  isPinned: boolean;
}

export interface BookmarkFolder {
  id: string;
  title: string;
  parentId: string | null;
  source: BookmarkSource;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkDraft {
  title: string;
  url: string;
  description?: string | null;
  tags?: string[];
  folderId?: string | null;
  source?: BookmarkSource;
  createdAt?: string;
  updatedAt?: string;
  lastOpenedAt?: string | null;
  openCount?: number;
  isFavorite?: boolean;
  isPinned?: boolean;
}

export interface BookmarkFolderDraft {
  title: string;
  parentId?: string | null;
  source?: BookmarkSource;
  createdAt?: string;
  updatedAt?: string;
}

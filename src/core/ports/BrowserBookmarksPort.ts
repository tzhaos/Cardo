export interface BrowserBookmarkTreeNode {
  title?: string;
  url?: string;
  dateAdded?: number;
  children?: BrowserBookmarkTreeNode[];
}

export interface BrowserBookmarksPort {
  isSupported(): boolean;
  requestTree(): Promise<BrowserBookmarkTreeNode[]>;
}

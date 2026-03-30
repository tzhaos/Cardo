export type ItemType = 'file' | 'folder' | 'url' | 'note';

export interface BoxItemData {
  id: string;
  type: ItemType;
  title: string;
  content: string; // path, url, or note text
  isPinned: boolean;
}

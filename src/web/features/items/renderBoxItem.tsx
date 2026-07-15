import type { WorkspaceBox } from '../../domain/workspace';
import { BookmarkItem } from './BookmarkItem';
import { ClipboardItem } from './ClipboardItem';
import { LocalResourceItem } from './LocalResourceItem';

/** Shared item renderer for freeform box contents. */
export function renderBoxItem(
  boxId: string,
  item: WorkspaceBox['items'][number],
  highlight = false,
) {
  switch (item.type) {
    case 'file':
    case 'shortcut':
    case 'folder':
      return <LocalResourceItem boxId={boxId} item={item} highlight={highlight} />;
    case 'bookmark':
      return <BookmarkItem boxId={boxId} item={item} highlight={highlight} />;
    case 'clipboard':
      return <ClipboardItem boxId={boxId} item={item} highlight={highlight} />;
  }
}

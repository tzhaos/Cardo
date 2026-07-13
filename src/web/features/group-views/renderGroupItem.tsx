import type { WorkspaceBox } from '../../domain/workspace';
import { BookmarkItem } from '../items/BookmarkItem';
import { ClipboardItem } from '../items/ClipboardItem';
import { LocalResourceItem } from '../items/LocalResourceItem';

export function renderGroupItem(
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

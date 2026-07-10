import type { FolderItem as FolderItemModel } from '../../domain/workspace';
import { LocalResourceItem } from './LocalResourceItem';

export function FolderItem({
  boxId,
  item,
  highlight,
}: {
  boxId: string;
  item: FolderItemModel;
  highlight: boolean;
}) {
  return <LocalResourceItem boxId={boxId} item={item} highlight={highlight} />;
}

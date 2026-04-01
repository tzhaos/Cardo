import { File, Folder } from 'lucide-react';
import type { BoxItemData } from '../../types/item';
import ItemCard from './ItemCard';

interface Props {
  item: BoxItemData;
  layout: 'grid' | 'list';
  onUpdate: (updates: Partial<BoxItemData>) => void;
  onSetPinned: (isPinned: boolean) => void;
  onDelete: () => void;
}

export default function FileItem(props: Props) {
  const iconSize = props.layout === 'grid' ? 24 : 16;
  const icon =
    props.item.type === 'folder' ? (
      <Folder size={iconSize} className="text-amber-400" fill="currentColor" fillOpacity={0.2} />
    ) : (
      <File size={iconSize} className="text-blue-400" />
    );

  return <ItemCard {...props} icon={icon} />;
}

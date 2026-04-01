import { ClipboardPaste } from 'lucide-react';
import type { BoxItemData } from '../../types/item';
import ItemCard from './ItemCard';

interface Props {
  item: BoxItemData;
  layout: 'grid' | 'list';
  onUpdate: (updates: Partial<BoxItemData>) => void;
  onSetPinned: (isPinned: boolean) => void;
  onDelete: () => void;
}

export default function NoteItem(props: Props) {
  const iconSize = props.layout === 'grid' ? 24 : 16;
  return (
    <ItemCard {...props} icon={<ClipboardPaste size={iconSize} className="text-purple-400" />} />
  );
}

import { Link as LinkIcon } from 'lucide-react';
import type { BoxItemData } from '../../types/item';
import ItemCard from './ItemCard';

interface Props {
  item: BoxItemData;
  layout: 'grid' | 'list';
  onUpdate: (updates: Partial<BoxItemData>) => void;
  onDelete: () => void;
}

export default function UrlItem(props: Props) {
  const iconSize = props.layout === 'grid' ? 24 : 16;
  return <ItemCard {...props} icon={<LinkIcon size={iconSize} className="text-emerald-400" />} />;
}

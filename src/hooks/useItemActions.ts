import { toast } from 'sonner';
import { BoxItemData } from '../types/item';
import { openLocalResource } from '../platform/openLocalResource';
import { openUrl } from '../platform/openUrl';
import { writeText } from '../platform/writeText';

export const useItemActions = () => {
  const openItem = async (item: BoxItemData) => {
    try {
      if (item.type === 'url') {
        openUrl(item.content);
      } else if (item.type === 'note') {
        await writeText(item.content);
        toast.success('Copied to clipboard!');
      } else {
        openLocalResource(item.content);
        toast.success(`Opening via LocalExplore: ${item.title}`);
      }
    } catch (error) {
      toast.error(`Unable to open "${item.title}"`);
    }
  };

  return { openItem };
};

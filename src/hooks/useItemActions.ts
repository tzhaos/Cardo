import { toast } from 'sonner';
import { useI18n } from '../domains/i18n/hooks/useI18n';
import { BoxItemData } from '../types/item';
import { openKbeResource } from '../platform/kbe/openKbeResource';
import { openUrl } from '../platform/openUrl';
import { writeText } from '../platform/writeText';

export const useItemActions = () => {
  const { t } = useI18n();

  const openItem = async (item: BoxItemData) => {
    try {
      if (item.type === 'url') {
        openUrl(item.content);
      } else if (item.type === 'note') {
        await writeText(item.content);
        toast.success(t('toast.copiedToClipboard'));
      } else {
        openKbeResource(item.content);
        toast.success(t('toast.openingLocalResource', { title: item.title }));
      }
    } catch (error) {
      toast.error(t('toast.unableToOpen', { title: item.title }));
    }
  };

  return { openItem };
};

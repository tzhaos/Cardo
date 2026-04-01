import { toast } from 'sonner';
import { openItem as openItemUseCase } from '../app/use-cases/openItem';
import { useI18n } from '../domains/i18n/hooks/useI18n';
import { BoxItemData } from '../types/item';

export const useItemActions = () => {
  const { t } = useI18n();

  const openItem = async (item: BoxItemData) => {
    const result = await openItemUseCase(item);

    if (result.status === 'copied-note') {
      toast.success(t('toast.copiedToClipboard'));
      return;
    }

    if (result.status === 'requested-local-resource') {
      toast.message(t('toast.requestedLocalResource', { title: item.title }));
      return;
    }

    if (result.status === 'failed') {
      toast.error(t('toast.unableToOpen', { title: item.title }));
    }
  };

  return { openItem };
};

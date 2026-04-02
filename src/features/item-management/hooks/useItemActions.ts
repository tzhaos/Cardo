import { toast } from 'sonner';
import { openItem as openItemUseCase } from '../../../app/use-cases/openItem';
import { useI18n } from '../../../app/hooks/useI18n';
import type { WorkspaceItem } from '../../../domains/items/model/item';

export const useItemActions = () => {
  const { t } = useI18n();

  const openItem = async (item: WorkspaceItem) => {
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

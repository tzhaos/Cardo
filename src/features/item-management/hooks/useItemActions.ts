import { presentToastSpec } from '../../../app/presentation/toastSpec';
import { useI18n } from '../../../app/hooks/useI18n';
import { openItem as openItemUseCase } from '../../../app/use-cases/openItem';
import { resolveOpenItemToastSpec } from '../../../app/use-cases/resolveOpenItemToastSpec';
import type { WorkspaceItem } from '../../../domains/items/model/item';

export const useItemActions = () => {
  const { t } = useI18n();

  const openItem = async (item: WorkspaceItem) => {
    const result = await openItemUseCase(item);
    presentToastSpec(t, resolveOpenItemToastSpec(result, item));
  };

  return { openItem };
};

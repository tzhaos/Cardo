import { presentToastSpec } from '../../../app/presentation/toastSpec';
import { useI18n } from '../../../app/hooks/useI18n';
import { openItem as openItemUseCase } from '../../../app/use-cases/openItem';
import { recordBookmarkOpen } from '../../../app/use-cases/openBookmark';
import { resolveOpenItemToastSpec } from '../../../app/use-cases/resolveOpenItemToastSpec';
import { useWorkspaceSnapshot } from '../../../app/stores/useWorkspaceSelectors';
import { normalizeBookmarkUrl } from '../../../../core/domains/bookmarks/services/normalizeBookmarkUrl';
import type { WorkspaceItem } from '../../../../core/domains/items/model/item';

export const useItemActions = () => {
  const { t } = useI18n();
  const snapshot = useWorkspaceSnapshot();

  const openItem = async (item: WorkspaceItem) => {
    const result = await openItemUseCase(item);

    if (result.status === 'opened-url' && item.type === 'url') {
      const linkedBookmark = item.bookmarkId ? snapshot.bookmarksById[item.bookmarkId] : null;
      const bookmark =
        linkedBookmark ??
        Object.values(snapshot.bookmarksById).find(
          (candidate) => candidate.normalizedUrl === normalizeBookmarkUrl(item.url),
        );

      if (bookmark) {
        recordBookmarkOpen(bookmark.id);
      }
    }

    presentToastSpec(t, resolveOpenItemToastSpec(result, item));
  };

  return { openItem };
};

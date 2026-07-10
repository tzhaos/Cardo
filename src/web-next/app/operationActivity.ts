import type { BoxItem } from '../domain/workspace';
import { recordOperation } from './stores/operationJournalStore';
import { useWorkspaceStore } from './stores/workspaceStore';

export function recordBoxActivity(
  boxId: string,
  action: string,
  details?: Record<string, string | number | boolean | null>,
) {
  const snapshot = useWorkspaceStore.getState().snapshot;
  const box = snapshot.boxes.find((candidate) => candidate.id === boxId);
  if (!box) return;
  const page = snapshot.pages.find((candidate) => candidate.id === box.pageId);
  recordOperation({
    category: 'activity',
    action,
    source: 'user',
    undoable: false,
    target: {
      pageId: box.pageId,
      pageTitle: page?.title,
      boxId: box.id,
      boxTitle: box.title,
    },
    details,
  });
}

export function recordItemActivity(
  boxId: string,
  item: BoxItem,
  action: 'item.open' | 'item.copy',
  origin: 'box' | 'collection' | 'search' = 'box',
) {
  const snapshot = useWorkspaceStore.getState().snapshot;
  const box = snapshot.boxes.find((candidate) => candidate.id === boxId);
  if (!box) return;
  const page = snapshot.pages.find((candidate) => candidate.id === box.pageId);
  recordOperation({
    category: 'activity',
    action,
    source: 'user',
    undoable: false,
    target: {
      pageId: box.pageId,
      pageTitle: page?.title,
      boxId: box.id,
      boxTitle: box.title,
      itemId: item.id,
      itemTitle: item.title || item.type,
    },
    details: {
      origin,
      type: item.type,
      ...(item.type === 'clipboard' ? { contentLength: item.text.length } : {}),
    },
  });
}

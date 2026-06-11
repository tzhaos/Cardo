import { useState } from 'react';
import { addItemDraftToBox } from '../../../app/use-cases/addItemDraftToBox';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import {
  useWorkspaceBoxItems,
  useWorkspaceDispatch,
} from '../../../app/stores/useWorkspaceSelectors';
import type {
  PlacedWorkspaceItem,
  WorkspaceItem,
  WorkspaceItemUpdate,
} from '../../../../core/domains/items/model/item';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import { useAddItem } from './useAddItem';
import { useBoxDrop } from './useBoxDrop';

export function useManagedBoxContent(
  box: WorkspaceBox,
  showAddMenu: boolean,
  setShowAddMenu: (show: boolean) => void,
) {
  const draggedItemInfo = useInteractionStore((state) => state.draggedItemInfo);
  const dispatch = useWorkspaceDispatch();
  const items = useWorkspaceBoxItems(box.id);
  const [listKey] = useState(() => `box-content-${box.id}`);

  const addItem = useAddItem({
    showAddMenu,
    onAddExistingItem: (item) => {
      if (item) {
        addItemDraftToBox(box.id, item);
      }
    },
    onAddItem: (type, title, content) => addItemDraftToBox(box.id, { type, title, content }),
    onClose: () => setShowAddMenu(false),
    onOpen: () => setShowAddMenu(true),
  });

  const drop = useBoxDrop({
    box,
    onOpenExternalDraft: (draft) => {
      setShowAddMenu(true);
      addItem.openDraft(
        draft.type as Extract<typeof draft.type, 'file' | 'folder' | 'shortcut'>,
        draft.title ?? '',
      );
    },
  });

  return {
    listKey,
    addItem,
    drop,
    pinnedItems: items.filter((item) => item.isPinned),
    regularItems: items.filter((item) => !item.isPinned),
    isItemBeingDragged: (itemId: string) => draggedItemInfo?.itemId === itemId,
    updateItem: (item: WorkspaceItem, updates: WorkspaceItemUpdate) =>
      dispatch({
        type: 'item.update',
        boxId: box.id,
        itemId: item.id,
        updates,
      }),
    setItemPinned: (item: PlacedWorkspaceItem, isPinned: boolean) =>
      dispatch({
        type: 'item.setPinned',
        boxId: box.id,
        itemId: item.id,
        isPinned,
      }),
    deleteItem: (item: WorkspaceItem) =>
      dispatch({
        type: 'item.delete',
        boxId: box.id,
        itemId: item.id,
      }),
  };
}

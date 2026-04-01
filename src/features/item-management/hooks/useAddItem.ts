import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '../../../domains/i18n/hooks/useI18n';
import { ITEM_TYPE_LABEL_KEYS } from '../../../domains/i18n/model/messages';
import { createItemFromText } from '../../../domains/items/services/createItem';
import type { ItemType } from '../../../types/item';

interface UseAddItemOptions {
  showAddMenu: boolean;
  onAddItem: (type: ItemType, title: string, content: string) => void;
  onAddExistingItem: (item: ReturnType<typeof createItemFromText>) => void;
  onClose: () => void;
  onOpen: () => void;
}

export function useAddItem({
  showAddMenu,
  onAddItem,
  onAddExistingItem,
  onClose,
  onOpen,
}: UseAddItemOptions) {
  const { t } = useI18n();
  const [addingType, setAddingType] = useState<ItemType | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState('');

  useEffect(() => {
    if (showAddMenu) {
      return;
    }

    setAddingType(null);
    setNewItemTitle('');
    setNewItemContent('');
  }, [showAddMenu]);

  const closeComposer = () => {
    setAddingType(null);
    setNewItemTitle('');
    setNewItemContent('');
    onClose();
  };

  const returnToTypePicker = () => {
    setAddingType(null);
    setNewItemTitle('');
    setNewItemContent('');
  };

  const handleAddItemType = async (type: ItemType) => {
    if (type === 'note') {
      try {
        const clipboardText = await navigator.clipboard.readText();

        if (clipboardText) {
          onAddExistingItem(createItemFromText(clipboardText));
          toast.success(t('toast.addedFromClipboard'));
          closeComposer();
          return;
        }
      } catch {
        // Fall through to manual form entry.
      }
    }

    setAddingType(type);
    setNewItemTitle('');
    setNewItemContent('');
  };

  const openDraft = (type: Extract<ItemType, 'file' | 'folder'>, title = '') => {
    onOpen();
    setAddingType(type);
    setNewItemTitle(title);
    setNewItemContent('');
  };

  const confirmAdd = () => {
    if (!addingType || !newItemContent.trim()) {
      return;
    }

    onAddItem(addingType, newItemTitle, newItemContent);
    toast.success(
      t('toast.addedNewType', {
        type: t(ITEM_TYPE_LABEL_KEYS[addingType]),
      }),
    );
    closeComposer();
  };

  return {
    addingType,
    newItemTitle,
    newItemContent,
    setNewItemTitle,
    setNewItemContent,
    handleAddItemType,
    openDraft,
    confirmAdd,
    cancelAdd: addingType ? returnToTypePicker : closeComposer,
  };
}

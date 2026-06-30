import { useEffect, useState } from 'react';
import { presentToastSpec } from '../../../app/presentation/toastSpec';
import { useI18n } from '../../../app/hooks/useI18n';
import { describeManualItemAddToastSpec } from '../../../app/use-cases/describeManualItemAddToastSpec';
import { prepareAddItemTypeSelection } from '../../../app/use-cases/prepareAddItemTypeSelection';
import type { ItemDraft, ItemType } from '../../../../core/domains/items/model/item';

interface UseAddItemOptions {
  showAddMenu: boolean;
  onAddItem: (type: ItemType, title: string, content: string) => void;
  onAddExistingItem: (item: ItemDraft) => void;
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
    const prepared = await prepareAddItemTypeSelection(type);

    if (prepared.outcome === 'clipboard') {
      try {
        onAddExistingItem(prepared.item);
      } finally {
        closeComposer();
      }
      presentToastSpec(t, prepared.toast);
      return;
    }

    setAddingType(prepared.type);
    setNewItemTitle('');
    setNewItemContent('');
  };

  const openDraft = (type: Extract<ItemType, 'file' | 'folder' | 'shortcut'>, title = '') => {
    onOpen();
    setAddingType(type);
    setNewItemTitle(title);
    setNewItemContent('');
  };

  const confirmAdd = () => {
    if (!addingType || !newItemContent.trim()) {
      return;
    }

    const confirmedType = addingType;
    try {
      onAddItem(confirmedType, newItemTitle, newItemContent);
    } finally {
      closeComposer();
    }
    presentToastSpec(t, describeManualItemAddToastSpec(confirmedType));
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

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '../../../domains/i18n/hooks/useI18n';
import { ITEM_TYPE_LABEL_KEYS } from '../../../domains/i18n/model/messages';
import { createItem, createItemFromText } from '../../../domains/items/services/createItem';
import type { BoxData } from '../../../types/box';
import type { ItemType } from '../../../types/item';

interface UseAddItemOptions {
  box: BoxData;
  showAddMenu: boolean;
  onUpdate: (updates: Partial<BoxData>) => void;
  onClose: () => void;
}

export function useAddItem({ box, showAddMenu, onUpdate, onClose }: UseAddItemOptions) {
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

  const appendItems = (items: BoxData['items']) => {
    onUpdate({ items: [...box.items, ...items] });
  };

  const handleAddItemType = async (type: ItemType) => {
    if (type === 'file') {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.onchange = (event) => {
        const files = Array.from((event.target as HTMLInputElement).files || []);

        if (files.length === 0) {
          return;
        }

        appendItems(
          files.map((file) =>
            createItem({
              type: 'file',
              title: file.name,
              content: file.webkitRelativePath || file.name,
            }),
          ),
        );
        toast.success(t('toast.addedFiles', { count: files.length }));
        closeComposer();
      };
      input.click();
      return;
    }

    if (type === 'folder') {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.onchange = (event) => {
        const files = Array.from((event.target as HTMLInputElement).files || []);

        if (files.length === 0) {
          return;
        }

        const rootName = files[0].webkitRelativePath.split('/')[0] || t('itemType.folder');
        appendItems([
          createItem({
            type: 'folder',
            title: rootName,
            content: rootName,
          }),
        ]);
        toast.success(t('toast.addedFolder', { name: rootName }));
        closeComposer();
      };
      input.click();
      return;
    }

    if (type === 'note') {
      try {
        const clipboardText = await navigator.clipboard.readText();

        if (clipboardText) {
          appendItems([createItemFromText(clipboardText)]);
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

  const confirmAdd = () => {
    if (!addingType || !newItemContent.trim()) {
      return;
    }

    appendItems([
      createItem({
        type: addingType,
        title: newItemTitle,
        content: newItemContent,
      }),
    ]);
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
    confirmAdd,
    cancelAdd: addingType ? returnToTypePicker : closeComposer,
  };
}

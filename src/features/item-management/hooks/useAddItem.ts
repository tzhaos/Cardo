import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
        toast.success(`Added ${files.length} file(s)`);
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

        const rootName = files[0].webkitRelativePath.split('/')[0] || 'Folder';
        appendItems([
          createItem({
            type: 'folder',
            title: rootName,
            content: rootName,
          }),
        ]);
        toast.success(`Added folder ${rootName}`);
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
          toast.success('Added item from clipboard');
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
    toast.success(`Added new ${addingType}`);
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

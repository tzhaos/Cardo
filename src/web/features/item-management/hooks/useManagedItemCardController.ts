import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import { clearEditingSessionIfActive } from '../../../app/controllers/interactionController';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { deriveItemTitle } from '../../../../core/domains/items/services/deriveItemTitle';
import {
  getWorkspaceItemContent,
  type PlacedWorkspaceItem,
  type WorkspaceItemUpdate,
} from '../../../../core/domains/items/model/item';
import { useItemActions } from './useItemActions';

export function useManagedItemCardController({
  boxId,
  item,
  onUpdate,
  onSetPinned,
  onDelete,
}: {
  boxId: string;
  item: PlacedWorkspaceItem;
  onUpdate: (updates: WorkspaceItemUpdate) => void;
  onSetPinned: (isPinned: boolean) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const editorId = `item:${item.id}`;
  const editingSessionId = useInteractionStore((state) => state.editingSessionId);
  const focusedAt = useInteractionStore((state) => {
    const focusedItemInfo = state.focusedItemInfo;
    return focusedItemInfo?.boxId === boxId && focusedItemInfo.itemId === item.id
      ? focusedItemInfo.focusedAt
      : null;
  });
  const setEditingSessionId = useInteractionStore((state) => state.setEditingSessionId);
  const setFocusedItemInfo = useInteractionStore((state) => state.setFocusedItemInfo);
  const itemContent = getWorkspaceItemContent(item);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editContent, setEditContent] = useState(itemContent);
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { openItem } = useItemActions();

  const isEditing = editingSessionId === editorId;
  const isInteractionLocked = Boolean(editingSessionId && editingSessionId !== editorId);
  const isFocused = focusedAt !== null;

  const closeEditor = useCallback(() => {
    clearEditingSessionIfActive(editorId);
  }, [editorId]);

  const handleCancel = useCallback(
    (event?: SyntheticEvent) => {
      event?.stopPropagation();
      setEditTitle(item.title);
      setEditContent(itemContent);
      closeEditor();
    },
    [item.title, itemContent, closeEditor],
  );

  const handleSave = useCallback(
    (event?: SyntheticEvent) => {
      event?.stopPropagation();

      const nextContent = editContent.trim();

      if (!nextContent) {
        return;
      }

      onUpdate({
        title: editTitle.trim() || deriveItemTitle(item.type, nextContent),
        ...(item.type === 'url'
          ? { url: nextContent }
          : item.type === 'note'
            ? { text: nextContent }
            : { path: nextContent }),
      });
      closeEditor();
    },
    [closeEditor, editContent, editTitle, item.type, onUpdate],
  );

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    setEditTitle(item.title);
    setEditContent(itemContent);
  }, [isEditing, itemContent, item.title]);

  useEffect(() => {
    if (!isEditing || !titleInputRef.current) {
      return;
    }

    titleInputRef.current.focus();
    titleInputRef.current.select();
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const handlePointerDownOutside = (event: PointerEvent) => {
      const editorRoot = editorRootRef.current;
      const target = event.target;

      if (!editorRoot || !(target instanceof Node) || editorRoot.contains(target)) {
        return;
      }

      handleSave();
    };

    document.addEventListener('pointerdown', handlePointerDownOutside, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside, true);
    };
  }, [isEditing, handleSave]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    rootRef.current?.scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: 'smooth',
    });

    if (!focusedAt) {
      return;
    }

    const timeoutId = window.setTimeout(() => setFocusedItemInfo(null), 2400);

    return () => window.clearTimeout(timeoutId);
  }, [focusedAt, isFocused, setFocusedItemInfo]);

  useEffect(
    () => () => {
      clearEditingSessionIfActive(editorId);
    },
    [editorId],
  );

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
      return;
    }

    if (
      event.key === 'Enter' &&
      (event.currentTarget.tagName === 'INPUT' || event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      handleSave();
    }
  };

  return {
    rootRef,
    editTitle,
    editContent,
    editorRootRef,
    titleInputRef,
    isEditing,
    isFocused,
    isInteractionLocked,
    labels: {
      editor: t('item.edit'),
      contentPlaceholder:
        item.type === 'url'
          ? t('addItem.urlPlaceholder')
          : item.type === 'file' || item.type === 'folder' || item.type === 'shortcut'
            ? t('addItem.pathPlaceholder')
            : t('addItem.contentPlaceholder'),
      titlePlaceholder: t('addItem.titleOptional'),
      save: t('item.saveChanges'),
      cancel: t('common.cancel'),
      pin: t('item.pin'),
      pinToTop: t('item.pinToTop'),
      unpin: t('item.unpin'),
      edit: t('item.edit'),
      delete: t('item.delete'),
    },
    openItem: () => {
      if (editingSessionId) {
        return;
      }

      void openItem(item);
    },
    startEdit: (event: SyntheticEvent) => {
      event.stopPropagation();

      if (isInteractionLocked) {
        return;
      }

      setEditTitle(item.title);
      setEditContent(itemContent);
      setEditingSessionId(editorId);
    },
    setEditTitle,
    setEditContent,
    handleEditorKeyDown,
    handleSave,
    handleCancel,
    togglePinned: (event: SyntheticEvent) => {
      event.stopPropagation();
      onSetPinned(!item.isPinned);
    },
    deleteItem: (event: SyntheticEvent) => {
      event.stopPropagation();
      onDelete();
    },
  };
}

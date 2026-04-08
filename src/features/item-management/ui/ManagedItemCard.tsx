import {
  Check,
  ClipboardPaste,
  File,
  Folder,
  Link as LinkIcon,
  Pencil,
  Pin,
  PinOff,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import { deriveItemTitle } from '../../../domains/items/services/deriveItemTitle';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useItemActions } from '../hooks/useItemActions';
import type { WorkspaceItem, WorkspaceItemUpdate } from '../../../domains/items/model/item';
import ItemCard from '../../../widgets/ItemCard/ItemCard';

interface ManagedItemCardProps {
  item: WorkspaceItem;
  layout: 'grid' | 'list';
  onUpdate: (updates: WorkspaceItemUpdate) => void;
  onSetPinned: (isPinned: boolean) => void;
  onDelete: () => void;
}

function getItemIcon(item: WorkspaceItem, layout: 'grid' | 'list') {
  const iconSize = layout === 'grid' ? 24 : 16;

  if (item.type === 'folder') {
    return (
      <Folder size={iconSize} className="text-amber-400" fill="currentColor" fillOpacity={0.2} />
    );
  }

  if (item.type === 'file') {
    return <File size={iconSize} className="text-blue-400" />;
  }

  if (item.type === 'url') {
    return <LinkIcon size={iconSize} className="text-emerald-400" />;
  }

  return <ClipboardPaste size={iconSize} className="text-purple-400" />;
}

export default function ManagedItemCard({
  item,
  layout,
  onUpdate,
  onSetPinned,
  onDelete,
}: ManagedItemCardProps) {
  const { t } = useI18n();
  const editorId = `item:${item.id}`;
  const editingSessionId = useInteractionStore((state) => state.editingSessionId);
  const setEditingSessionId = useInteractionStore((state) => state.setEditingSessionId);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editContent, setEditContent] = useState(item.content);
  const editorRootRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { openItem } = useItemActions();

  const isEditing = editingSessionId === editorId;
  const isInteractionLocked = Boolean(editingSessionId && editingSessionId !== editorId);

  const closeEditor = useCallback(() => {
    if (useInteractionStore.getState().editingSessionId === editorId) {
      setEditingSessionId(null);
    }
  }, [editorId, setEditingSessionId]);

  const handleCancel = useCallback(
    (event?: React.SyntheticEvent) => {
      event?.stopPropagation();
      setEditTitle(item.title);
      setEditContent(item.content);
      closeEditor();
    },
    [item.title, item.content, closeEditor],
  );

  const handleSave = useCallback(
    (event?: React.SyntheticEvent) => {
      event?.stopPropagation();

      const nextContent = editContent.trim();

      if (!nextContent) {
        return;
      }

      onUpdate({
        title: editTitle.trim() || deriveItemTitle(item.type, nextContent),
        content: nextContent,
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
    setEditContent(item.content);
  }, [isEditing, item.content, item.title]);

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

  useEffect(
    () => () => {
      const state = useInteractionStore.getState();

      if (state.editingSessionId === editorId) {
        state.setEditingSessionId(null);
      }
    },
    [editorId],
  );

  const handleEditorKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
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

  const sharedProps = {
    item,
    layout,
    icon: getItemIcon(item, layout),
    isEditing,
    isInteractionLocked,
    editTitle,
    editContent,
    editorRootRef,
    titleInputRef,
    contentLabel:
      item.type === 'note'
        ? t('item.content')
        : item.type === 'url'
          ? t('item.address')
          : t('item.path'),
    titlePlaceholder: t('item.title'),
    saveLabel: t('item.saveChanges'),
    cancelLabel: t('item.cancelEditing'),
    pinLabel: t('item.pin'),
    pinToTopLabel: t('item.pinToTop'),
    unpinLabel: t('item.unpin'),
    editLabel: t('item.edit'),
    deleteLabel: t('item.delete'),
    saveIcon: <Check size={18} />,
    cancelIcon: <X size={18} />,
    editIcon: <Pencil size={layout === 'grid' ? 12 : 14} />,
    pinIcon: <Pin size={layout === 'grid' ? 12 : 14} />,
    unpinIcon: <PinOff size={layout === 'grid' ? 12 : 14} />,
    deleteIcon: <X size={layout === 'grid' ? 12 : 14} />,
    onCardClick: () => {
      if (editingSessionId) {
        return;
      }

      void openItem(item);
    },
    onStartEdit: (event: React.SyntheticEvent) => {
      event.stopPropagation();

      if (isInteractionLocked) {
        return;
      }

      setEditTitle(item.title);
      setEditContent(item.content);
      setEditingSessionId(editorId);
    },
    onEditTitleChange: setEditTitle,
    onEditContentChange: setEditContent,
    onEditorKeyDown: handleEditorKeyDown,
    onSave: handleSave,
    onCancel: handleCancel,
    onTogglePinned: (event: React.SyntheticEvent) => {
      event.stopPropagation();
      onSetPinned(!item.isPinned);
    },
    onDeleteClick: (event: React.SyntheticEvent) => {
      event.stopPropagation();
      onDelete();
    },
  };

  return <ItemCard {...sharedProps} />;
}

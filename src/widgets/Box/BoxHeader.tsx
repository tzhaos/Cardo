import { LayoutGrid, List, Lock, Minus, Package, Unlock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../domains/i18n/hooks/useI18n';
import { useUIStore } from '../../domains/ui/store/useUIStore';
import { getBoxDisplayTitle } from '../../domains/workspace/model/boxTitles';
import { cn } from '../../lib/utils';
import type { BoxData } from '../../types/box';
import BoxThemePicker from './BoxThemePicker';

interface BoxHeaderProps {
  data: BoxData;
  isHovering: boolean;
  showThemePicker: boolean;
  setShowThemePicker: (show: boolean) => void;
  onUpdate: (updates: Partial<BoxData>) => void;
  onMinimize: () => void;
  onClose: () => void;
  onDragStart: (event: React.PointerEvent) => void;
}

export default function BoxHeader({
  data,
  isHovering,
  showThemePicker,
  setShowThemePicker,
  onUpdate,
  onMinimize,
  onClose,
  onDragStart,
}: BoxHeaderProps) {
  const { t } = useI18n();
  const editorId = `box:${data.id}:title`;
  const editingSessionId = useUIStore((state) => state.editingSessionId);
  const setEditingSessionId = useUIStore((state) => state.setEditingSessionId);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayTitle = getBoxDisplayTitle(data);
  const [draftTitle, setDraftTitle] = useState(displayTitle);

  const isEditing = editingSessionId === editorId;
  const isInteractionLocked = Boolean(editingSessionId && editingSessionId !== editorId);

  useEffect(() => {
    if (!isEditing || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setDraftTitle(displayTitle);
  }, [displayTitle, isEditing]);

  useEffect(
    () => () => {
      const state = useUIStore.getState();

      if (state.editingSessionId === editorId) {
        state.setEditingSessionId(null);
      }
    },
    [editorId],
  );

  const finishEditing = (shouldSave: boolean) => {
    if (shouldSave) {
      const nextTitle = draftTitle.trim();

      if (nextTitle && nextTitle !== displayTitle) {
        onUpdate({ title: nextTitle, titleKey: null });
      }
    } else {
      setDraftTitle(displayTitle);
    }

    if (useUIStore.getState().editingSessionId === editorId) {
      setEditingSessionId(null);
    }
  };

  return (
    <div
      className={cn(
        'kb-box-header group flex h-10 shrink-0 select-none items-center justify-between border-b px-3',
        isEditing || isInteractionLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      )}
      onPointerDown={isEditing || isInteractionLocked ? undefined : onDragStart}
    >
      <div
        className="flex flex-1 items-center gap-2 overflow-hidden"
        onDoubleClick={(event) => {
          event.stopPropagation();

          if (isInteractionLocked) {
            return;
          }

          setDraftTitle(displayTitle);
          setEditingSessionId(editorId);
        }}
      >
        <Package size={14} className="kb-box-muted shrink-0" />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() => finishEditing(true)}
            onKeyDown={(event) => {
              event.stopPropagation();

              if (event.key === 'Enter') {
                finishEditing(true);
              }

              if (event.key === 'Escape') {
                finishEditing(false);
              }
            }}
            className="kb-box-input w-full truncate rounded-lg border px-2 py-1 text-sm font-medium outline-none transition-colors"
            onPointerDown={(event) => event.stopPropagation()}
            onPaste={(event) => event.stopPropagation()}
            onDragStart={(event) => event.stopPropagation()}
            onDrop={(event) => event.stopPropagation()}
          />
        ) : (
          <span className="kb-box-title pointer-events-none truncate px-1 text-sm font-medium">
            {displayTitle}
          </span>
        )}
      </div>

      <div
        className={cn(
          'flex shrink-0 items-center gap-1 transition-opacity duration-200',
          isInteractionLocked ? 'pointer-events-none opacity-0' : '',
          isEditing ? 'pointer-events-none opacity-20' : '',
          !isEditing && isHovering ? 'opacity-100' : !isEditing ? 'opacity-0' : '',
        )}
      >
        <BoxThemePicker
          showThemePicker={showThemePicker}
          setShowThemePicker={setShowThemePicker}
          onUpdate={(theme) => onUpdate({ theme })}
        />

        <button
          onClick={() => onUpdate({ layout: data.layout === 'grid' ? 'list' : 'grid' })}
          className="kb-icon-button rounded-md p-1.5 transition-colors"
          title={t('box.toggleLayout')}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {data.layout === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
        </button>

        <button
          onClick={() => onUpdate({ isLocked: !data.isLocked })}
          className="kb-icon-button rounded-md p-1.5 transition-colors"
          title={data.isLocked ? t('box.unlockPosition') : t('box.lockPosition')}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {data.isLocked ? <Lock size={14} className="text-red-400" /> : <Unlock size={14} />}
        </button>

        <div className="kb-list-divider mx-1 h-4 w-px" />

        <button
          onClick={onMinimize}
          className="kb-icon-button rounded-md p-1.5 transition-colors"
          title={t('box.minimize')}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Minus size={14} />
        </button>

        <button
          onClick={onClose}
          className="kb-icon-button kb-icon-button-danger rounded-md p-1.5 transition-colors"
          title={t('box.close')}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

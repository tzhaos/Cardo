import { X } from 'lucide-react';
import type { KeyboardEvent, ReactNode, RefObject, SyntheticEvent } from 'react';
import { cn } from '../../../lib/utils';

interface ItemDraftFormProps {
  rootRef?: RefObject<HTMLDivElement | null>;
  className?: string;
  headerLabel: ReactNode;
  titleInputRef?: RefObject<HTMLInputElement | null>;
  titleValue: string;
  titlePlaceholder: string;
  contentValue: string;
  contentPlaceholder: string;
  contentAsTextarea?: boolean;
  titleAutoFocus?: boolean;
  submitLabel: string;
  cancelLabel: string;
  saveDisabled?: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onEditorKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSave: (event?: SyntheticEvent) => void;
  onCancel: (event?: SyntheticEvent) => void;
}

export default function ItemDraftForm({
  rootRef,
  className,
  headerLabel,
  titleInputRef,
  titleValue,
  titlePlaceholder,
  contentValue,
  contentPlaceholder,
  contentAsTextarea = false,
  titleAutoFocus = false,
  submitLabel,
  cancelLabel,
  saveDisabled = false,
  onTitleChange,
  onContentChange,
  onEditorKeyDown,
  onSave,
  onCancel,
}: ItemDraftFormProps) {
  const stopInteraction = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      ref={rootRef}
      className={cn('kb-add-panel relative flex flex-col gap-2 rounded-2xl border p-2', className)}
      onClick={stopInteraction}
      onPointerDown={stopInteraction}
    >
      <div className="kb-subtle-text flex items-center justify-between px-1 text-xs">
        <span>{headerLabel}</span>
        <button onClick={onCancel} className="kb-secondary-button transition-colors" type="button">
          <X size={12} />
        </button>
      </div>

      <input
        ref={titleInputRef}
        autoFocus={titleAutoFocus}
        value={titleValue}
        onChange={(event) => onTitleChange(event.target.value)}
        onKeyDown={onEditorKeyDown}
        onPointerDown={stopInteraction}
        onPaste={stopInteraction}
        onDragStart={stopInteraction}
        onDrop={stopInteraction}
        className="kb-add-input w-full rounded-xl px-3 py-2 text-xs outline-none"
        placeholder={titlePlaceholder}
        aria-label={titlePlaceholder}
      />

      {contentAsTextarea ? (
        <textarea
          value={contentValue}
          onChange={(event) => onContentChange(event.target.value)}
          onKeyDown={onEditorKeyDown}
          onPointerDown={stopInteraction}
          onPaste={stopInteraction}
          onDragStart={stopInteraction}
          onDrop={stopInteraction}
          className="kb-add-input min-h-[96px] w-full resize-none rounded-xl px-3 py-2 text-xs outline-none"
          placeholder={contentPlaceholder}
          aria-label={contentPlaceholder}
        />
      ) : (
        <input
          value={contentValue}
          onChange={(event) => onContentChange(event.target.value)}
          onKeyDown={onEditorKeyDown}
          onPointerDown={stopInteraction}
          onPaste={stopInteraction}
          onDragStart={stopInteraction}
          onDrop={stopInteraction}
          className="kb-add-input w-full rounded-xl px-3 py-2 text-xs outline-none"
          placeholder={contentPlaceholder}
          aria-label={contentPlaceholder}
        />
      )}

      <div className="mt-1 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="kb-secondary-button rounded-full border px-3 py-1.5 text-xs transition-colors"
          type="button"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onSave}
          disabled={saveDisabled}
          className="kb-primary-button rounded-full px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
          type="button"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

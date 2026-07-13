import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEventHandler, MouseEventHandler } from 'react';

interface InlineRenameOptions {
  value: string;
  onCommit: (value: string) => void;
  allowEmpty?: boolean;
  ignoreOutsidePointer?: (target: EventTarget | null) => boolean;
}

export function useInlineRename({
  value,
  onCommit,
  allowEmpty = false,
  ignoreOutsidePointer,
}: InlineRenameOptions) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!renaming) setDraft(value);
  }, [renaming, value]);

  useLayoutEffect(() => {
    if (!renaming) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    const caretPosition = input.value.length;
    input.setSelectionRange(caretPosition, caretPosition);
  }, [renaming]);

  const start = useCallback(
    (initialValue = value) => {
      finishedRef.current = false;
      setDraft(initialValue);
      setRenaming(true);
    },
    [value],
  );

  const commit = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (allowEmpty || draft.trim()) {
      onCommit(draft);
    } else {
      setDraft(value);
    }
    setRenaming(false);
  }, [allowEmpty, draft, onCommit, value]);

  const cancel = useCallback(() => {
    finishedRef.current = true;
    setDraft(value);
    setRenaming(false);
  }, [value]);

  useEffect(() => {
    if (!renaming) return;

    const commitOnOutsidePointer = (event: PointerEvent) => {
      const input = inputRef.current;
      const target = event.target;
      if (input && target instanceof Node && input.contains(target)) return;
      if (ignoreOutsidePointer?.(target)) return;
      input?.blur();
    };

    window.addEventListener('pointerdown', commitOnOutsidePointer, true);
    return () => window.removeEventListener('pointerdown', commitOnOutsidePointer, true);
  }, [ignoreOutsidePointer, renaming]);

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  };
  const onContextMenu: MouseEventHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    renaming,
    draft,
    inputRef,
    setDraft,
    start,
    commit,
    cancel,
    onKeyDown,
    onContextMenu,
  };
}

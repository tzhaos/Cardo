import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import type { WorkspacePage } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';

interface TabPillProps {
  page: WorkspacePage;
  active: boolean;
  editing: boolean;
  canDelete: boolean;
  onActivate: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function TabPill({
  page,
  active,
  editing,
  canDelete,
  onActivate,
  onRename,
  onDelete,
}: TabPillProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  useEffect(() => setDraft(page.title), [page.title]);
  useEffect(() => {
    if (editing && renaming) {
      setDraft(page.title);
      setRenaming(false);
    }
  }, [editing, page.title, renaming]);
  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  const commitRename = () => {
    if (draft.trim()) {
      onRename(draft);
    }
    setRenaming(false);
  };

  return (
    <div
      className={`wbn-tab-pill${active ? ' wbn-tab-pill-active' : ''}${editing ? ' wbn-tab-pill-editing' : ''}${renaming ? ' wbn-tab-pill-renaming' : ''}`}
    >
      <button
        type="button"
        aria-label={page.title}
        onClick={onActivate}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!editing) {
            setRenaming(true);
          }
        }}
      >
        {active && !editing ? (
          <motion.span
            className="wbn-active-tab-indicator"
            layoutId="active-tab-indicator"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        ) : null}
        <span>{page.title}</span>
        {editing && canDelete ? (
          <span
            className="wbn-tab-delete"
            role="button"
            tabIndex={0}
            aria-label={t('page.delete', { title: page.title })}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <X size={14} />
          </span>
        ) : null}
      </button>
      {renaming ? (
        <div className="wbn-tab-rename-layer">
          <input
            ref={inputRef}
            className="wbn-inline-rename wbn-tab-rename-input"
            aria-label={t('page.rename', { title: page.title })}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commitRename();
              }
              if (event.key === 'Escape') {
                setDraft(page.title);
                setRenaming(false);
              }
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

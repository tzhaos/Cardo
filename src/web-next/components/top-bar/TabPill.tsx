import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { WorkspacePage } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';

interface TabPillProps {
  page: WorkspacePage;
  active: boolean;
  icon?: ReactNode;
  systemPage?: boolean;
  renameRequested?: boolean;
  onActivate: () => void;
  onRename: (title: string) => void;
  onRenameRequestHandled?: () => void;
}

export function TabPill({
  page,
  active,
  icon,
  systemPage = false,
  renameRequested = false,
  onActivate,
  onRename,
  onRenameRequestHandled,
}: TabPillProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  useEffect(() => setDraft(page.title), [page.title]);
  useEffect(() => {
    if (!renameRequested || systemPage) return;
    setDraft(page.title);
    setRenaming(true);
    onRenameRequestHandled?.();
  }, [onRenameRequestHandled, page.title, renameRequested, systemPage]);
  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  const commitRename = () => {
    if (draft.trim()) onRename(draft);
    setRenaming(false);
  };

  return (
    <motion.div
      layout="position"
      transition={{ layout: { type: 'spring', stiffness: 500, damping: 40, mass: 0.68 } }}
      className={`wbn-tab-pill${active ? ' wbn-tab-pill-active' : ''}${renaming ? ' wbn-tab-pill-renaming' : ''}${systemPage ? ' wbn-tab-pill-system' : ''}`}
    >
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        title={systemPage ? page.title : undefined}
        aria-label={page.title}
        onClick={onActivate}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!systemPage) setRenaming(true);
        }}
      >
        <AnimatePresence initial={false}>
          {active ? (
            <motion.span
              className="wbn-active-tab-indicator"
              layoutId="active-tab-indicator"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', bounce: 0.16, duration: 0.52 }}
            />
          ) : null}
        </AnimatePresence>
        <span className="wbn-tab-label">{icon ?? page.title}</span>
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
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                setDraft(page.title);
                setRenaming(false);
              }
            }}
          />
        </div>
      ) : null}
    </motion.div>
  );
}

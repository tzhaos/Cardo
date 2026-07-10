import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { WorkspacePage } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';

interface TabPillProps {
  page: WorkspacePage;
  active: boolean;
  defaultPage: boolean;
  editing: boolean;
  canDelete: boolean;
  icon?: ReactNode;
  systemPage?: boolean;
  onActivate: () => void;
  onSetDefault: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function TabPill({
  page,
  active,
  defaultPage,
  editing,
  canDelete,
  icon,
  systemPage = false,
  onActivate,
  onSetDefault,
  onRename,
  onDelete,
}: TabPillProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const editable = editing && !systemPage;

  useEffect(() => setDraft(page.title), [page.title]);
  useEffect(() => {
    if (editable && renaming) {
      setDraft(page.title);
      setRenaming(false);
    }
  }, [editable, page.title, renaming]);
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
    <motion.div
      layout="position"
      transition={{ layout: { type: 'spring', stiffness: 500, damping: 40, mass: 0.68 } }}
      className={`wbn-tab-pill${active ? ' wbn-tab-pill-active' : ''}${defaultPage ? ' wbn-tab-pill-default' : ''}${editable ? ' wbn-tab-pill-editing' : ''}${renaming ? ' wbn-tab-pill-renaming' : ''}${systemPage ? ' wbn-tab-pill-system' : ''}`}
    >
      <button
        type="button"
        aria-current={!editable && active ? 'page' : undefined}
        title={systemPage ? page.title : undefined}
        aria-label={
          systemPage
            ? page.title
            : editable
              ? t('page.setDefault', { title: page.title })
              : defaultPage
                ? `${page.title}, ${t('page.default')}`
                : page.title
        }
        aria-pressed={editable ? defaultPage : undefined}
        onClick={editable ? onSetDefault : onActivate}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!editable && !systemPage) {
            setRenaming(true);
          }
        }}
      >
        <AnimatePresence initial={false}>
          {active && !editable ? (
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
        <span className="wbn-tab-label">
          {icon ?? page.title}
          <AnimatePresence initial={false}>
            {editable && defaultPage ? (
              <motion.span
                aria-hidden="true"
                className="wbn-default-page-indicator"
                layoutId="default-page-indicator"
                initial={{ opacity: 0, scaleX: 0.35, y: -2 }}
                animate={{ opacity: 1, scaleX: 1, y: 0 }}
                exit={{ opacity: 0, scaleX: 0.35, y: -2 }}
                transition={{ type: 'spring', stiffness: 520, damping: 34, mass: 0.55 }}
              />
            ) : null}
          </AnimatePresence>
        </span>
        <AnimatePresence initial={false}>
          {editable && canDelete ? (
            <motion.span
              className="wbn-tab-delete wbn-icon-frame"
              role="button"
              tabIndex={0}
              aria-label={t('page.delete', { title: page.title })}
              initial={{ width: 0, marginRight: 0, opacity: 0, scale: 0.64 }}
              animate={{ width: 20, marginRight: 8, opacity: 1, scale: 1 }}
              exit={{ width: 0, marginRight: 0, opacity: 0, scale: 0.64 }}
              transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.62 }}
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              <X size={14} />
            </motion.span>
          ) : null}
        </AnimatePresence>
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
    </motion.div>
  );
}

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { WorkspacePage } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { useInlineRename } from '../../app/useInlineRename';

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
  const { t } = useI18n();
  const rename = useInlineRename({
    value: page.title,
    onCommit: onRename,
    ignoreOutsidePointer: isTopBarTarget,
  });

  useEffect(() => {
    if (!renameRequested || systemPage) return;
    rename.start();
    onRenameRequestHandled?.();
  }, [onRenameRequestHandled, rename.start, renameRequested, systemPage]);

  return (
    <motion.div
      layout="position"
      transition={{ layout: { type: 'spring', stiffness: 500, damping: 40, mass: 0.68 } }}
      className={`wbn-tab-pill${active ? ' wbn-tab-pill-active' : ''}${rename.renaming ? ' wbn-tab-pill-renaming' : ''}${systemPage ? ' wbn-tab-pill-system' : ''}`}
    >
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        title={systemPage ? page.title : undefined}
        aria-label={page.title}
        onClick={onActivate}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!systemPage) rename.start();
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
      {rename.renaming ? (
        <div className="wbn-tab-rename-layer" onContextMenu={rename.onContextMenu}>
          <input
            ref={rename.inputRef}
            className="wbn-inline-rename wbn-tab-rename-input"
            aria-label={t('page.rename', { title: page.title })}
            value={rename.draft}
            onChange={(event) => rename.setDraft(event.target.value)}
            onBlur={rename.commit}
            onKeyDown={rename.onKeyDown}
            onContextMenu={rename.onContextMenu}
          />
        </div>
      ) : null}
    </motion.div>
  );
}

function isTopBarTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('[data-top-bar]'));
}

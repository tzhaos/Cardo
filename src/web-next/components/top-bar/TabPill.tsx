import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { WorkspacePage } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import { useI18n } from '../../i18n/useI18n';
import { useInlineRename } from '../../app/useInlineRename';
import { Input } from '../../ui/primitives/input';
import { Button } from '../../ui/primitives/button';

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
  // Cross-page box drag flips activePageId every frame of hover. Shared layoutId
  // springs lag the pointer and fight the compact box drag visual — disable morph.
  const boxDragActive = useUiStore((state) => Boolean(state.draggedBoxId));
  const rename = useInlineRename({
    value: page.title,
    onCommit: onRename,
    ignoreOutsidePointer: isTopBarTarget,
  });
  const startRenaming = rename.start;

  useEffect(() => {
    if (!renameRequested || systemPage) return;
    startRenaming();
    onRenameRequestHandled?.();
  }, [onRenameRequestHandled, renameRequested, startRenaming, systemPage]);

  return (
    <motion.div
      layout={boxDragActive ? false : 'position'}
      transition={{ layout: { type: 'spring', stiffness: 500, damping: 40, mass: 0.68 } }}
      className={`wbn-tab-pill${active ? ' wbn-tab-pill-active' : ''}${rename.renaming ? ' wbn-tab-pill-renaming' : ''}${systemPage ? ' wbn-tab-pill-system' : ''}`}
    >
      <Button
        variant="ghost"
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
              // No shared-element morph while a box is dragged across page tabs.
              layoutId={boxDragActive ? undefined : 'active-tab-indicator'}
              initial={boxDragActive ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={boxDragActive ? undefined : { opacity: 0, scale: 0.96 }}
              transition={
                boxDragActive
                  ? { duration: 0 }
                  : { type: 'spring', bounce: 0.16, duration: 0.52 }
              }
            />
          ) : null}
        </AnimatePresence>
        <span className="wbn-tab-label">{icon ?? page.title}</span>
      </Button>
      {rename.renaming ? (
        <div className="wbn-tab-rename-layer" onContextMenu={rename.onContextMenu}>
          <Input
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

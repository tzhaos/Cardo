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
  // Cross-page box drag flips the active page every hover. Keep shared layoutId
  // so one indicator element moves, but snap with duration 0 (no spring lag).
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
      layout="position"
      transition={{
        layout: boxDragActive
          ? { type: 'tween', duration: 0 }
          : { type: 'spring', stiffness: 500, damping: 40, mass: 0.68 },
      }}
      className={`cardo-tab-pill${active ? ' cardo-tab-pill-active' : ''}${rename.renaming ? ' cardo-tab-pill-renaming' : ''}${systemPage ? ' cardo-tab-pill-system' : ''}`}
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
              className="cardo-active-tab-indicator"
              layoutId="active-tab-indicator"
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              exit={boxDragActive ? undefined : { opacity: 0, scale: 0.96 }}
              transition={
                boxDragActive
                  ? { type: 'tween', duration: 0 }
                  : { type: 'spring', bounce: 0.16, duration: 0.52 }
              }
            />
          ) : null}
        </AnimatePresence>
        <span className="cardo-tab-label">{icon ?? page.title}</span>
      </Button>
      {rename.renaming ? (
        <div className="cardo-tab-rename-layer" onContextMenu={rename.onContextMenu}>
          <Input
            ref={rename.inputRef}
            className="cardo-inline-rename cardo-tab-rename-input"
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

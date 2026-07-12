import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { animate as animateMotion, motion, useMotionValue, useSpring } from 'motion/react';
import type { MotionStyle } from 'motion/react';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { getPageDropElement, registerBoxElement } from '../../app/interactionElementRegistry';
import { useInlineRename } from '../../app/useInlineRename';
import {
  constrainBoxFrameToCanvas,
  constrainBoxResizeToCanvas,
  createCanvasWorldBounds,
} from '../../domain/canvasGeometry';
import {
  RECYCLE_BIN_PAGE_ID,
  isRecycleBinPageId,
  type WorkspaceBox,
  type WorkspaceBoxIcon,
} from '../../domain/workspace';
import {
  startWindowPointerSession,
  type WindowPointerSession,
} from '../../app/windowPointerSession';
import { useI18n } from '../../i18n/useI18n';
import { useFeatureEnabled } from '../../shell/FeatureGate';
import { useContextMenu } from '../../ui/cardo/context-menu';
import { ThemeIcon } from '../../ui/icons/ThemeIcon';
import { Input } from '../../ui/primitives/input';
import { Button } from '../../ui/primitives/button';
import { MotionButton } from '../../ui/primitives/motion-button';
import { BoxAppearanceView } from './BoxAppearancePopover';

/** Motion borderRadius must be numeric per theme dialect. */
const BOX_CORNER_RADIUS = {
  classic: { idle: 16, compact: 24 },
  fluent: { idle: 6, compact: 8 },
  material: { idle: 16, compact: 20 },
  glass: { idle: 22, compact: 26 },
  swiftui: { idle: 14, compact: 18 },
} as const;

interface BaseBoxFrameProps {
  box: WorkspaceBox;
  icon: ReactNode;
  iconId: WorkspaceBoxIcon;
  accent: string;
  children: ReactNode;
  onAddItem: () => void;
  skipEntryAnimation?: boolean;
}

interface BoxDeleteMotion {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  /**
   * Pixel radius for Motion interpolation (numbers only — CSS vars are unreliable
   * in animate.borderRadius and pill radii become circles at compact cross-page scale).
   */
  borderRadius: number;
  permanent: boolean;
}

export function BaseBoxFrame({
  box,
  icon,
  iconId,
  accent,
  children,
  onAddItem,
  skipEntryAnimation = false,
}: BaseBoxFrameProps) {
  const updateBoxFrame = useWorkspaceStore((state) => state.updateBoxFrame);
  const renameBox = useWorkspaceStore((state) => state.renameBox);
  const promoteTemporaryBox = useWorkspaceStore((state) => state.promoteTemporaryBox);
  const setBoxDetailMode = useWorkspaceStore((state) => state.setBoxDetailMode);
  const setBoxLocked = useWorkspaceStore((state) => state.setBoxLocked);
  const setBoxViewMode = useWorkspaceStore((state) => state.setBoxViewMode);
  const deleteBox = useWorkspaceStore((state) => state.deleteBox);
  const addBoxToCollection = useWorkspaceStore((state) => state.addBoxToCollection);
  const removeBoxFromCollection = useWorkspaceStore((state) => state.removeBoxFromCollection);
  const beginBoxDrag = useUiStore((state) => state.beginBoxDrag);
  const updateBoxDragFrame = useUiStore((state) => state.updateBoxDragFrame);
  const endBoxDrag = useUiStore((state) => state.endBoxDrag);
  const clearPendingBoxLanding = useUiStore((state) => state.clearPendingBoxLanding);
  // Per-box booleans avoid all boxes re-rendering when another box's drag session updates.
  const isDraggingThisBox = useUiStore((state) => state.draggedBoxId === box.id);
  const boxDragSession = useUiStore((state) =>
    state.draggedBoxId === box.id ? state.boxDragSession : null,
  );
  const pendingBoxLanding = useUiStore((state) =>
    state.pendingBoxLanding?.boxId === box.id ? state.pendingBoxLanding : null,
  );
  const boxDragOverTopBar = useUiStore((state) =>
    state.draggedBoxId === box.id ? state.boxDragOverTopBar : false,
  );
  const boxDropPageId = useUiStore((state) =>
    state.draggedBoxId === box.id ? state.boxDropPageId : null,
  );
  const selectedBoxId = useUiStore((state) => state.selectedBoxId);
  const highlightedBoxId = useUiStore((state) => state.highlightedBoxId);
  const selectBox = useUiStore((state) => state.selectBox);
  const addViewState = useUiStore((state) => state.addDrafts[box.id]);
  const closeAddView = useUiStore((state) => state.closeAddView);
  const contextMenu = useContextMenu();
  const appearanceEnabled = useFeatureEnabled('box.appearancePopover');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [appearanceView, setAppearanceView] = useState(false);
  const [deleteMotion, setDeleteMotion] = useState<BoxDeleteMotion | null>(null);
  const [dragTransformOrigin, setDragTransformOrigin] = useState('50% 50%');
  const articleRef = useRef<HTMLElement>(null);
  const setArticleElement = useCallback(
    (element: HTMLElement | null) => {
      articleRef.current = element;
      registerBoxElement(box.id, element);
    },
    [box.id],
  );
  const pointerSessionRef = useRef<WindowPointerSession | null>(null);
  const deleteTargetRef = useRef<HTMLElement | null>(null);
  const deleteCommittedRef = useRef(false);
  const holdVisualUntilLandingRef = useRef(false);
  const boxLeft = useMotionValue(box.frame.x);
  const boxTop = useMotionValue(box.frame.y);
  const boxWidth = useMotionValue(box.frame.width);
  const boxHeight = useMotionValue(box.frame.height);
  const dragTiltTarget = useMotionValue(0);
  // Overdamped so fling release does not wobble the box.
  const dragTilt = useSpring(dragTiltTarget, { stiffness: 380, damping: 42, mass: 0.4 });
  const { t } = useI18n();
  const titleRename = useInlineRename({
    value: box.title,
    onCommit: (title) => renameBox(box.id, title),
  });

  const attachDragPointerSession = useCallback(
    (session: {
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startFrame: (typeof box)['frame'];
      latestFrame?: (typeof box)['frame'];
      transformOrigin: string;
    }) => {
      pointerSessionRef.current?.dispose();
      setDragTransformOrigin(session.transformOrigin);
      // Prefer latestFrame so page-transfer rebases do not flash the pre-switch coords.
      const initialFrame = session.latestFrame ?? session.startFrame;
      // Fixed-layer visual from transform origin — stable across remount into drag layer.
      const originTokens = session.transformOrigin.trim().split(/\s+/);
      const originXPct = Number.parseFloat(originTokens[0] ?? '50') || 50;
      const originYPct = Number.parseFloat(originTokens[1] ?? '50') || 50;
      const grabOffsetX = (initialFrame.width * originXPct) / 100;
      const grabOffsetY = (initialFrame.height * originYPct) / 100;
      boxLeft.set(session.startClientX - grabOffsetX);
      boxTop.set(session.startClientY - grabOffsetY);
      let latestFrame = initialFrame;
      const pointerSession = startWindowPointerSession({
        pointerId: session.pointerId,
        onMove: (moveEvent) => {
          const activeSession = useUiStore.getState().boxDragSession;
          const baseFrame = activeSession?.startFrame ?? session.startFrame;
          const baseClientX = activeSession?.startClientX ?? session.startClientX;
          const baseClientY = activeSession?.startClientY ?? session.startClientY;
          dragTiltTarget.set(
            Math.max(-2.2, Math.min(2.2, (moveEvent.clientX - baseClientX) / 180)),
          );
          latestFrame = constrainBoxFrameToCanvas(
            {
              ...baseFrame,
              x: Math.round(baseFrame.x + moveEvent.clientX - baseClientX),
              y: Math.round(baseFrame.y + moveEvent.clientY - baseClientY),
            },
            createCanvasWorldBounds(useCanvasStore.getState().viewportSize),
          );
          // Client/fixed position — independent of page-scene slide and camera pan.
          boxLeft.set(moveEvent.clientX - grabOffsetX);
          boxTop.set(moveEvent.clientY - grabOffsetY);
          updateBoxDragFrame(latestFrame);
        },
        onEnd: () => {
          dragTiltTarget.set(0);
          // Hold world-space frame for remount into the page scene + landing.
          holdVisualUntilLandingRef.current = true;
          boxLeft.set(latestFrame.x);
          boxTop.set(latestFrame.y);
          if (pointerSessionRef.current === pointerSession) {
            pointerSessionRef.current = null;
          }
        },
      });
      pointerSessionRef.current = pointerSession;
    },
    [boxLeft, boxTop, dragTiltTarget, updateBoxDragFrame],
  );

  useEffect(
    () => () => {
      // Dispose listeners only — do not end the drag. Cross-page hover remounts this box.
      pointerSessionRef.current?.dispose();
      pointerSessionRef.current = null;
      deleteTargetRef.current?.classList.remove('cardo-box-drop-target');
    },
    [],
  );

  useLayoutEffect(() => {
    if (!isDraggingThisBox || !boxDragSession || pointerSessionRef.current) return;
    attachDragPointerSession(boxDragSession);
  }, [attachDragPointerSession, box.id, box.pageId, boxDragSession, isDraggingThisBox]);

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (box.isLocked) {
      return;
    }

    if ((event.target as HTMLElement).closest('button,input,textarea,select,[data-no-drag]')) {
      return;
    }

    event.preventDefault();
    setAppearanceView(false);
    contextMenu.closeMenu();
    pointerSessionRef.current?.dispose();
    const boxElement = event.currentTarget.closest<HTMLElement>('[data-canvas-box]');
    const boxRect = boxElement?.getBoundingClientRect();
    let transformOrigin = '50% 50%';
    if (boxRect) {
      const originX = Math.max(
        0,
        Math.min(100, ((event.clientX - boxRect.left) / boxRect.width) * 100),
      );
      const originY = Math.max(
        0,
        Math.min(100, ((event.clientY - boxRect.top) / boxRect.height) * 100),
      );
      transformOrigin = `${originX}% ${originY}%`;
    }
    const session = {
      boxId: box.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startFrame: box.frame,
      latestFrame: box.frame,
      transformOrigin,
    };
    beginBoxDrag(session);
    attachDragPointerSession(session);
  };

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (box.isLocked) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    contextMenu.closeMenu();
    pointerSessionRef.current?.end();
    const startX = event.clientX;
    const startY = event.clientY;
    const startFrame = box.frame;
    let latestFrame = startFrame;
    const session = startWindowPointerSession({
      pointerId: event.pointerId,
      onMove: (moveEvent) => {
        latestFrame = constrainBoxResizeToCanvas(
          {
            ...startFrame,
            width: Math.max(240, Math.round(startFrame.width + moveEvent.clientX - startX)),
            height: Math.max(170, Math.round(startFrame.height + moveEvent.clientY - startY)),
          },
          createCanvasWorldBounds(useCanvasStore.getState().viewportSize),
          { width: 240, height: 170 },
        );
        boxWidth.set(latestFrame.width);
        boxHeight.set(latestFrame.height);
      },
      onEnd: () => {
        updateBoxFrame(box.id, latestFrame);
        if (pointerSessionRef.current === session) {
          pointerSessionRef.current = null;
        }
      },
    });
    pointerSessionRef.current = session;
  };

  const dragging = isDraggingThisBox;
  const draggingOverTopBar = dragging && boxDragOverTopBar;
  const draggingOverTab = draggingOverTopBar && boxDropPageId !== null;
  // Mini-card footprint while over page tabs (~160×100 target), not a circle.
  const compactScale = Math.max(0.28, Math.min(0.5, 160 / box.frame.width, 100 / box.frame.height));
  const isInRecycleBin = isRecycleBinPageId(box.pageId);
  const isCollected = useWorkspaceStore((state) =>
    state.projection.collectionBoxIds.includes(box.id),
  );
  const isTemporary = box.kind === 'temporary';
  const viewMode = isTemporary ? 'list' : box.viewMode;
  const detailMode = isTemporary ? 'detailed' : box.detailMode;
  const themeId = usePreferencesStore((state) => state.themeId);
  const cornerRadiusSteps =
    themeId === 'fluent'
      ? BOX_CORNER_RADIUS.fluent
      : themeId === 'material'
        ? BOX_CORNER_RADIUS.material
        : themeId === 'glass'
          ? BOX_CORNER_RADIUS.glass
          : themeId === 'swiftui'
            ? BOX_CORNER_RADIUS.swiftui
            : BOX_CORNER_RADIUS.classic;
  // Classic: soft 16/24. Fluent: restrained 6/8 (matches --cardo-box-radius).
  const boxCornerRadius = draggingOverTopBar ? cornerRadiusSteps.compact : cornerRadiusSteps.idle;
  const visualScale = draggingOverTopBar
    ? compactScale * (draggingOverTab ? 0.9 : 1)
    : dragging
      ? 1.028
      : 1;
  const visualClassName = [
    'cardo-box',
    dragging || deleteMotion ? 'cardo-box-dragging' : '',
    draggingOverTopBar || (deleteMotion && !deleteMotion.permanent) ? 'cardo-box-dragging-bar' : '',
    draggingOverTab || (deleteMotion && !deleteMotion.permanent) ? 'cardo-box-dragging-tab' : '',
    deleteMotion ? 'cardo-box-delete-exiting' : '',
    selectedBoxId === box.id ? 'cardo-box-selected' : '',
    highlightedBoxId === box.id ? 'cardo-box-highlighted' : '',
    detailMode === 'compact' ? 'cardo-box-compact' : '',
    box.isLocked ? 'cardo-box-locked' : '',
    isTemporary ? 'cardo-box-temporary' : '',
    addViewState?.mode || (appearanceEnabled && appearanceView) || confirmDelete
      ? 'cardo-box-local-view'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    boxWidth.set(box.frame.width);
    boxHeight.set(box.frame.height);
    if (dragging) {
      return;
    }

    const projectedFrame = {
      x: box.frame.x,
      y: box.frame.y,
      width: box.frame.width,
      height: box.frame.height,
    };
    const targetFrame = pendingBoxLanding?.frame ?? projectedFrame;

    // After release, ignore stale projection snapshots (old page / old frame)
    // until the adaptive landing intent is available or projection matches visual.
    if (holdVisualUntilLandingRef.current) {
      const visualMatchesProjection =
        Math.abs(projectedFrame.x - boxLeft.get()) < 2 &&
        Math.abs(projectedFrame.y - boxTop.get()) < 2;
      if (pendingBoxLanding) {
        holdVisualUntilLandingRef.current = false;
      } else if (visualMatchesProjection) {
        holdVisualUntilLandingRef.current = false;
        boxLeft.set(projectedFrame.x);
        boxTop.set(projectedFrame.y);
        return;
      } else {
        return;
      }
    }

    const deltaX = Math.abs(boxLeft.get() - targetFrame.x);
    const deltaY = Math.abs(boxTop.get() - targetFrame.y);
    // Snap tiny deltas (same-spot drop / server echo). Animate only real moves
    // (cross-page tab place or pull-in from off-screen).
    if (deltaX < 2 && deltaY < 2) {
      boxLeft.set(targetFrame.x);
      boxTop.set(targetFrame.y);
      if (pendingBoxLanding) clearPendingBoxLanding(box.id);
      return;
    }

    if (!pendingBoxLanding) {
      // Projection caught up without a landing intent — hard snap, no bounce.
      boxLeft.set(targetFrame.x);
      boxTop.set(targetFrame.y);
      return;
    }

    // Distance-aware landing: short hops stay snappy, cross-page tab place takes longer.
    const travel = Math.hypot(deltaX, deltaY);
    const duration = Math.min(0.78, Math.max(0.48, 0.36 + travel / 1100));
    const positionTransition = {
      type: 'tween' as const,
      duration,
      ease: [0.22, 0.82, 0.2, 1] as const,
    };
    const leftAnimation = animateMotion(boxLeft, targetFrame.x, positionTransition);
    const topAnimation = animateMotion(boxTop, targetFrame.y, positionTransition);
    void leftAnimation.then(() => {
      clearPendingBoxLanding(box.id);
    });
    return () => {
      leftAnimation.stop();
      topAnimation.stop();
    };
  }, [
    box.frame.height,
    box.frame.width,
    box.frame.x,
    box.frame.y,
    box.id,
    boxHeight,
    boxLeft,
    boxTop,
    boxWidth,
    clearPendingBoxLanding,
    dragging,
    pendingBoxLanding,
  ]);

  const startDeleteMotion = () => {
    if (deleteMotion || deleteCommittedRef.current) return;

    pointerSessionRef.current?.end();
    endBoxDrag();
    const boxRect = articleRef.current?.getBoundingClientRect();
    if (isInRecycleBin || !boxRect) {
      setDeleteMotion({
        x: 0,
        y: 8,
        scale: 0.82,
        opacity: 0,
        borderRadius: cornerRadiusSteps.idle,
        permanent: true,
      });
      return;
    }

    const target = getPageDropElement(RECYCLE_BIN_PAGE_ID);
    const targetRect = target?.getBoundingClientRect();
    if (target) {
      deleteTargetRef.current = target;
      target.classList.add('cardo-box-drop-target');
    }
    setDeleteMotion({
      x: targetRect
        ? targetRect.left + targetRect.width / 2 - (boxRect.left + boxRect.width / 2)
        : 0,
      y: targetRect
        ? targetRect.top + targetRect.height / 2 - (boxRect.top + boxRect.height / 2)
        : 8,
      scale: compactScale * 0.9,
      opacity: targetRect ? 0.18 : 0,
      borderRadius: cornerRadiusSteps.compact,
      permanent: false,
    });
  };

  const finishDeleteMotion = () => {
    if (!deleteMotion || deleteCommittedRef.current) return;

    deleteCommittedRef.current = true;
    const target = deleteTargetRef.current;
    deleteTargetRef.current = null;
    if (target) {
      target.classList.remove('cardo-box-drop-target');
      target.classList.add('cardo-box-drop-released');
      window.setTimeout(() => target.classList.remove('cardo-box-drop-released'), 560);
    }
    deleteBox(box.id);
  };

  return (
    <motion.article
      ref={setArticleElement}
      className={visualClassName}
      data-canvas-box
      data-box-id={box.id}
      initial={skipEntryAnimation ? false : { scale: 0.8, opacity: 0 }}
      animate={{
        x: deleteMotion?.x ?? 0,
        y: deleteMotion?.y ?? (dragging && !draggingOverTopBar ? -7 : 0),
        scale: deleteMotion?.scale ?? visualScale,
        opacity: deleteMotion?.opacity ?? (draggingOverTopBar ? 0.94 : dragging ? 0.97 : 1),
        // Numbers only for Motion. Cross-page uses 24px (mini card), never pill/circle.
        borderRadius: deleteMotion?.borderRadius ?? boxCornerRadius,
      }}
      transition={
        deleteMotion
          ? deleteMotion.permanent
            ? { duration: 0.24, ease: [0.4, 0, 1, 1] }
            : { duration: 0.52, ease: [0.22, 0.72, 0.18, 1] }
          : dragging
            ? {
                // Follow pointer / tab chrome — slightly slower shrink into mini-card.
                y: { type: 'tween', duration: 0.2, ease: [0.2, 0.8, 0.2, 1] },
                scale: { type: 'tween', duration: 0.24, ease: [0.2, 0.8, 0.2, 1] },
                borderRadius: { duration: 0.2 },
                opacity: { duration: 0.16 },
              }
            : {
                // Match landing pace after tab release (compact → full size).
                y: {
                  type: 'tween',
                  duration: pendingBoxLanding ? 0.58 : 0.2,
                  ease: [0.22, 0.82, 0.2, 1],
                },
                scale: {
                  type: 'tween',
                  duration: pendingBoxLanding ? 0.62 : 0.2,
                  ease: [0.22, 0.82, 0.2, 1],
                },
                borderRadius: { duration: pendingBoxLanding ? 0.5 : 0.18 },
                opacity: { duration: pendingBoxLanding ? 0.42 : 0.14 },
              }
      }
      onAnimationComplete={finishDeleteMotion}
      onPointerDown={() => selectBox(box.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        if (titleRename.renaming) {
          event.stopPropagation();
          return;
        }
        setAppearanceView(false);
        selectBox(box.id);
        if (isTemporary) {
          contextMenu.closeMenu();
          return;
        }
        contextMenu.openMenu(event.clientX, event.clientY, [
          {
            id: 'rename',
            label: t('menu.rename'),
            icon: <ThemeIcon name="edit" size={16} />,
            onSelect: () => titleRename.start(),
          },
          {
            id: 'add',
            label: t('menu.addItem'),
            icon: <ThemeIcon name="add" size={16} />,
            onSelect: () => {
              setConfirmDelete(false);
              onAddItem();
            },
          },
          {
            id: 'lock',
            label: t(box.isLocked ? 'menu.unlockBox' : 'menu.lockBox'),
            icon: box.isLocked ? (
              <ThemeIcon name="unlock" size={16} />
            ) : (
              <ThemeIcon name="lock" size={16} />
            ),
            onSelect: () => setBoxLocked(box.id, !box.isLocked),
          },
          ...(!isInRecycleBin
            ? [
                {
                  id: 'collection',
                  label: t(isCollected ? 'menu.removeFromCollection' : 'menu.addToCollection'),
                  icon: isCollected ? (
                    <ThemeIcon name="starOff" size={16} />
                  ) : (
                    <ThemeIcon name="star" size={16} />
                  ),
                  onSelect: () =>
                    isCollected ? removeBoxFromCollection(box.id) : addBoxToCollection(box.id),
                },
              ]
            : []),
          {
            id: 'delete',
            label: t(isInRecycleBin ? 'menu.deletePermanently' : 'menu.moveToRecycleBin'),
            icon: <ThemeIcon name="trash" size={16} />,
            danger: true,
            onSelect: () => setConfirmDelete(true),
          },
        ]);
      }}
      style={
        {
          left: boxLeft,
          top: boxTop,
          width: boxWidth,
          height: boxHeight,
          minWidth: 240,
          minHeight: 170,
          rotate: dragTilt,
          transformOrigin: deleteMotion ? '50% 50%' : dragTransformOrigin,
          pointerEvents: deleteMotion ? 'none' : undefined,
          '--box-accent': accent,
        } as MotionStyle & { '--box-accent': string }
      }
    >
      {isTemporary ? (
        <header className="cardo-temporary-box-header" onPointerDown={beginDrag}>
          <span className="cardo-temporary-box-grip" aria-hidden="true" />
          <Button
            type="button"
            data-no-drag
            onClick={() => {
              const title = t('box.collectedItems');
              promoteTemporaryBox(box.id, title);
              titleRename.start(title);
            }}
            title={t('box.promote')}
            aria-label={t('box.promote')}
          >
            <ThemeIcon name="packageCheck" size={15} />
            <span>{t('box.keep')}</span>
          </Button>
        </header>
      ) : (
        <header className="cardo-box-header" onPointerDown={beginDrag}>
          <div className="cardo-box-title-group">
            <Button
              variant="ghost"
              className="cardo-box-icon cardo-icon-frame"
              type="button"
              data-no-drag
              title={appearanceEnabled ? t('box.changePreset') : box.title}
              aria-label={appearanceEnabled ? t('box.changePreset') : box.title}
              aria-pressed={appearanceEnabled ? appearanceView : undefined}
              disabled={!appearanceEnabled}
              onClick={() => {
                if (!appearanceEnabled) return;
                contextMenu.closeMenu();
                setConfirmDelete(false);
                closeAddView(box.id);
                setAppearanceView((current) => !current);
              }}
            >
              {icon}
            </Button>
            {titleRename.renaming ? (
              <Input
                ref={titleRename.inputRef}
                className="cardo-inline-rename cardo-box-title-input"
                aria-label={t('box.rename', { title: box.title })}
                value={titleRename.draft}
                onChange={(event) => titleRename.setDraft(event.target.value)}
                onBlur={titleRename.commit}
                onKeyDown={titleRename.onKeyDown}
                onContextMenu={titleRename.onContextMenu}
              />
            ) : (
              <span
                className="cardo-box-title"
                data-no-drag
                onDoubleClick={() => titleRename.start()}
              >
                {box.title}
              </span>
            )}
          </div>
          <div className="cardo-box-controls">
            <MotionButton
              variant="icon"
              className="cardo-box-view-toggle cardo-box-lock-toggle cardo-icon-button"
              type="button"
              data-no-drag
              onClick={() => setBoxLocked(box.id, !box.isLocked)}
              aria-label={t(box.isLocked ? 'box.unlock' : 'box.lock')}
              aria-pressed={Boolean(box.isLocked)}
              title={t(box.isLocked ? 'box.unlock' : 'box.lock')}
            >
              {box.isLocked ? (
                <ThemeIcon name="lock" size={15} />
              ) : (
                <ThemeIcon name="unlock" size={15} />
              )}
            </MotionButton>
            <MotionButton
              variant="icon"
              className="cardo-box-view-toggle cardo-icon-button"
              type="button"
              data-no-drag
              onClick={() =>
                setBoxDetailMode(box.id, detailMode === 'detailed' ? 'compact' : 'detailed')
              }
              aria-label={t(
                detailMode === 'detailed' ? 'box.switchToCompact' : 'box.switchToDetailed',
              )}
              aria-pressed={detailMode === 'compact'}
              title={t(detailMode === 'detailed' ? 'box.switchToCompact' : 'box.switchToDetailed')}
            >
              {detailMode === 'detailed' ? (
                <ThemeIcon name="collapse" size={15} />
              ) : (
                <ThemeIcon name="expand" size={15} />
              )}
            </MotionButton>
            <MotionButton
              variant="icon"
              className="cardo-box-view-toggle cardo-icon-button"
              type="button"
              data-no-drag
              onClick={() => setBoxViewMode(box.id, viewMode === 'list' ? 'grid' : 'list')}
              aria-label={t(viewMode === 'list' ? 'box.switchToGrid' : 'box.switchToList')}
              aria-pressed={viewMode === 'grid'}
              title={t(viewMode === 'list' ? 'box.switchToGrid' : 'box.switchToList')}
            >
              {viewMode === 'list' ? (
                <ThemeIcon name="layoutGrid" size={15} />
              ) : (
                <ThemeIcon name="list" size={15} />
              )}
            </MotionButton>
            <MotionButton
              variant="icon"
              className="cardo-box-delete cardo-icon-button"
              type="button"
              onClick={() => {
                if (appearanceView) {
                  setAppearanceView(false);
                } else if (addViewState?.mode) {
                  closeAddView(box.id);
                } else {
                  setConfirmDelete(true);
                }
              }}
              aria-label={
                appearanceView
                  ? t('box.closeAppearanceView')
                  : addViewState?.mode
                    ? t('box.closeAddView')
                    : t(isInRecycleBin ? 'menu.deletePermanently' : 'menu.moveToRecycleBin')
              }
            >
              <ThemeIcon name="close" size={14} />
            </MotionButton>
          </div>
        </header>
      )}
      <div
        className={`cardo-box-content cardo-box-content-mixed${confirmDelete ? ' cardo-box-delete-view' : ''}`}
      >
        {appearanceEnabled && appearanceView ? (
          <BoxAppearanceView
            box={box}
            accent={accent}
            icon={iconId}
            onClose={() => setAppearanceView(false)}
          />
        ) : confirmDelete ? (
          <motion.div
            className="cardo-box-delete-confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>
              {t(
                isInRecycleBin ? 'box.deletePermanentlyQuestion' : 'box.moveToRecycleBinQuestion',
                { type: t('box.general') },
              )}
            </p>
            <div className="cardo-box-delete-actions">
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                className="cardo-box-delete-confirm-button"
                variant="danger"
                onClick={startDeleteMotion}
              >
                {t(isInRecycleBin ? 'common.deletePermanently' : 'common.moveToRecycleBin')}
              </Button>
            </div>
          </motion.div>
        ) : (
          children
        )}
      </div>
      {!isTemporary && !addViewState?.mode && !appearanceView && !confirmDelete ? (
        <footer className="cardo-box-footer">
          <Button variant="ghost" onClick={onAddItem}>
            <ThemeIcon name="add" size={14} />
            <span>{t('box.addItem')}</span>
          </Button>
        </footer>
      ) : null}
      {!isTemporary ? (
        <Button
          variant="ghost"
          className="cardo-resize-handle"
          type="button"
          disabled={box.isLocked}
          aria-label={t('box.resize', { title: box.title })}
          onPointerDown={beginResize}
        >
          <span className="cardo-resize-grip" aria-hidden="true" />
        </Button>
      ) : null}
    </motion.article>
  );
}

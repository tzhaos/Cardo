import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { animate as animateMotion, motion, useMotionValue } from 'motion/react';
import type { MotionStyle } from 'motion/react';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { useUiStore, type BoxDragSession } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { getPageDropElement, registerBoxElement } from '../../app/interactionElementRegistry';
import { useInlineRename } from '../../app/useInlineRename';
import { useContextMenu } from '../../kit/context-menu';
import { ThemeIcon } from '../../kit/icon';
import { IconButton } from '../../kit/icon-button';
import { Input } from '../../kit/input';
import { Button } from '../../kit/button';
import {
  constrainBoxFrameToCanvas,
  constrainBoxResizeToCanvas,
  createCanvasWorldBounds,
} from '../../domain/canvasGeometry';
import {
  FREEFORM_MIN_HEIGHT,
  FREEFORM_MIN_WIDTH,
  resolveFreeformDropFrame,
} from '../../domain/freeformLayout';
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
import { BoxAppearanceView } from './BoxAppearancePopover';

/** Motion borderRadius for the sole official dialect (codex). */
const BOX_CORNER_RADIUS = { idle: 16, compact: 24 } as const;

interface BaseBoxFrameProps {
  box: WorkspaceBox;
  icon: ReactNode;
  iconId: WorkspaceBoxIcon;
  accent: string;
  children: ReactNode;
  onAddItem: () => void;
  skipEntryAnimation?: boolean;
  /**
   * Waterfall/list: placement is layout-managed (scroll document).
   * Drag reorder + cross-page still allowed; free resize is off.
   */
  layoutLocked?: boolean;
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
  skipEntryAnimation: _skipEntryAnimation = false,
  layoutLocked = false,
}: BaseBoxFrameProps) {
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
  // boxDragOverTopBar = over primary nav / sidebar (historical store name, KD-18).
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
  // Seed fixed-layer paint from lastClient when remounting mid-drag (excludeBoxId → DraggedBoxLayer).
  // Using world frame here would flash the box at wrong fixed coords for one frame.
  const seedPaint = resolveDragClientPaint(isDraggingThisBox ? boxDragSession : null, box.frame);
  const boxLeft = useMotionValue(seedPaint.left);
  const boxTop = useMotionValue(seedPaint.top);
  const boxWidth = useMotionValue(box.frame.width);
  const boxHeight = useMotionValue(box.frame.height);
  const { t } = useI18n();
  const titleRename = useInlineRename({
    value: box.title,
    onCommit: (title) => renameBox(box.id, title),
  });

  const attachDragPointerSession = useCallback(
    (session: BoxDragSession) => {
      pointerSessionRef.current?.dispose();
      setDragTransformOrigin(session.transformOrigin);
      // Prefer latestFrame so page-transfer rebases do not flash the pre-switch coords.
      const initialFrame = session.latestFrame ?? session.startFrame;
      const { grabOffsetX, grabOffsetY } = resolveGrabOffset(
        session.transformOrigin,
        initialFrame.width,
        initialFrame.height,
      );
      // Seed from lastClient (not only startClient) so remount after first move stays under finger.
      const seedX = session.lastClientX;
      const seedY = session.lastClientY;
      boxLeft.set(seedX - grabOffsetX);
      boxTop.set(seedY - grabOffsetY);
      let latestFrame = initialFrame;
      const pointerSession = startWindowPointerSession({
        pointerId: session.pointerId,
        onMove: (moveEvent) => {
          const activeSession = useUiStore.getState().boxDragSession;
          const baseFrame = activeSession?.startFrame ?? session.startFrame;
          const baseClientX = activeSession?.startClientX ?? session.startClientX;
          const baseClientY = activeSession?.startClientY ?? session.startClientY;
          const width = activeSession?.latestFrame.width ?? initialFrame.width;
          const height = activeSession?.latestFrame.height ?? initialFrame.height;
          const offset = resolveGrabOffset(session.transformOrigin, width, height);
          latestFrame = constrainBoxFrameToCanvas(
            {
              ...baseFrame,
              width,
              height,
              x: Math.round(baseFrame.x + moveEvent.clientX - baseClientX),
              y: Math.round(baseFrame.y + moveEvent.clientY - baseClientY),
            },
            createCanvasWorldBounds(useCanvasStore.getState().viewportSize),
          );
          // Client/fixed position — independent of page-scene slide and camera pan.
          boxLeft.set(moveEvent.clientX - offset.grabOffsetX);
          boxTop.set(moveEvent.clientY - offset.grabOffsetY);
          updateBoxDragFrame(latestFrame, moveEvent.clientX, moveEvent.clientY);
        },
        onEnd: () => {
          // Keep client/fixed paint until unmount — writing world coords while still
          // position:fixed causes a visible jump (drop flash).
          holdVisualUntilLandingRef.current = true;
          if (pointerSessionRef.current === pointerSession) {
            pointerSessionRef.current = null;
          }
        },
      });
      pointerSessionRef.current = pointerSession;
    },
    [boxLeft, boxTop, updateBoxDragFrame],
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
    // Primary left button only — ignore right-click, pen barrel, multi-touch second finger.
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }
    if (box.isLocked) {
      return;
    }
    // Managed layouts (waterfall/list) still allow drag for reorder + cross-page;
    // release reflows slots (see BoxPageDropController).

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
    const session: BoxDragSession = {
      boxId: box.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      startFrame: box.frame,
      latestFrame: box.frame,
      transformOrigin,
      morphology: 'freeform',
    };
    // Seed paint on this instance before remount so the first fixed frame is correct
    // if React reuses anything; DraggedBoxLayer remount seeds from session.lastClient*.
    const { grabOffsetX, grabOffsetY } = resolveGrabOffset(
      transformOrigin,
      box.frame.width,
      box.frame.height,
    );
    boxLeft.set(event.clientX - grabOffsetX);
    boxTop.set(event.clientY - grabOffsetY);
    holdVisualUntilLandingRef.current = false;
    beginBoxDrag(session);
    attachDragPointerSession(session);
  };

  /** SE freeform resize — motion-only mid-drag; commit frame on pointerup. */
  const beginResize = (event: ReactPointerEvent<HTMLElement>) => {
    // Primary left button only — same gate as beginDrag / canvas pan.
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }
    if (layoutLocked || box.isLocked || isDraggingThisBox || deleteMotion) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setAppearanceView(false);
    contextMenu.closeMenu();
    selectBox(box.id);
    pointerSessionRef.current?.dispose();

    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startFrame = {
      x: box.frame.x,
      y: box.frame.y,
      width: boxWidth.get(),
      height: boxHeight.get(),
    };
    let latestFrame = startFrame;
    useUiStore.getState().setBoxResizeActive(true);
    const clearResizeActive = () => useUiStore.getState().setBoxResizeActive(false);
    const pointerSession = startWindowPointerSession({
      pointerId: event.pointerId,
      onMove: (moveEvent) => {
        latestFrame = constrainBoxResizeToCanvas(
          {
            ...startFrame,
            width: Math.round(startFrame.width + (moveEvent.clientX - startClientX)),
            height: Math.round(startFrame.height + (moveEvent.clientY - startClientY)),
          },
          createCanvasWorldBounds(useCanvasStore.getState().viewportSize),
          { width: FREEFORM_MIN_WIDTH, height: FREEFORM_MIN_HEIGHT },
        );
        boxWidth.set(latestFrame.width);
        boxHeight.set(latestFrame.height);
      },
      onEnd: (reason) => {
        clearResizeActive();
        if (pointerSessionRef.current === pointerSession) {
          pointerSessionRef.current = null;
        }
        if (reason === 'pointerup') {
          // Same freeform drop path: snap + push out of neighbors (min gap).
          const bounds = createCanvasWorldBounds(useCanvasStore.getState().viewportSize);
          const occupied = useWorkspaceStore
            .getState()
            .projection.boxes.filter((entry) => entry.pageId === box.pageId && entry.id !== box.id)
            .map((entry) => entry.frame);
          const resolved = resolveFreeformDropFrame({
            frame: latestFrame,
            occupied,
            bounds,
          });
          boxLeft.set(resolved.x);
          boxTop.set(resolved.y);
          boxWidth.set(resolved.width);
          boxHeight.set(resolved.height);
          useWorkspaceStore.getState().updateBoxFrame(box.id, resolved);
          return;
        }
        // Cancel / blur / leave: revert visual size without a command.
        boxWidth.set(startFrame.width);
        boxHeight.set(startFrame.height);
      },
    });
    // dispose() does not call onEnd — clear the history lock if the session is aborted.
    const rawDispose = pointerSession.dispose.bind(pointerSession);
    pointerSession.dispose = () => {
      clearResizeActive();
      rawDispose();
    };
    pointerSessionRef.current = pointerSession;
  };

  const dragging = isDraggingThisBox;
  // Compact mini-card while over primary nav / sidebar (store still says TopBar).
  const draggingOverTopBar = dragging && boxDragOverTopBar;
  const draggingOverTab = draggingOverTopBar && boxDropPageId !== null;
  // Mini-card footprint while over primary nav page targets (~160×100), not a circle.
  const compactScale = Math.max(0.28, Math.min(0.5, 160 / box.frame.width, 100 / box.frame.height));
  const isInRecycleBin = isRecycleBinPageId(box.pageId);
  const isCollected = useWorkspaceStore((state) =>
    state.projection.collectionBoxIds.includes(box.id),
  );
  const isTemporary = box.kind === 'temporary';
  const viewMode = isTemporary ? 'list' : box.viewMode;
  const detailMode = isTemporary ? 'detailed' : box.detailMode;
  const boxCornerRadius = draggingOverTopBar ? BOX_CORNER_RADIUS.compact : BOX_CORNER_RADIUS.idle;
  // Keep idle scale while free-dragging so drop does not flash scale 1.028 → 1.
  const visualScale = draggingOverTopBar ? compactScale * (draggingOverTab ? 0.9 : 1) : 1;
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
    layoutLocked ? 'cardo-box-layout-locked' : '',
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
        // Wait for projection / landing — failsafe below clears stuck hold.
        return;
      }
    }

    const deltaX = Math.abs(boxLeft.get() - targetFrame.x);
    const deltaY = Math.abs(boxTop.get() - targetFrame.y);
    // Snap tiny deltas (same-spot drop / server echo). Animate only real moves
    // (cross-page primary-nav place or pull-in from off-screen).
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
    const duration = Math.min(0.56, Math.max(0.28, 0.22 + travel / 1400));
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

  // Failsafe: never leave the box frozen after drop if projection/landing race stalls.
  useEffect(() => {
    if (dragging || !holdVisualUntilLandingRef.current) return;
    const timer = window.setTimeout(() => {
      if (!holdVisualUntilLandingRef.current) return;
      holdVisualUntilLandingRef.current = false;
      boxLeft.set(box.frame.x);
      boxTop.set(box.frame.y);
      clearPendingBoxLanding(box.id);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [box.frame.x, box.frame.y, box.id, boxLeft, boxTop, clearPendingBoxLanding, dragging]);

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
        borderRadius: BOX_CORNER_RADIUS.idle,
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
      borderRadius: BOX_CORNER_RADIUS.compact,
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
      // Never remount-entry after drag: scale/opacity intro is a primary drop flash source.
      initial={false}
      animate={{
        x: deleteMotion?.x ?? 0,
        y: deleteMotion?.y ?? 0,
        scale: deleteMotion?.scale ?? visualScale,
        opacity: deleteMotion?.opacity ?? (draggingOverTopBar ? 0.94 : 1),
        // Numbers only for Motion. Cross-page uses 24px (mini card), never pill/circle.
        borderRadius: deleteMotion?.borderRadius ?? boxCornerRadius,
      }}
      transition={
        deleteMotion
          ? deleteMotion.permanent
            ? { duration: 0.24, ease: [0.4, 0, 1, 1] }
            : { duration: 0.48, ease: [0.22, 0.72, 0.18, 1] }
          : dragging
            ? {
                // Nav mini-card only — freeform scale stays 1 (no release pop).
                scale: {
                  type: 'tween',
                  duration: draggingOverTopBar ? 0.16 : 0,
                  ease: [0.2, 0.8, 0.2, 1],
                },
                borderRadius: { duration: draggingOverTopBar ? 0.14 : 0 },
                opacity: { duration: 0.1 },
              }
            : {
                // Landing after cross-page / pull-in only — never animate scale on same-page remount.
                scale: {
                  type: 'tween',
                  duration: pendingBoxLanding ? 0.28 : 0,
                  ease: [0.22, 0.82, 0.2, 1],
                },
                borderRadius: { duration: pendingBoxLanding ? 0.24 : 0 },
                opacity: { duration: pendingBoxLanding ? 0.18 : 0 },
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
          minHeight: 176,
          transformOrigin: deleteMotion ? '50% 50%' : dragTransformOrigin,
          pointerEvents: deleteMotion ? 'none' : undefined,
          '--box-accent': accent,
        } as MotionStyle & { '--box-accent': string }
      }
    >
      {isTemporary ? (
        <header className="cardo-temporary-box-header" onPointerDown={beginDrag}>
          <span className="cardo-temporary-box-grip" aria-hidden="true" />
          <span className="cardo-temporary-box-badge">{t('box.temporary')}</span>
          <Button
            type="button"
            data-no-drag
            onClick={() => {
              const title = t('box.newBox');
              promoteTemporaryBox(box.id, title);
              titleRename.start(title);
            }}
            title={t('box.promote')}
            aria-label={t('box.promote')}
          >
            <ThemeIcon name="packageCheck" size={12} />
            <span>{t('box.keep')}</span>
          </Button>
        </header>
      ) : (
        <header className="cardo-box-header" onPointerDown={beginDrag}>
          <div className="cardo-box-title-group">
            <IconButton
              className="cardo-box-icon cardo-icon-frame"
              data-no-drag
              aria-label={appearanceEnabled ? t('box.changePreset') : box.title}
              aria-pressed={appearanceEnabled ? appearanceView : undefined}
              disabled={!appearanceEnabled}
              tooltip={appearanceEnabled ? t('box.changePreset') : box.title}
              onClick={() => {
                if (!appearanceEnabled) return;
                contextMenu.closeMenu();
                setConfirmDelete(false);
                closeAddView(box.id);
                setAppearanceView((current) => !current);
              }}
            >
              {icon}
            </IconButton>
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
            <IconButton
              className="cardo-box-view-toggle cardo-box-lock-toggle cardo-icon-button"
              data-no-drag
              onClick={() => setBoxLocked(box.id, !box.isLocked)}
              aria-label={t(box.isLocked ? 'box.unlock' : 'box.lock')}
              aria-pressed={Boolean(box.isLocked)}
              tooltip={t(box.isLocked ? 'box.unlock' : 'box.lock')}
            >
              {box.isLocked ? (
                <ThemeIcon name="lock" size={15} strokeWidth={2.1} />
              ) : (
                <ThemeIcon name="unlock" size={15} strokeWidth={2.1} />
              )}
            </IconButton>
            <IconButton
              className="cardo-box-view-toggle cardo-icon-button"
              data-no-drag
              onClick={() =>
                setBoxDetailMode(box.id, detailMode === 'detailed' ? 'compact' : 'detailed')
              }
              aria-label={t(
                detailMode === 'detailed' ? 'box.switchToCompact' : 'box.switchToDetailed',
              )}
              aria-pressed={detailMode === 'compact'}
              tooltip={t(
                detailMode === 'detailed' ? 'box.switchToCompact' : 'box.switchToDetailed',
              )}
            >
              {detailMode === 'detailed' ? (
                <ThemeIcon name="collapse" size={15} strokeWidth={2.1} />
              ) : (
                <ThemeIcon name="expand" size={15} strokeWidth={2.1} />
              )}
            </IconButton>
            <IconButton
              className="cardo-box-view-toggle cardo-icon-button"
              data-no-drag
              onClick={() => setBoxViewMode(box.id, viewMode === 'list' ? 'grid' : 'list')}
              aria-label={t(viewMode === 'list' ? 'box.switchToGrid' : 'box.switchToList')}
              aria-pressed={viewMode === 'grid'}
              tooltip={t(viewMode === 'list' ? 'box.switchToGrid' : 'box.switchToList')}
            >
              {viewMode === 'list' ? (
                <ThemeIcon name="layoutGrid" size={15} strokeWidth={2.1} />
              ) : (
                <ThemeIcon name="list" size={15} strokeWidth={2.1} />
              )}
            </IconButton>
            <IconButton
              className="cardo-box-delete cardo-icon-button"
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
              tooltip={
                appearanceView
                  ? t('box.closeAppearanceView')
                  : addViewState?.mode
                    ? t('box.closeAddView')
                    : t(isInRecycleBin ? 'menu.deletePermanently' : 'menu.moveToRecycleBin')
              }
            >
              <ThemeIcon name="close" size={15} strokeWidth={2.1} />
            </IconButton>
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
      {!addViewState?.mode && !appearanceView && !confirmDelete ? (
        <footer className="cardo-box-footer">
          <Button variant="ghost" className="cardo-box-add-item" onClick={onAddItem}>
            <ThemeIcon name="add" size={12} />
            <span>{t('box.addItem')}</span>
          </Button>
        </footer>
      ) : null}
      {!layoutLocked &&
      !box.isLocked &&
      !confirmDelete &&
      !(appearanceEnabled && appearanceView) &&
      !addViewState?.mode &&
      !deleteMotion &&
      !dragging ? (
        <Button
          variant="ghost"
          type="button"
          className="cardo-box-resize-handle"
          data-no-drag
          aria-label={t('box.resize', { title: box.title })}
          onPointerDown={beginResize}
        >
          <span />
        </Button>
      ) : null}
    </motion.article>
  );
}

function resolveGrabOffset(transformOrigin: string, width: number, height: number) {
  const tokens = transformOrigin.trim().split(/\s+/);
  const originXPct = Number.parseFloat(tokens[0] ?? '50') || 50;
  const originYPct = Number.parseFloat(tokens[1] ?? '50') || 50;
  return {
    grabOffsetX: (width * originXPct) / 100,
    grabOffsetY: (height * originYPct) / 100,
  };
}

/** Fixed-layer left/top from last client + grab origin; world frame when idle. */
function resolveDragClientPaint(
  session: BoxDragSession | null,
  frame: { x: number; y: number; width: number; height: number },
) {
  if (!session) {
    return { left: frame.x, top: frame.y };
  }
  const { grabOffsetX, grabOffsetY } = resolveGrabOffset(
    session.transformOrigin,
    session.latestFrame.width,
    session.latestFrame.height,
  );
  return {
    left: session.lastClientX - grabOffsetX,
    top: session.lastClientY - grabOffsetY,
  };
}

import { useLayoutEffect, useRef } from 'react';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import { ThemeIcon } from '../../kit/icon';
import { BoxAppearanceIcon } from '../boxes/boxIconRegistry';
import { WorkspaceBoxRenderer } from './WorkspaceBoxRenderer';
import {
  startWindowPointerSession,
  type WindowPointerSession,
} from '../../app/windowPointerSession';

/**
 * Floating finger ghost by morphology (fixed layer under pointer).
 * Drop landing silhouettes live in the document plane (PageBoxes / GroupScrollSurface).
 */
export function FloatingDragLayer() {
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const session = useUiStore((state) => state.boxDragSession);
  const box = useWorkspaceStore((state) =>
    draggedBoxId
      ? (state.projection.boxes.find((entry) => entry.id === draggedBoxId) ?? null)
      : null,
  );

  if (!box || !session || session.boxId !== box.id) {
    return null;
  }

  if (session.morphology === 'card' || session.morphology === 'list') {
    return <ManagedMorphDragGhost boxId={box.id} morphology={session.morphology} />;
  }

  // Freeform: live box chrome under finger; slightly translucent so world landing peeks.
  return (
    <div
      className="cardo-dragged-box-layer cardo-dragged-box-layer-freeform"
      aria-hidden="true"
      data-drag-morph="freeform"
    >
      <WorkspaceBoxRenderer box={box} />
    </div>
  );
}

function ManagedMorphDragGhost({
  boxId,
  morphology,
}: {
  boxId: string;
  morphology: 'card' | 'list';
}) {
  const box = useWorkspaceStore((state) => state.projection.boxes.find((b) => b.id === boxId));
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerSessionRef = useRef<WindowPointerSession | null>(null);
  const accent = box ? getBoxAccent(box) : '#64748b';
  const icon = box ? getBoxIcon(box) : 'box';

  useLayoutEffect(() => {
    const session = useUiStore.getState().boxDragSession;
    if (!session || session.boxId !== boxId || !rootRef.current) return;

    const applyPaint = (clientX: number, clientY: number, width: number, height: number) => {
      const el = rootRef.current;
      if (!el) return;
      const tokens = session.transformOrigin.trim().split(/\s+/);
      const ox = Number.parseFloat(tokens[0] ?? '50') || 50;
      const oy = Number.parseFloat(tokens[1] ?? '50') || 50;
      const left = clientX - (width * ox) / 100;
      const top = clientY - (height * oy) / 100;
      el.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    };

    const width = session.latestFrame.width;
    const height =
      morphology === 'card'
        ? Math.min(session.latestFrame.height, 200)
        : Math.max(48, Math.min(session.latestFrame.height, 72));
    applyPaint(session.lastClientX, session.lastClientY, width, height);

    pointerSessionRef.current?.dispose();
    const pointerSession = startWindowPointerSession({
      pointerId: session.pointerId,
      onMove: (moveEvent) => {
        const active = useUiStore.getState().boxDragSession;
        if (!active) return;
        const baseFrame = active.startFrame;
        const baseClientX = active.startClientX;
        const baseClientY = active.startClientY;
        const latestFrame = {
          ...baseFrame,
          width: active.latestFrame.width,
          height: active.latestFrame.height,
          x: Math.round(baseFrame.x + moveEvent.clientX - baseClientX),
          y: Math.round(baseFrame.y + moveEvent.clientY - baseClientY),
        };
        useUiStore.getState().updateBoxDragFrame(latestFrame, moveEvent.clientX, moveEvent.clientY);
        const paintH =
          morphology === 'card'
            ? Math.min(latestFrame.height, 200)
            : Math.max(48, Math.min(latestFrame.height, 72));
        applyPaint(moveEvent.clientX, moveEvent.clientY, latestFrame.width, paintH);
        // Managed insert landing is owned solely by BoxPageDropController (rAF schedule).
        // Do not call updateManagedInsertPreview here — dual writers raced the hole.
      },
      onEnd: () => {
        if (pointerSessionRef.current === pointerSession) {
          pointerSessionRef.current = null;
        }
      },
    });
    pointerSessionRef.current = pointerSession;

    return () => {
      pointerSession.dispose();
      pointerSessionRef.current = null;
    };
  }, [boxId, morphology]);

  if (!box) return null;

  const session = useUiStore.getState().boxDragSession;
  const frame = session?.latestFrame ?? box.frame;
  const ghostHeight =
    morphology === 'card' ? Math.min(frame.height, 200) : Math.max(48, Math.min(frame.height, 72));

  return (
    <div className="cardo-dragged-box-layer cardo-dragged-morph-layer" aria-hidden="true">
      <div
        ref={rootRef}
        className={
          morphology === 'card'
            ? 'cardo-waterfall-card cardo-waterfall-card-dragging'
            : 'cardo-group-list-section cardo-group-list-section-dragging'
        }
        data-drag-morph={morphology}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: frame.width,
          height: ghostHeight,
          zIndex: 100,
          pointerEvents: 'none',
          ['--box-accent' as string]: accent,
        }}
      >
        {morphology === 'card' ? (
          <>
            <header className="cardo-waterfall-card-header">
              <span className="cardo-waterfall-card-icon" aria-hidden="true">
                <BoxAppearanceIcon icon={icon} size={14} />
              </span>
              <strong className="cardo-waterfall-card-title">{box.title}</strong>
              <span className="cardo-waterfall-card-count">{box.items.length}</span>
            </header>
            <div className="cardo-waterfall-card-body cardo-waterfall-card-body-ghost">
              {box.items.length === 0 ? (
                <div className="cardo-waterfall-card-ghost-line" />
              ) : (
                box.items.slice(0, 3).map((item) => (
                  <div className="cardo-waterfall-card-ghost-line" key={item.id}>
                    <span className="cardo-waterfall-card-ghost-label">
                      {item.title || item.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <header className="cardo-group-list-section-header">
              <ThemeIcon name="grip" size={14} />
              <span className="cardo-group-list-section-icon" aria-hidden="true">
                <BoxAppearanceIcon icon={icon} size={14} />
              </span>
              <strong className="cardo-group-list-section-title">{box.title}</strong>
              <span className="cardo-group-list-section-count">{box.items.length}</span>
            </header>
            <div className="cardo-group-list-section-ghost-sheet" aria-hidden="true">
              <span />
              <span />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

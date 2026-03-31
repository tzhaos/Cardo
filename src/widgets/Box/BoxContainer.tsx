import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { calculateSnap } from '../../domains/layout/services/calculateSnap';
import { useUIStore } from '../../domains/ui/store/useUIStore';
import { useWorkspaceStore } from '../../domains/workspace/store/useWorkspaceStore';
import { cn } from '../../lib/utils';
import type { BoxData } from '../../types/box';
import BoxContent from './BoxContent';
import BoxHeader from './BoxHeader';

interface BoxContainerProps {
  data: BoxData;
}

export default function BoxContainer({ data }: BoxContainerProps) {
  const allBoxes = useWorkspaceStore((state) => state.boxes);
  const updateBox = useWorkspaceStore((state) => state.updateBox);
  const bringToFront = useWorkspaceStore((state) => state.bringToFront);
  const toggleMinimize = useWorkspaceStore((state) => state.toggleMinimize);
  const deleteBox = useWorkspaceStore((state) => state.deleteBox);

  const activeBoxId = useUIStore((state) => state.activeBoxId);
  const editingSessionId = useUIStore((state) => state.editingSessionId);
  const setActiveBox = useUIStore((state) => state.setActiveBox);
  const setSnapPreview = useUIStore((state) => state.setSnapPreview);

  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const lastSnapRef = useRef<string | null>(null);

  const isActive = activeBoxId === data.id;

  useEffect(() => {
    if (isActive) {
      return;
    }

    setShowAddMenu(false);
    setShowThemePicker(false);
  }, [isActive]);

  const applyBoxUpdates = (updates: Partial<BoxData>) => updateBox(data.id, updates);

  const focusBox = () => {
    bringToFront(data.id);
    setActiveBox(data.id);
  };

  const handleDragStart = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (data.isLocked || editingSessionId) {
      return;
    }

    setIsDragging(true);
    focusBox();

    const startX = event.clientX;
    const startY = event.clientY;
    const initialBoxX = data.x;
    const initialBoxY = data.y;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const offsetX = moveEvent.clientX - startX;
      const offsetY = moveEvent.clientY - startY;
      const newX = initialBoxX + offsetX;
      const newY = initialBoxY + offsetY;
      const snap = calculateSnap(newX, newY, data.width, data.height, allBoxes, data.id);

      applyBoxUpdates({ x: newX, y: newY });

      const snapKey = `${snap.x},${snap.y}`;

      if (lastSnapRef.current === snapKey) {
        return;
      }

      lastSnapRef.current = snapKey;
      setSnapPreview({
        x: snap.x,
        y: snap.y,
        width: data.width,
        height: data.height,
        guides: snap.guides,
      });
    };

    const onPointerUp = () => {
      setIsDragging(false);

      if (lastSnapRef.current) {
        const [snappedX, snappedY] = lastSnapRef.current.split(',').map(Number);
        applyBoxUpdates({ x: snappedX, y: snappedY });
      }

      lastSnapRef.current = null;
      setSnapPreview(null);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  const handleResize = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (data.isLocked || editingSessionId) {
      return;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = data.width;
    const startHeight = data.height;

    const onMouseMove = (moveEvent: MouseEvent) => {
      let newWidth = Math.max(200, startWidth + moveEvent.clientX - startX);
      let newHeight = Math.max(150, startHeight + moveEvent.clientY - startY);

      newWidth = Math.round(newWidth / 20) * 20;
      newHeight = Math.round(newHeight / 20) * 20;
      applyBoxUpdates({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <motion.div
      ref={boxRef}
      onMouseDown={focusBox}
      initial={{ x: data.x, y: data.y, opacity: 0, scale: 0.95 }}
      animate={{
        x: data.x,
        y: data.y,
        opacity: 1,
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 25 }}
      style={{ width: data.width, height: data.height, zIndex: data.zIndex }}
      className={cn(
        'absolute flex flex-col overflow-hidden rounded-xl border backdrop-blur-md transition-colors duration-300',
        data.theme,
        data.isLocked ? 'ring-1 ring-red-500/50' : '',
        isActive && !data.isLocked ? 'ring-2 ring-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : '',
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setShowThemePicker(false);
      }}
    >
      <BoxHeader
        data={data}
        isHovering={isHovering}
        showThemePicker={showThemePicker}
        setShowThemePicker={setShowThemePicker}
        onUpdate={applyBoxUpdates}
        onMinimize={() => toggleMinimize(data.id)}
        onClose={() => deleteBox(data.id)}
        onDragStart={handleDragStart}
      />

      <BoxContent
        data={data}
        showAddMenu={showAddMenu}
        setShowAddMenu={setShowAddMenu}
        onUpdate={applyBoxUpdates}
      />

      {!data.isLocked && (
        <div
          className={cn(
            'absolute bottom-0 right-0 h-4 w-4',
            editingSessionId ? 'cursor-not-allowed opacity-20' : 'cursor-se-resize',
          )}
          onMouseDown={handleResize}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-full w-full text-white/20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15L15 21M21 8L8 21" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useUIStore } from '../../domains/ui/store/useUIStore';
import { useWorkspaceStore } from '../../domains/workspace/store/useWorkspaceStore';
import { cn } from '../../lib/utils';
import type { BoxData } from '../../types/box';
import BoxContent from './BoxContent';
import { useBoxDrag } from './hooks/useBoxDrag';
import { useBoxResize } from './hooks/useBoxResize';
import BoxHeader from './BoxHeader';

interface BoxContainerProps {
  boxId: string;
}

export default function BoxContainer({ boxId }: BoxContainerProps) {
  const data = useWorkspaceStore((state) => state.boxesById[boxId]);
  const updateBox = useWorkspaceStore((state) => state.updateBox);
  const bringToFront = useWorkspaceStore((state) => state.bringToFront);
  const toggleMinimize = useWorkspaceStore((state) => state.toggleMinimize);
  const deleteBox = useWorkspaceStore((state) => state.deleteBox);

  const activeBoxId = useUIStore((state) => state.activeBoxId);
  const editingSessionId = useUIStore((state) => state.editingSessionId);
  const setActiveBox = useUIStore((state) => state.setActiveBox);

  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  if (!data) {
    return null;
  }

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

  const { handleDragStart } = useBoxDrag({
    box: data,
    onFocus: focusBox,
    onUpdate: applyBoxUpdates,
    setIsDragging,
  });
  const { handleResize } = useBoxResize({
    box: data,
    onUpdate: applyBoxUpdates,
  });

  return (
    <motion.div
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

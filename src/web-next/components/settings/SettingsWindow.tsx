import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion, useMotionValue } from 'motion/react';
import {
  clampIndependentMenuPosition,
  useIndependentMenuStore,
} from '../../app/stores/independentMenuStore';
import {
  startWindowPointerSession,
  type WindowPointerSession,
} from '../../app/windowPointerSession';
import { SettingsPanel } from './SettingsPanel';

export function SettingsWindow() {
  const menu = useIndependentMenuStore((state) => state.menus.settings);
  const closeMenu = useIndependentMenuStore((state) => state.closeMenu);
  const moveMenu = useIndependentMenuStore((state) => state.moveMenu);
  const windowRef = useRef<HTMLElement>(null);
  const dragSessionRef = useRef<WindowPointerSession | null>(null);
  const draggingRef = useRef(false);
  const positionX = useMotionValue(menu.position.x);
  const positionY = useMotionValue(menu.position.y);

  useEffect(() => {
    return () => {
      dragSessionRef.current?.end();
      document.body.classList.remove('cardo-independent-menu-dragging');
    };
  }, []);

  useEffect(() => {
    if (draggingRef.current) {
      return;
    }

    positionX.set(menu.position.x);
    positionY.set(menu.position.y);
  }, [menu.position.x, menu.position.y, positionX, positionY]);

  useEffect(() => {
    if (!menu.open) {
      dragSessionRef.current?.end();
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu('settings');
      }
    };

    const keepInViewport = () => {
      const element = windowRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const position = clampIndependentMenuPosition(
        menu.position,
        { width: rect.width, height: rect.height },
        { width: window.innerWidth, height: window.innerHeight },
      );
      if (position.x !== menu.position.x || position.y !== menu.position.y) {
        moveMenu('settings', position);
      }
    };

    keepInViewport();
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', keepInViewport);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', keepInViewport);
    };
  }, [closeMenu, menu.open, menu.position, moveMenu]);

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button,input,textarea,[data-no-menu-drag]')) {
      return;
    }

    const element = windowRef.current;
    if (!element) return;

    event.preventDefault();
    const rect = element.getBoundingClientRect();
    const pointerOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    let latestPosition = { x: Math.round(rect.left), y: Math.round(rect.top) };

    dragSessionRef.current?.end();
    draggingRef.current = true;
    document.body.classList.add('cardo-independent-menu-dragging');
    const session = startWindowPointerSession({
      onMove: (moveEvent) => {
        latestPosition = clampIndependentMenuPosition(
          {
            x: moveEvent.clientX - pointerOffset.x,
            y: moveEvent.clientY - pointerOffset.y,
          },
          { width: rect.width, height: rect.height },
          { width: window.innerWidth, height: window.innerHeight },
        );
        positionX.set(latestPosition.x);
        positionY.set(latestPosition.y);
      },
      onEnd: () => {
        draggingRef.current = false;
        document.body.classList.remove('cardo-independent-menu-dragging');
        if (dragSessionRef.current === session) {
          dragSessionRef.current = null;
        }
        moveMenu('settings', latestPosition);
      },
    });
    dragSessionRef.current = session;
  };

  return (
    <AnimatePresence>
      {menu.open ? (
        <motion.aside
          className="cardo-independent-menu cardo-settings-window"
          data-independent-menu="settings"
          id="cardo-settings-window"
          ref={windowRef}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={{ left: 0, top: 0, x: positionX, y: positionY }}
        >
          <SettingsPanel onClose={() => closeMenu('settings')} onHeaderPointerDown={beginDrag} />
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion, useMotionValue } from 'motion/react';
import {
  clampIndependentMenuPosition,
  clampIndependentMenuSize,
  SETTINGS_MIN_SIZE,
  useIndependentMenuStore,
} from '../../app/stores/independentMenuStore';
import {
  startWindowPointerSession,
  type WindowPointerSession,
} from '../../app/windowPointerSession';
import { useI18n } from '../../i18n/useI18n';
import { SettingsPanel } from './SettingsPanel';

/**
 * Settings is a long-lived text shell. Keep it crisp by:
 * 1) positioning with left/top (not transform x/y — GPU translate softens text)
 * 2) always snapping geometry to integer CSS pixels
 * 3) opacity-only enter/exit (scale leaves residual compositor soft edges)
 */
export function SettingsWindow() {
  const menu = useIndependentMenuStore((state) => state.menus.settings);
  const closeMenu = useIndependentMenuStore((state) => state.closeMenu);
  const moveMenu = useIndependentMenuStore((state) => state.moveMenu);
  const resizeMenu = useIndependentMenuStore((state) => state.resizeMenu);
  const windowRef = useRef<HTMLElement>(null);
  const dragSessionRef = useRef<WindowPointerSession | null>(null);
  const draggingRef = useRef(false);
  const resizingRef = useRef(false);
  const positionX = useMotionValue(menu.position.x);
  const positionY = useMotionValue(menu.position.y);
  const sizeWidth = useMotionValue(menu.size.width);
  const sizeHeight = useMotionValue(menu.size.height);
  const { t } = useI18n();

  useEffect(() => {
    return () => {
      dragSessionRef.current?.end();
      document.body.classList.remove('cardo-independent-menu-dragging');
      document.body.classList.remove('cardo-independent-menu-resizing');
    };
  }, []);

  useEffect(() => {
    if (draggingRef.current || resizingRef.current) {
      return;
    }

    positionX.set(Math.round(menu.position.x));
    positionY.set(Math.round(menu.position.y));
    sizeWidth.set(Math.round(menu.size.width));
    sizeHeight.set(Math.round(menu.size.height));
  }, [
    menu.position.x,
    menu.position.y,
    menu.size.width,
    menu.size.height,
    positionX,
    positionY,
    sizeWidth,
    sizeHeight,
  ]);

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
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const size = clampIndependentMenuSize(menu.size, menu.position, viewport);
      const position = clampIndependentMenuPosition(menu.position, size, viewport);
      if (size.width !== menu.size.width || size.height !== menu.size.height) {
        resizeMenu('settings', size);
      }
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
  }, [closeMenu, menu.open, menu.position, menu.size, moveMenu, resizeMenu]);

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
    const size = {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };

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
          size,
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
        // Snap after drag so text rasterizes on whole pixels.
        const snapped = {
          x: Math.round(latestPosition.x),
          y: Math.round(latestPosition.y),
        };
        positionX.set(snapped.x);
        positionY.set(snapped.y);
        moveMenu('settings', snapped);
      },
    });
    dragSessionRef.current = session;
  };

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const element = windowRef.current;
    if (!element) return;

    event.preventDefault();
    event.stopPropagation();
    const rect = element.getBoundingClientRect();
    const origin = { x: event.clientX, y: event.clientY };
    const startSize = {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
    const position = { x: Math.round(rect.left), y: Math.round(rect.top) };
    let latestSize = { ...startSize };

    dragSessionRef.current?.end();
    resizingRef.current = true;
    document.body.classList.add('cardo-independent-menu-resizing');
    const session = startWindowPointerSession({
      pointerId: event.pointerId,
      onMove: (moveEvent) => {
        latestSize = clampIndependentMenuSize(
          {
            width: startSize.width + (moveEvent.clientX - origin.x),
            height: startSize.height + (moveEvent.clientY - origin.y),
          },
          position,
          { width: window.innerWidth, height: window.innerHeight },
          SETTINGS_MIN_SIZE,
        );
        sizeWidth.set(latestSize.width);
        sizeHeight.set(latestSize.height);
      },
      onEnd: () => {
        resizingRef.current = false;
        document.body.classList.remove('cardo-independent-menu-resizing');
        if (dragSessionRef.current === session) {
          dragSessionRef.current = null;
        }
        const snapped = {
          width: Math.round(latestSize.width),
          height: Math.round(latestSize.height),
        };
        sizeWidth.set(snapped.width);
        sizeHeight.set(snapped.height);
        resizeMenu('settings', snapped);
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          style={{
            left: positionX,
            top: positionY,
            width: sizeWidth,
            height: sizeHeight,
          }}
        >
          <SettingsPanel onClose={() => closeMenu('settings')} onHeaderPointerDown={beginDrag} />
          <button
            type="button"
            className="cardo-settings-resize-handle"
            aria-label={t('settings.resize')}
            data-no-menu-drag
            onPointerDown={beginResize}
          />
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

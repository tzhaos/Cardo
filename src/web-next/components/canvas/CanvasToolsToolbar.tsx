import { useState } from 'react';
import { LayoutDashboard, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../primitives/IconPrimitives';
import { useCanvasLayoutTools } from './useCanvasLayoutTools';

export function CanvasToolsToolbar() {
  const [expanded, setExpanded] = useState(false);
  const { items } = useCanvasLayoutTools();
  const { t } = useI18n();

  return (
    <aside className="wbn-canvas-tools" aria-label={t('canvas.layoutTools')}>
      <IconButton
        className={expanded ? 'wbn-canvas-tools-trigger-active' : undefined}
        aria-expanded={expanded}
        aria-label={t('canvas.layoutTools')}
        title={t('canvas.layoutTools')}
        onClick={() => setExpanded((current) => !current)}
      >
        <motion.span
          className="wbn-icon-frame"
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        >
          {expanded ? <X size={18} /> : <LayoutDashboard size={18} />}
        </motion.span>
      </IconButton>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            className="wbn-canvas-tools-actions"
            initial={{ opacity: 0, x: -8, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
          >
            {items.map((item, index) => (
              <IconButton
                disabled={item.disabled}
                key={item.id}
                aria-label={item.label}
                title={item.label}
                onClick={() => item.onSelect?.()}
              >
                <motion.span
                  className="wbn-icon-frame"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.025 }}
                >
                  {item.icon}
                </motion.span>
              </IconButton>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </aside>
  );
}

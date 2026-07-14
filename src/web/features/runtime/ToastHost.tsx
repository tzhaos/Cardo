import { AnimatePresence, motion } from 'motion/react';
import { useToastStore } from '../../app/stores/toastStore';

/**
 * Lightweight fixed toast stack for short success/error feedback.
 * Auto-dismiss is owned by toastStore (2.5s).
 */
export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="cardo-toast-host" aria-live="polite" aria-relevant="additions">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`cardo-toast cardo-toast--${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

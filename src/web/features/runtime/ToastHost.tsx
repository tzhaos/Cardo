import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useToastStore } from '../../app/stores/toastStore';

/**
 * Lightweight fixed toast stack for short success/error feedback.
 * Auto-dismiss is owned by toastStore (info 2.5s / error 4s). Click dismisses.
 */
export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0.01 : 0.16;

  return (
    <div className="cardo-toast-host" aria-live="polite" aria-relevant="additions">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`cardo-toast cardo-toast--${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration }}
            onClick={() => dismissToast(toast.id)}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

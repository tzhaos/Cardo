import { create } from 'zustand';

export type ToastTone = 'info' | 'error' | 'success';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastStore {
  toasts: ToastItem[];
  showToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
}

const TOAST_TTL_INFO_MS = 2500;
const TOAST_TTL_ERROR_MS = 4000;
const dismissTimers = new Map<string, number>();
let toastSeq = 0;

function toastTtlMs(tone: ToastTone): number {
  return tone === 'error' ? TOAST_TTL_ERROR_MS : TOAST_TTL_INFO_MS;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  showToast: (message, tone = 'info') => {
    const id = `toast-${++toastSeq}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, tone }],
    }));
    const existing = dismissTimers.get(id);
    if (existing !== undefined) window.clearTimeout(existing);
    dismissTimers.set(
      id,
      window.setTimeout(() => {
        dismissTimers.delete(id);
        get().dismissToast(id);
      }, toastTtlMs(tone)),
    );
  },
  dismissToast: (id) => {
    const timer = dismissTimers.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      dismissTimers.delete(id);
    }
    set((state) => {
      if (!state.toasts.some((toast) => toast.id === id)) return state;
      return { toasts: state.toasts.filter((toast) => toast.id !== id) };
    });
  },
}));

export function showToast(message: string, tone?: ToastTone) {
  useToastStore.getState().showToast(message, tone);
}

import { Toaster } from 'sonner';
import type { AppTheme } from '../../../core/domains/preferences/model/preferences';

export function ToastViewport({ theme }: { theme: AppTheme }) {
  return <Toaster theme={theme} position="bottom-right" />;
}

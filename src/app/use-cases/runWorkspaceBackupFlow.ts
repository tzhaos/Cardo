/** Workspace backup flows: wraps export/import use-cases with UI-level toast feedback. */
import { log } from '../../lib/log';
import type { ToastSpec } from '../presentation/toastSpec';
import type { TranslateFn } from '../hooks/useI18n';
import { exportWorkspace } from './exportWorkspace';
import { importWorkspace } from './importWorkspace';

export function runExportWorkspaceForUi(t: TranslateFn): ToastSpec {
  exportWorkspace(t('dock.exportFilePrefix'));
  return { level: 'success', messageKey: 'toast.dataExported' };
}

export async function runImportWorkspaceForUi(file: File): Promise<ToastSpec> {
  try {
    await importWorkspace(file);
    return { level: 'success', messageKey: 'toast.dataImported' };
  } catch (error) {
    log.error('Workspace import failed', error);
    return { level: 'error', messageKey: 'toast.importFailed' };
  }
}

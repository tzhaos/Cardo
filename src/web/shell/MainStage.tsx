import type { ReactNode } from 'react';
import { useI18n } from '../i18n/useI18n';
import { Panel } from '../kit/panel';

/**
 * Main stage: kit Panel + canvas well + optional bottom chrome.
 * Layout margins only in shell chrome CSS; structure is kit.
 */
export function MainStage({
  header,
  canvas,
  bottomBar,
}: {
  header: ReactNode;
  canvas: ReactNode;
  bottomBar?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="cardo-v2-stage">
      <Panel className="cardo-v2-panel" aria-label={t('shell.mainStage')}>
        {header}
        <div className="cardo-surface-well cardo-v2-canvas-well">{canvas}</div>
        {bottomBar}
      </Panel>
    </div>
  );
}

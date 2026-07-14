import { useI18n } from '../i18n/useI18n';

/**
 * Large product name at the top of the left sidebar (product IA).
 * Logo is intentionally omitted — wordmark only.
 */
export function SidebarBrand() {
  const { t } = useI18n();
  return (
    <div className="cardo-sidebar-brand" aria-label={t('shell.productName')}>
      <span className="cardo-sidebar-brand-name">{t('shell.productName')}</span>
    </div>
  );
}

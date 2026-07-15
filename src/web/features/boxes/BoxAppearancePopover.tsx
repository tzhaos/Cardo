import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { ThemeIcon } from '../../kit/icon';
import { Button } from '../../kit/button';
import { BOX_ICON_PRESETS, DEFAULT_BOX_ACCENT } from '../../domain/boxAppearance';
import type { WorkspaceBox, WorkspaceBoxIcon } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { BoxAppearanceIcon } from './boxIconRegistry';

/**
 * Box appearance: icon only. Product forbids custom accent colors / styles.
 */
export function BoxAppearanceView({
  box,
  icon,
  onClose,
}: {
  box: WorkspaceBox;
  accent?: string;
  icon: WorkspaceBoxIcon;
  onClose: () => void;
}) {
  const setBoxAppearance = useWorkspaceStore((state) => state.setBoxAppearance);
  const { t } = useI18n();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return (
    <motion.div
      className="cardo-box-appearance-view"
      data-no-drag
      style={{ '--box-accent': DEFAULT_BOX_ACCENT } as CSSProperties}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <section>
        <span className="cardo-box-appearance-label">{t('box.icon')}</span>
        <div className="cardo-box-icon-grid">
          {BOX_ICON_PRESETS.map((candidate) => (
            <Button
              variant="ghost"
              className={candidate === icon ? 'cardo-box-icon-choice-active' : undefined}
              type="button"
              key={candidate}
              aria-label={`${t('box.icon')} ${candidate}`}
              aria-pressed={candidate === icon}
              onClick={() => setBoxAppearance(box.id, { icon: candidate })}
            >
              <BoxAppearanceIcon icon={candidate} size={17} />
              {candidate === icon ? (
                <ThemeIcon name="check" className="cardo-box-choice-check" size={10} />
              ) : null}
            </Button>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

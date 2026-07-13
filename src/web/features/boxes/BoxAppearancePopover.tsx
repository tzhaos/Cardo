import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { ThemeIcon } from '../../kit/icon';
import { Input } from '../../kit/input';
import { Button } from '../../kit/button';
import {
  BOX_ACCENT_PRESETS,
  BOX_ICON_PRESETS,
  normalizeBoxAccent,
} from '../../domain/boxAppearance';
import type { WorkspaceBox, WorkspaceBoxIcon } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { BoxAppearanceIcon } from './boxIconRegistry';

export function BoxAppearanceView({
  box,
  accent,
  icon,
  onClose,
}: {
  box: WorkspaceBox;
  accent: string;
  icon: WorkspaceBoxIcon;
  onClose: () => void;
}) {
  const setBoxAppearance = useWorkspaceStore((state) => state.setBoxAppearance);
  const [colorDraft, setColorDraft] = useState(accent.toUpperCase());
  const [invalidColor, setInvalidColor] = useState(false);
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

  const applyColorDraft = () => {
    const normalized = normalizeBoxAccent(colorDraft);
    if (!normalized) {
      setInvalidColor(true);
      return;
    }
    setInvalidColor(false);
    setColorDraft(normalized.toUpperCase());
    setBoxAppearance(box.id, { accent: normalized });
  };
  return (
    <motion.div
      className="cardo-box-appearance-view"
      data-no-drag
      style={{ '--box-accent': accent } as CSSProperties}
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
      <section>
        <span className="cardo-box-appearance-label">{t('box.color')}</span>
        <div className="cardo-box-color-grid">
          {BOX_ACCENT_PRESETS.map((candidate) => (
            <Button
              variant="ghost"
              className={candidate === accent.toLowerCase() ? 'cardo-box-color-active' : undefined}
              type="button"
              key={candidate}
              style={{ '--choice-color': candidate } as CSSProperties}
              aria-label={candidate}
              aria-pressed={candidate === accent.toLowerCase()}
              onClick={() => {
                setColorDraft(candidate.toUpperCase());
                setInvalidColor(false);
                setBoxAppearance(box.id, { accent: candidate });
              }}
            >
              {candidate === accent.toLowerCase() ? <ThemeIcon name="check" size={11} /> : null}
            </Button>
          ))}
        </div>
        <div className="cardo-box-custom-color-row">
          <label className="cardo-box-native-color" title={t('box.colorPicker')}>
            <ThemeIcon name="palette" size={15} />
            <Input
              type="color"
              value={accent}
              aria-label={t('box.colorPicker')}
              onChange={(event) => {
                const color = event.target.value;
                setColorDraft(color.toUpperCase());
                setInvalidColor(false);
                setBoxAppearance(box.id, { accent: color });
              }}
            />
          </label>
          <Input
            className="cardo-box-color-code"
            value={colorDraft}
            aria-label={t('box.colorCode')}
            aria-invalid={invalidColor}
            spellCheck={false}
            onChange={(event) => {
              setColorDraft(event.target.value);
              setInvalidColor(false);
            }}
            onBlur={applyColorDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                setColorDraft(accent.toUpperCase());
                setInvalidColor(false);
                event.currentTarget.blur();
              }
            }}
          />
        </div>
      </section>
    </motion.div>
  );
}

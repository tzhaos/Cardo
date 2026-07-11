import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Check, Palette } from 'lucide-react';
import { motion } from 'motion/react';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import {
  BOX_ACCENT_PRESETS,
  BOX_ICON_PRESETS,
  normalizeBoxAccent,
} from '../../domain/boxAppearance';
import type { WorkspaceBox, WorkspaceBoxIcon } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { BoxAppearanceIcon } from './boxIconRegistry';
import { Input } from '../../ui/primitives/input';
import { Button } from '../../ui/primitives/button';

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
      className="wbn-box-appearance-view"
      data-no-drag
      style={{ '--box-accent': accent } as CSSProperties}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <section>
        <span className="wbn-box-appearance-label">{t('box.icon')}</span>
        <div className="wbn-box-icon-grid">
          {BOX_ICON_PRESETS.map((candidate) => (
            <Button
              variant="ghost"
              className={candidate === icon ? 'wbn-box-icon-choice-active' : undefined}
              type="button"
              key={candidate}
              aria-label={`${t('box.icon')} ${candidate}`}
              aria-pressed={candidate === icon}
              onClick={() => setBoxAppearance(box.id, { icon: candidate })}
            >
              <BoxAppearanceIcon icon={candidate} size={17} />
              {candidate === icon ? <Check className="wbn-box-choice-check" size={10} /> : null}
            </Button>
          ))}
        </div>
      </section>
      <section>
        <span className="wbn-box-appearance-label">{t('box.color')}</span>
        <div className="wbn-box-color-grid">
          {BOX_ACCENT_PRESETS.map((candidate) => (
            <Button
              variant="ghost"
              className={candidate === accent.toLowerCase() ? 'wbn-box-color-active' : undefined}
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
              {candidate === accent.toLowerCase() ? <Check size={11} /> : null}
            </Button>
          ))}
        </div>
        <div className="wbn-box-custom-color-row">
          <label className="wbn-box-native-color" title={t('box.colorPicker')}>
            <Palette size={15} />
            <input
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
            className="wbn-box-color-code"
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

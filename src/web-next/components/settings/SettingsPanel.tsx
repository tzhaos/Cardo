import { useMemo, useState } from 'react';
import type { PointerEventHandler } from 'react';
import {
  Check,
  CircleHelp,
  Languages,
  Moon,
  Palette,
  Settings,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { useI18n } from '../../i18n/useI18n';
import { getRegisteredWebNextThemes } from '../../themes/themeRegistry';
import type { WebNextColorMode } from '../../themes/themeRegistry';
import { ColorModeStateIcon, LanguageStateIcon } from './StateIcons';
import { IconButton, IconFrame } from '../primitives/IconPrimitives';

type SettingsSection = 'general' | 'appearance' | 'about';

export function SettingsPanel({
  onClose,
  onHeaderPointerDown,
}: {
  onClose: () => void;
  onHeaderPointerDown?: PointerEventHandler<HTMLElement>;
}) {
  const [section, setSection] = useState<SettingsSection>('general');
  const colorMode = usePreferencesStore((state) => state.colorMode);
  const locale = usePreferencesStore((state) => state.locale);
  const setColorMode = usePreferencesStore((state) => state.setColorMode);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const setThemeId = usePreferencesStore((state) => state.setThemeId);
  const themeId = usePreferencesStore((state) => state.themeId);
  const { t } = useI18n();
  const themes = useMemo(() => getRegisteredWebNextThemes(), []);
  const sections = [
    { id: 'general' as const, icon: SlidersHorizontal, label: t('settings.general') },
    { id: 'appearance' as const, icon: Palette, label: t('settings.appearance') },
    { id: 'about' as const, icon: CircleHelp, label: t('settings.about') },
  ];

  return (
    <div className="wbn-settings-panel" role="dialog" aria-label={t('settings.title')}>
      <header className="wbn-settings-header" onPointerDown={onHeaderPointerDown}>
        <div>
          <IconFrame>
            <Settings size={17} />
          </IconFrame>
          <span>{t('settings.title')}</span>
        </div>
        <IconButton data-no-menu-drag onClick={onClose} aria-label={t('common.close')}>
          <X size={16} />
        </IconButton>
      </header>
      <div className="wbn-settings-layout">
        <nav className="wbn-settings-nav" aria-label={t('settings.sections')}>
          {sections.map(({ id, icon: Icon, label }) => (
            <button
              className={section === id ? 'wbn-settings-nav-active' : ''}
              key={id}
              type="button"
              onClick={() => setSection(id)}
            >
              {section === id ? (
                <motion.span
                  className="wbn-settings-nav-indicator"
                  layoutId="settings-nav-indicator"
                  transition={{ type: 'spring', bounce: 0.12, duration: 0.42 }}
                />
              ) : null}
              <IconFrame>
                <Icon size={16} />
              </IconFrame>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="wbn-settings-content wbn-custom-scrollbar">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={section}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.16 }}
            >
              {section === 'general' ? (
                <GeneralSettings locale={locale} setLocale={setLocale} />
              ) : null}
              {section === 'appearance' ? (
                <AppearanceSettings
                  colorMode={colorMode}
                  locale={locale}
                  setColorMode={setColorMode}
                  setThemeId={setThemeId}
                  themeId={themeId}
                  themes={themes}
                />
              ) : null}
              {section === 'about' ? <AboutSettings /> : null}
            </motion.section>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function GeneralSettings({
  locale,
  setLocale,
}: {
  locale: 'en' | 'zh';
  setLocale: (locale: 'en' | 'zh') => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <SettingsHeading
        title={t('settings.general')}
        description={t('settings.generalDescription')}
      />
      <div className="wbn-settings-card">
        <div className="wbn-settings-card-copy">
          <LanguageStateIcon locale={locale} />
          <span>
            {t('settings.language')}
            <small>{t('settings.languageDescription')}</small>
          </span>
        </div>
        <div className="wbn-segmented-control" aria-label={t('settings.language')}>
          <SegmentButton active={locale === 'en'} onClick={() => setLocale('en')}>
            EN
          </SegmentButton>
          <SegmentButton active={locale === 'zh'} onClick={() => setLocale('zh')}>
            文
          </SegmentButton>
        </div>
      </div>
    </>
  );
}

function AppearanceSettings({
  colorMode,
  locale,
  setColorMode,
  setThemeId,
  themeId,
  themes,
}: {
  colorMode: WebNextColorMode;
  locale: 'en' | 'zh';
  setColorMode: (colorMode: WebNextColorMode) => void;
  setThemeId: (themeId: string) => void;
  themeId: string;
  themes: ReturnType<typeof getRegisteredWebNextThemes>;
}) {
  const { t } = useI18n();

  return (
    <>
      <SettingsHeading
        title={t('settings.appearance')}
        description={t('settings.appearanceDescription')}
      />
      <div className="wbn-settings-card">
        <div className="wbn-settings-card-copy">
          <ColorModeStateIcon colorMode={colorMode} />
          <span>
            {t('settings.mode')}
            <small>{t('settings.modeDescription')}</small>
          </span>
        </div>
        <div className="wbn-segmented-control" aria-label={t('settings.mode')}>
          <SegmentButton active={colorMode === 'light'} onClick={() => setColorMode('light')}>
            <Sun size={14} />
            {t('settings.light')}
          </SegmentButton>
          <SegmentButton active={colorMode === 'dark'} onClick={() => setColorMode('dark')}>
            <Moon size={14} />
            {t('settings.dark')}
          </SegmentButton>
        </div>
      </div>
      <div className="wbn-settings-subheading">
        <span>{t('settings.theme')}</span>
        <small>{t('settings.themeDescription')}</small>
      </div>
      <div className="wbn-theme-grid">
        {themes.map((theme) => {
          const selected = theme.id === themeId;
          return (
            <motion.button
              aria-pressed={selected}
              className={selected ? 'wbn-theme-card wbn-theme-card-selected' : 'wbn-theme-card'}
              key={theme.id}
              type="button"
              onClick={() => setThemeId(theme.id)}
              whileTap={{ scale: 0.985 }}
            >
              <span className="wbn-theme-preview">
                <span style={{ background: theme.palettes.light.canvas }} />
                <span style={{ background: theme.palettes.dark.canvas }} />
                <i style={{ background: theme.palettes[colorMode].panel }} />
              </span>
              <span className="wbn-theme-card-copy">
                <span>{theme.name[locale]}</span>
                <small>{theme.description[locale]}</small>
              </span>
              {selected ? (
                <IconFrame className="wbn-theme-check">
                  <Check size={12} />
                </IconFrame>
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

function AboutSettings() {
  const { t } = useI18n();

  return (
    <>
      <SettingsHeading title={t('settings.about')} description={t('settings.aboutDescription')} />
      <div className="wbn-about-card">
        <IconFrame className="wbn-about-icon">
          <Languages size={22} />
        </IconFrame>
        <span>
          KhaosBox
          <small>{t('settings.webNextEdition')}</small>
        </span>
      </div>
      <dl className="wbn-about-details">
        <div>
          <dt>{t('settings.interface')}</dt>
          <dd>web-next</dd>
        </div>
        <div>
          <dt>{t('settings.themeSystem')}</dt>
          <dd>{t('settings.dualPalette')}</dd>
        </div>
      </dl>
    </>
  );
}

function SettingsHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="wbn-settings-heading">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={active ? 'wbn-segment-active' : ''} type="button" onClick={onClick}>
      {active ? (
        <motion.span
          className="wbn-segment-indicator"
          layoutId="settings-segment-indicator"
          transition={{ type: 'spring', bounce: 0.12, duration: 0.38 }}
        />
      ) : null}
      <span>{children}</span>
    </button>
  );
}

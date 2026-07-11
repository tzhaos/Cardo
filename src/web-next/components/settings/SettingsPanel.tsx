import { useMemo, useRef, useState } from 'react';
import type { PointerEventHandler } from 'react';
import {
  Check,
  CircleHelp,
  Database,
  Download,
  FileDown,
  Globe2,
  Languages,
  Moon,
  Palette,
  Settings,
  SlidersHorizontal,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { useI18n } from '../../i18n/useI18n';
import { getRegisteredWebNextThemes } from '../../themes/themeRegistry';
import type { WebNextColorMode } from '../../themes/themeRegistry';
import { ColorModeStateIcon, LanguageStateIcon } from './StateIcons';
import { IconButton, IconFrame } from '../../ui/khaos/icon-button';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import type { WorkspaceSnapshot } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import {
  exportOperationLog,
  exportWorkspaceData,
  parseWorkspaceImportFile,
} from '../../platform/hostPlatform';
import { isValidCustomSearchTemplate, type WebSearchEngineId } from '../../domain/webSearch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/primitives/select';
import { Input } from '../../ui/primitives/input';
import { Button } from '../../ui/primitives/button';
import { MotionButton } from '../../ui/primitives/motion-button';
import { ToggleGroup, ToggleGroupItem } from '../../ui/primitives/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/primitives/tabs';

type SettingsSection = 'general' | 'appearance' | 'data' | 'about';

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
  const searchEngine = usePreferencesStore((state) => state.searchEngine);
  const customSearchTemplate = usePreferencesStore((state) => state.customSearchTemplate);
  const setSearchEngine = usePreferencesStore((state) => state.setSearchEngine);
  const setCustomSearchTemplate = usePreferencesStore((state) => state.setCustomSearchTemplate);
  const { t } = useI18n();
  const themes = useMemo(() => getRegisteredWebNextThemes(), []);
  const sections = [
    { id: 'general' as const, icon: SlidersHorizontal, label: t('settings.general') },
    { id: 'appearance' as const, icon: Palette, label: t('settings.appearance') },
    { id: 'data' as const, icon: Database, label: t('settings.data') },
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
      <Tabs
        className="wbn-settings-layout"
        value={section}
        onValueChange={(value) => setSection(value as SettingsSection)}
      >
        <TabsList className="wbn-settings-nav" aria-label={t('settings.sections')}>
          {sections.map(({ id, icon: Icon, label }) => (
            <TabsTrigger
              key={id}
              value={id}
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
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent
          className="wbn-settings-content wbn-custom-scrollbar"
          value={section}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={section}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.16 }}
            >
              {section === 'general' ? (
                <GeneralSettings
                  locale={locale}
                  setLocale={setLocale}
                  searchEngine={searchEngine}
                  customSearchTemplate={customSearchTemplate}
                  setSearchEngine={setSearchEngine}
                  setCustomSearchTemplate={setCustomSearchTemplate}
                />
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
              {section === 'data' ? <DataSettings /> : null}
              {section === 'about' ? <AboutSettings /> : null}
            </motion.section>
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DataSettings() {
  const importWorkspace = useWorkspaceStore((state) => state.importWorkspace);
  const selectBox = useUiStore((state) => state.selectBox);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{
    snapshot: WorkspaceSnapshot;
    fileName: string;
  } | null>(null);
  const [importError, setImportError] = useState(false);
  const { t } = useI18n();

  const readImportFile = async (file: File) => {
    try {
      const parsed = await parseWorkspaceImportFile(file);
      setImportError(false);
      setPendingImport(parsed);
    } catch {
      setPendingImport(null);
      setImportError(true);
    }
  };

  return (
    <>
      <SettingsHeading title={t('settings.data')} description={t('settings.dataDescription')} />
      <div className="wbn-data-actions">
        <Button variant="card" onClick={() => void exportWorkspaceData()}>
          <IconFrame>
            <Download size={18} />
          </IconFrame>
          <span>
            {t('settings.exportData')}
            <small>{t('settings.exportDataDescription')}</small>
          </span>
        </Button>
        <Button variant="card" onClick={() => inputRef.current?.click()}>
          <IconFrame>
            <Upload size={18} />
          </IconFrame>
          <span>
            {t('settings.importData')}
            <small>{t('settings.importDataDescription')}</small>
          </span>
        </Button>
        <Button variant="card" onClick={() => void exportOperationLog()}>
          <IconFrame>
            <FileDown size={18} />
          </IconFrame>
          <span>
            {t('settings.exportLog')}
            <small>{t('settings.exportLogDescription')}</small>
          </span>
        </Button>
      </div>
      <input
        className="wbn-data-file-input"
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void readImportFile(file);
          event.currentTarget.value = '';
        }}
      />
      {importError ? <p className="wbn-data-error">{t('settings.importInvalid')}</p> : null}
      <AnimatePresence>
        {pendingImport ? (
          <motion.div
            className="wbn-data-import-confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
          >
            <span>
              {t('settings.importConfirm')}
              <small>{pendingImport.fileName}</small>
            </span>
            <div>
              <Button variant="ghost" onClick={() => setPendingImport(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                className="wbn-data-import-confirm-button"
                variant="default"
                onClick={() => {
                  importWorkspace(pendingImport.snapshot);
                  selectBox(null);
                  setPendingImport(null);
                }}
              >
                {t('settings.importReplace')}
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function GeneralSettings({
  locale,
  setLocale,
  searchEngine,
  customSearchTemplate,
  setSearchEngine,
  setCustomSearchTemplate,
}: {
  locale: 'en' | 'zh';
  setLocale: (locale: 'en' | 'zh') => void;
  searchEngine: WebSearchEngineId;
  customSearchTemplate: string;
  setSearchEngine: (searchEngine: WebSearchEngineId) => void;
  setCustomSearchTemplate: (customSearchTemplate: string) => void;
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
        <ToggleGroup
          aria-label={t('settings.language')}
          type="single"
          value={locale}
          onValueChange={(value) => value && setLocale(value as 'en' | 'zh')}
        >
          <SegmentButton active={locale === 'en'} value="en">
            EN
          </SegmentButton>
          <SegmentButton active={locale === 'zh'} value="zh">
            文
          </SegmentButton>
        </ToggleGroup>
      </div>
      <div className="wbn-settings-subheading">
        <span>{t('settings.searchEngine')}</span>
        <small>{t('settings.searchEngineDescription')}</small>
      </div>
      <div className="wbn-settings-card wbn-search-engine-settings">
        <div className="wbn-settings-card-copy">
          <IconFrame>
            <Globe2 size={18} />
          </IconFrame>
          <span>{t('settings.searchEngine')}</span>
        </div>
        <Select
          value={searchEngine}
          onValueChange={(value) => setSearchEngine(value as WebSearchEngineId)}
        >
          <SelectTrigger aria-label={t('settings.searchEngine')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="bing-cn">{t('settings.searchEngine.bingCn')}</SelectItem>
            <SelectItem value="bing">{t('settings.searchEngine.bing')}</SelectItem>
            <SelectItem value="baidu">{t('settings.searchEngine.baidu')}</SelectItem>
            <SelectItem value="google">{t('settings.searchEngine.google')}</SelectItem>
            <SelectItem value="custom">{t('settings.searchEngine.custom')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {searchEngine === 'custom' ? (
        <label className="wbn-custom-search-template">
          <span>{t('settings.customSearchTemplate')}</span>
          <Input
            className={
              customSearchTemplate && !isValidCustomSearchTemplate(customSearchTemplate)
                ? 'wbn-custom-search-template-invalid'
                : undefined
            }
            value={customSearchTemplate}
            onChange={(event) => setCustomSearchTemplate(event.target.value)}
            placeholder={t('settings.customSearchTemplatePlaceholder')}
          />
          <small>{t('settings.customSearchTemplateHint')}</small>
        </label>
      ) : null}
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
        <ToggleGroup
          aria-label={t('settings.mode')}
          type="single"
          value={colorMode}
          onValueChange={(value) => value && setColorMode(value as WebNextColorMode)}
        >
          <SegmentButton active={colorMode === 'light'} value="light">
            <Sun size={14} />
            {t('settings.light')}
          </SegmentButton>
          <SegmentButton active={colorMode === 'dark'} value="dark">
            <Moon size={14} />
            {t('settings.dark')}
          </SegmentButton>
        </ToggleGroup>
      </div>
      <div className="wbn-settings-subheading">
        <span>{t('settings.theme')}</span>
        <small>{t('settings.themeDescription')}</small>
      </div>
      <ToggleGroup
        className="wbn-theme-grid"
        type="single"
        variant="plain"
        value={themeId}
        onValueChange={(value) => value && setThemeId(value)}
        aria-label={t('settings.theme')}
      >
        {themes.map((theme) => {
          const selected = theme.id === themeId;
          return (
            <ToggleGroupItem asChild key={theme.id} value={theme.id}>
              <MotionButton
                variant="card"
                className={selected ? 'wbn-theme-card wbn-theme-card-selected' : 'wbn-theme-card'}
                type="button"
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
              </MotionButton>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
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
  value,
}: {
  active: boolean;
  children: React.ReactNode;
  value: string;
}) {
  return (
    <ToggleGroupItem value={value}>
      <motion.span
        className="wbn-segment-indicator"
        initial={false}
        animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.94 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.55 }}
      />
      <span>{children}</span>
    </ToggleGroupItem>
  );
}

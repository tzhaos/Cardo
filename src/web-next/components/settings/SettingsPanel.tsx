import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEventHandler } from 'react';
import {
  Check,
  CircleHelp,
  Database,
  Download,
  FileDown,
  Globe2,
  Languages,
  LayoutGrid,
  Moon,
  Palette,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { useI18n } from '../../i18n/useI18n';
import { getRegisteredWebNextThemes, getThemePack } from '../../themes/themeRegistry';
import type { WebNextColorMode } from '../../themes/themeRegistry';
import { parseThemePackImportFile } from '../../themes/themeIO';
import { ColorModeStateIcon, LanguageStateIcon } from './StateIcons';
import { IconButton, IconFrame } from '../../ui/cardo/icon-button';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import type { WorkspaceProjection } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import { useFeatureEnabled } from '../../shell/FeatureGate';
import {
  exportOperationLog,
  exportThemePackFile,
  exportWorkspaceData,
  parseWorkspaceImportFile,
} from '../../platform/hostPlatform';
import { isValidCustomSearchTemplate, type WebSearchEngineId } from '../../domain/webSearch';
import {
  FEATURE_CATALOG,
  type FeatureDefinition,
  type FeatureId,
} from '../../../core/contracts/featureCatalog';
import { validateCssSnippet } from '../../../core/contracts/cssSnippet';
import {
  LAYOUT_PROFILES,
  layoutProfileIdSchema,
} from '../../../core/contracts/layoutProfile';
import {
  colorModeSchema,
  densitySchema,
  fontFamilyIdSchema,
  fontScaleSchema,
  preferenceLocaleSchema,
  webSearchEngineIdSchema,
  type Density,
  type FontFamilyId,
  type FontScale,
} from '../../../core/contracts/preferences';
import {
  overridableColorKeys,
  type OverridableColorKey,
} from '../../../core/contracts/themePack';
import type { WebNextMessageKey } from '../../i18n/messages';

const COLOR_OVERRIDE_LABEL_KEYS = {
  canvas: 'settings.colorOverride.canvas',
  panel: 'settings.colorOverride.panel',
  surface: 'settings.colorOverride.surface',
  text: 'settings.colorOverride.text',
  blue: 'settings.colorOverride.blue',
  createBackground: 'settings.colorOverride.createBackground',
} as const satisfies Record<OverridableColorKey, WebNextMessageKey>;
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/primitives/select';
import { Input } from '../../ui/primitives/input';
import { Textarea } from '../../ui/primitives/textarea';
import { Button } from '../../ui/primitives/button';
import { MotionButton } from '../../ui/primitives/motion-button';
import { ToggleGroup, ToggleGroupItem } from '../../ui/primitives/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/primitives/tabs';

type SettingsSection = 'general' | 'interface' | 'appearance' | 'data' | 'about';

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
  const fontFamily = usePreferencesStore((state) => state.fontFamily);
  const fontScale = usePreferencesStore((state) => state.fontScale);
  const density = usePreferencesStore((state) => state.density);
  const setFontFamily = usePreferencesStore((state) => state.setFontFamily);
  const setFontScale = usePreferencesStore((state) => state.setFontScale);
  const setDensity = usePreferencesStore((state) => state.setDensity);
  const importedThemePacks = usePreferencesStore((state) => state.importedThemePacks);
  const searchEngine = usePreferencesStore((state) => state.searchEngine);
  const customSearchTemplate = usePreferencesStore((state) => state.customSearchTemplate);
  const setSearchEngine = usePreferencesStore((state) => state.setSearchEngine);
  const setCustomSearchTemplate = usePreferencesStore((state) => state.setCustomSearchTemplate);
  const { t } = useI18n();
  const themes = useMemo(() => getRegisteredWebNextThemes(), [importedThemePacks]);
  const sections = [
    { id: 'general' as const, icon: SlidersHorizontal, label: t('settings.general') },
    { id: 'interface' as const, icon: LayoutGrid, label: t('settings.interface') },
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
            <TabsTrigger key={id} value={id}>
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
        <TabsContent className="wbn-settings-content wbn-custom-scrollbar" value={section}>
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
              {section === 'interface' ? <InterfaceSettings /> : null}
              {section === 'appearance' ? (
                <AppearanceSettings
                  colorMode={colorMode}
                  locale={locale}
                  setColorMode={setColorMode}
                  setThemeId={setThemeId}
                  themeId={themeId}
                  themes={themes}
                  fontFamily={fontFamily}
                  fontScale={fontScale}
                  density={density}
                  setFontFamily={setFontFamily}
                  setFontScale={setFontScale}
                  setDensity={setDensity}
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

function InterfaceSettings() {
  const { t } = useI18n();
  const featureFlags = usePreferencesStore((state) => state.featureFlags);
  const setFeatureEnabled = usePreferencesStore((state) => state.setFeatureEnabled);
  const resetFeatureFlags = usePreferencesStore((state) => state.resetFeatureFlags);
  const layoutProfileId = usePreferencesStore((state) => state.layoutProfileId);
  const setLayoutProfileId = usePreferencesStore((state) => state.setLayoutProfileId);
  const cssSnippet = usePreferencesStore((state) => state.cssSnippet);
  const cssSnippetEnabled = usePreferencesStore((state) => state.cssSnippetEnabled);
  const setCssSnippet = usePreferencesStore((state) => state.setCssSnippet);
  const setCssSnippetEnabled = usePreferencesStore((state) => state.setCssSnippetEnabled);
  const [snippetDraft, setSnippetDraft] = useState(cssSnippet);
  const [snippetError, setSnippetError] = useState(false);
  const hasOverrides = Object.keys(featureFlags).length > 0;

  useEffect(() => {
    setSnippetDraft(cssSnippet);
  }, [cssSnippet]);

  const commitSnippet = (value: string) => {
    const result = validateCssSnippet(value);
    if (!result.ok && value.trim()) {
      setSnippetError(true);
      return;
    }
    setSnippetError(false);
    setCssSnippet(result.sanitized);
  };

  return (
    <>
      <SettingsHeading
        title={t('settings.interface')}
        description={t('settings.interfaceDescription')}
      />
      <div className="wbn-settings-subheading">
        <span>{t('settings.layout')}</span>
        <small>{t('settings.layoutDescription')}</small>
      </div>
      <ToggleGroup
        className="wbn-theme-grid"
        type="single"
        variant="plain"
        value={layoutProfileId}
        onValueChange={(value) => value && setLayoutProfileId(layoutProfileIdSchema.parse(value))}
        aria-label={t('settings.layout')}
      >
        {LAYOUT_PROFILES.map((profile) => {
          const selected = profile.id === layoutProfileId;
          return (
            <ToggleGroupItem asChild key={profile.id} value={profile.id}>
              <MotionButton
                variant="card"
                className={selected ? 'wbn-theme-card wbn-theme-card-selected' : 'wbn-theme-card'}
                type="button"
                whileTap={{ scale: 0.985 }}
              >
                <span className="wbn-theme-card-copy">
                  <span>
                    {t(profile.labelKey as WebNextMessageKey)}
                    {profile.isOfficialDefault ? (
                      <em className="wbn-theme-official-badge">{t('settings.themeOfficial')}</em>
                    ) : null}
                  </span>
                  <small>{t(profile.descriptionKey as WebNextMessageKey)}</small>
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

      <div className="wbn-settings-subheading">
        <span>{t('settings.features')}</span>
        <small>{t('settings.featuresDescription')}</small>
      </div>
      {FEATURE_CATALOG.map((feature) => (
        <FeatureFlagRow
          key={feature.id}
          feature={feature}
          onToggle={setFeatureEnabled}
        />
      ))}
      {hasOverrides ? (
        <Button
          variant="ghost"
          className="wbn-theme-reset-button"
          onClick={() => resetFeatureFlags()}
        >
          <RotateCcw size={14} />
          {t('settings.resetFeatures')}
        </Button>
      ) : null}

      <div className="wbn-settings-subheading">
        <span>{t('settings.cssSnippet')}</span>
        <small>{t('settings.cssSnippetDescription')}</small>
      </div>
      <div className="wbn-settings-card">
        <div className="wbn-settings-card-copy">
          <span>
            {t('settings.cssSnippetEnabled')}
            <small>{t('settings.cssSnippetHint')}</small>
          </span>
        </div>
        <ToggleGroup
          aria-label={t('settings.cssSnippetEnabled')}
          type="single"
          value={cssSnippetEnabled ? 'on' : 'off'}
          onValueChange={(next) => {
            if (!next) return;
            setCssSnippetEnabled(next === 'on');
          }}
        >
          <SegmentButton active={!cssSnippetEnabled} value="off">
            {t('settings.optionOff')}
          </SegmentButton>
          <SegmentButton active={cssSnippetEnabled} value="on">
            {t('settings.optionOn')}
          </SegmentButton>
        </ToggleGroup>
      </div>
      <label className="wbn-custom-search-template">
        <span>{t('settings.cssSnippet')}</span>
        <Textarea
          className={snippetError ? 'wbn-custom-search-template-invalid' : undefined}
          value={snippetDraft}
          onChange={(event) => {
            setSnippetDraft(event.target.value);
            setSnippetError(false);
          }}
          onBlur={() => commitSnippet(snippetDraft)}
          placeholder={t('settings.cssSnippetPlaceholder')}
          rows={8}
        />
        {snippetError ? <small>{t('settings.cssSnippetInvalid')}</small> : null}
      </label>
    </>
  );
}

function FeatureFlagRow({
  feature,
  onToggle,
}: {
  feature: FeatureDefinition;
  onToggle: (featureId: FeatureId, enabled: boolean) => void;
}) {
  const { t } = useI18n();
  const enabled = useFeatureEnabled(feature.id);
  const label = t(feature.labelKey as WebNextMessageKey);
  const description = t(feature.descriptionKey as WebNextMessageKey);

  return (
    <div className="wbn-settings-card">
      <div className="wbn-settings-card-copy">
        <span>
          {label}
          <small>{description}</small>
        </span>
      </div>
      <ToggleGroup
        aria-label={label}
        type="single"
        value={enabled ? 'on' : 'off'}
        onValueChange={(next) => {
          if (!next) return;
          onToggle(feature.id, next === 'on');
        }}
      >
        <SegmentButton active={!enabled} value="off">
          {t('settings.optionOff')}
        </SegmentButton>
        <SegmentButton active={enabled} value="on">
          {t('settings.optionOn')}
        </SegmentButton>
      </ToggleGroup>
    </div>
  );
}

function DataSettings() {
  const importWorkspace = useWorkspaceStore((state) => state.importWorkspace);
  const selectBox = useUiStore((state) => state.selectBox);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{
    workspace: WorkspaceProjection;
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
      <Input
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
                  importWorkspace(pendingImport.workspace);
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
          onValueChange={(value) => value && setLocale(preferenceLocaleSchema.parse(value))}
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
          onValueChange={(value) => setSearchEngine(webSearchEngineIdSchema.parse(value))}
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
  fontFamily,
  fontScale,
  density,
  setFontFamily,
  setFontScale,
  setDensity,
}: {
  colorMode: WebNextColorMode;
  locale: 'en' | 'zh';
  setColorMode: (colorMode: WebNextColorMode) => void;
  setThemeId: (themeId: string) => void;
  themeId: string;
  themes: ReturnType<typeof getRegisteredWebNextThemes>;
  fontFamily: FontFamilyId;
  fontScale: FontScale;
  density: Density;
  setFontFamily: (fontFamily: FontFamilyId) => void;
  setFontScale: (fontScale: FontScale) => void;
  setDensity: (density: Density) => void;
}) {
  const { t } = useI18n();
  const themeColorOverrides = usePreferencesStore((state) => state.themeColorOverrides);
  const themeOptionValues = usePreferencesStore((state) => state.themeOptionValues);
  const setThemeColorOverride = usePreferencesStore((state) => state.setThemeColorOverride);
  const resetThemeColorOverrides = usePreferencesStore((state) => state.resetThemeColorOverrides);
  const setThemeOptionValue = usePreferencesStore((state) => state.setThemeOptionValue);
  const resetThemeOptionValues = usePreferencesStore((state) => state.resetThemeOptionValues);
  const importThemePack = usePreferencesStore((state) => state.importThemePack);
  const removeImportedThemePack = usePreferencesStore((state) => state.removeImportedThemePack);
  const themeImportRef = useRef<HTMLInputElement>(null);
  const [themeImportError, setThemeImportError] = useState(false);
  const activePack = useMemo(() => getThemePack(themeId), [themeId, themes]);
  const modeOverrides = themeColorOverrides[themeId]?.[colorMode] ?? {};
  const hasColorOverrides = Object.keys(modeOverrides).length > 0;
  const hasOptionOverrides = Object.keys(themeOptionValues).length > 0;

  const onImportThemeFile = async (file: File) => {
    try {
      const pack = await parseThemePackImportFile(file);
      importThemePack(pack);
      setThemeImportError(false);
    } catch {
      setThemeImportError(true);
    }
  };

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
          onValueChange={(value) => value && setColorMode(colorModeSchema.parse(value))}
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
                  <span>
                    {theme.name[locale]}
                    {theme.official ? (
                      <em className="wbn-theme-official-badge">{t('settings.themeOfficial')}</em>
                    ) : null}
                  </span>
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
      <div className="wbn-data-actions wbn-theme-pack-actions">
        <Button variant="card" onClick={() => exportThemePackFile(themeId)}>
          <IconFrame>
            <Download size={18} />
          </IconFrame>
          <span>
            {t('settings.exportTheme')}
            <small>{t('settings.exportThemeDescription')}</small>
          </span>
        </Button>
        <Button variant="card" onClick={() => themeImportRef.current?.click()}>
          <IconFrame>
            <Upload size={18} />
          </IconFrame>
          <span>
            {t('settings.importTheme')}
            <small>{t('settings.importThemeDescription')}</small>
          </span>
        </Button>
        {!activePack || themes.find((entry) => entry.id === themeId)?.official ? null : (
          <Button variant="card" onClick={() => removeImportedThemePack(themeId)}>
            <IconFrame>
              <X size={18} />
            </IconFrame>
            <span>
              {t('settings.removeImportedTheme')}
              <small>{t('settings.removeImportedThemeDescription')}</small>
            </span>
          </Button>
        )}
      </div>
      <input
        ref={themeImportRef}
        type="file"
        accept=".json,.cardo-theme.json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void onImportThemeFile(file);
        }}
      />
      {themeImportError ? <p className="wbn-import-error">{t('settings.importThemeInvalid')}</p> : null}

      {(activePack.options?.length ?? 0) > 0 ? (
        <>
          <div className="wbn-settings-subheading">
            <span>{t('settings.themeOptions')}</span>
            <small>{t('settings.themeOptionsDescription')}</small>
          </div>
          {activePack.options!.map((option) => {
            if (option.type === 'toggle') {
              const value =
                typeof themeOptionValues[option.id] === 'boolean'
                  ? (themeOptionValues[option.id] as boolean)
                  : option.default;
              return (
                <div className="wbn-settings-card" key={option.id}>
                  <div className="wbn-settings-card-copy">
                    <span>
                      {option.label[locale]}
                      {option.description ? <small>{option.description[locale]}</small> : null}
                    </span>
                  </div>
                  <ToggleGroup
                    aria-label={option.label[locale]}
                    type="single"
                    value={value ? 'on' : 'off'}
                    onValueChange={(next) => {
                      if (!next) return;
                      setThemeOptionValue(option.id, next === 'on');
                    }}
                  >
                    <SegmentButton active={!value} value="off">
                      {t('settings.optionOff')}
                    </SegmentButton>
                    <SegmentButton active={value} value="on">
                      {t('settings.optionOn')}
                    </SegmentButton>
                  </ToggleGroup>
                </div>
              );
            }
            const value =
              typeof themeOptionValues[option.id] === 'string'
                ? (themeOptionValues[option.id] as string)
                : option.default;
            return (
              <div className="wbn-settings-card" key={option.id}>
                <div className="wbn-settings-card-copy">
                  <span>
                    {option.label[locale]}
                    {option.description ? <small>{option.description[locale]}</small> : null}
                  </span>
                </div>
                <Select
                  value={value}
                  onValueChange={(next) => setThemeOptionValue(option.id, next)}
                >
                  <SelectTrigger aria-label={option.label[locale]} className="wbn-settings-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {option.choices.map((choice) => (
                      <SelectItem key={choice.id} value={choice.id}>
                        {choice.label[locale]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
          {hasOptionOverrides ? (
            <Button
              variant="ghost"
              className="wbn-theme-reset-button"
              onClick={() => resetThemeOptionValues()}
            >
              <RotateCcw size={14} />
              {t('settings.resetThemeOptions')}
            </Button>
          ) : null}
        </>
      ) : null}

      <div className="wbn-settings-subheading">
        <span>{t('settings.colorOverrides')}</span>
        <small>{t('settings.colorOverridesDescription')}</small>
      </div>
      <div className="wbn-theme-color-grid">
        {overridableColorKeys.map((key) => {
          const base =
            activePack.tokens.colors[colorMode]?.[key] ??
            activePack.tokens.colors[colorMode]?.blue ??
            '#3b82f6';
          const current = modeOverrides[key] ?? base;
          const pickerValue = toHexColor(current) ?? '#3b82f6';
          return (
            <label className="wbn-theme-color-field" key={key}>
              <span>{t(COLOR_OVERRIDE_LABEL_KEYS[key])}</span>
              <span className="wbn-theme-color-controls">
                <input
                  type="color"
                  value={pickerValue}
                  onChange={(event) => setThemeColorOverride(colorMode, key, event.target.value)}
                  aria-label={t(COLOR_OVERRIDE_LABEL_KEYS[key])}
                />
                <Input
                  value={modeOverrides[key] ?? ''}
                  placeholder={String(base)}
                  onChange={(event) => {
                    const next = event.target.value.trim();
                    setThemeColorOverride(colorMode, key as OverridableColorKey, next || null);
                  }}
                />
              </span>
            </label>
          );
        })}
      </div>
      {hasColorOverrides ? (
        <Button
          variant="ghost"
          className="wbn-theme-reset-button"
          onClick={() => resetThemeColorOverrides(themeId)}
        >
          <RotateCcw size={14} />
          {t('settings.resetColorOverrides')}
        </Button>
      ) : null}

      <div className="wbn-settings-subheading">
        <span>{t('settings.typography')}</span>
        <small>{t('settings.typographyDescription')}</small>
      </div>
      <div className="wbn-settings-card">
        <div className="wbn-settings-card-copy">
          <IconFrame>
            <Languages size={16} />
          </IconFrame>
          <span>
            {t('settings.fontFamily')}
            <small>{t('settings.fontFamilyDescription')}</small>
          </span>
        </div>
        <Select
          value={fontFamily}
          onValueChange={(value) => setFontFamily(fontFamilyIdSchema.parse(value))}
        >
          <SelectTrigger aria-label={t('settings.fontFamily')} className="wbn-settings-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="default">{t('settings.fontFamily.default')}</SelectItem>
            <SelectItem value="system-ui">{t('settings.fontFamily.systemUi')}</SelectItem>
            <SelectItem value="serif">{t('settings.fontFamily.serif')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="wbn-settings-card">
        <div className="wbn-settings-card-copy">
          <span>
            {t('settings.fontScale')}
            <small>{t('settings.fontScaleDescription')}</small>
          </span>
        </div>
        <ToggleGroup
          aria-label={t('settings.fontScale')}
          type="single"
          value={fontScale}
          onValueChange={(value) => value && setFontScale(fontScaleSchema.parse(value))}
        >
          <SegmentButton active={fontScale === 'sm'} value="sm">
            {t('settings.fontScale.sm')}
          </SegmentButton>
          <SegmentButton active={fontScale === 'md'} value="md">
            {t('settings.fontScale.md')}
          </SegmentButton>
          <SegmentButton active={fontScale === 'lg'} value="lg">
            {t('settings.fontScale.lg')}
          </SegmentButton>
        </ToggleGroup>
      </div>
      <div className="wbn-settings-card">
        <div className="wbn-settings-card-copy">
          <span>
            {t('settings.density')}
            <small>{t('settings.densityDescription')}</small>
          </span>
        </div>
        <ToggleGroup
          aria-label={t('settings.density')}
          type="single"
          value={density}
          onValueChange={(value) => value && setDensity(densitySchema.parse(value))}
        >
          <SegmentButton active={density === 'compact'} value="compact">
            {t('settings.density.compact')}
          </SegmentButton>
          <SegmentButton active={density === 'comfortable'} value="comfortable">
            {t('settings.density.comfortable')}
          </SegmentButton>
          <SegmentButton active={density === 'spacious'} value="spacious">
            {t('settings.density.spacious')}
          </SegmentButton>
        </ToggleGroup>
      </div>
    </>
  );
}

function toHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
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
          Cardo
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
          <dd>{t('settings.tokenThemePack')}</dd>
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

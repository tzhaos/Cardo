import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEventHandler, ReactNode } from 'react';
import cardoMarkUrl from '../../../../assets/brand/cardo-mark.svg';
import { AnimatePresence, motion } from 'motion/react';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { useI18n } from '../../i18n/useI18n';
import type { WebNextColorMode } from '../../themes/themeRegistry';
import {
  getRegisteredWebNextThemes,
  getThemePack,
  OFFICIAL_DEFAULT_THEME_ID,
} from '../../themes/themeRegistry';
import { resolveEffectiveThemeTokens } from '../../themes/resolveTheme';
import { SettingsNavIcon } from './SettingsNavIcons';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import type { WorkspaceProjection } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import {
  exportOperationLog,
  exportWorkspaceData,
  parseWorkspaceImportFile,
} from '../../platform/hostPlatform';
import { isValidCustomSearchTemplate, type WebSearchEngineId } from '../../domain/webSearch';
import {
  colorModeSchema,
  preferenceLocaleSchema,
  webSearchEngineIdSchema,
} from '../../../core/contracts/preferences';
import type { DesktopUpdateState } from '../../../core/contracts/desktopUpdate';
import { FEATURE_CATALOG, isFeatureEnabled } from '../../../core/contracts/featureCatalog';
import { overridableColorKeys, type OverridableColorKey } from '../../../core/contracts/themePack';
import { COLOR_OVERRIDE_PRESETS, isColorPresetActive } from './colorPresets';
import { getThemeLookPresets, matchThemeLookId, type ThemeLookPreset } from './themeLookPresets';
import { matchSettingsSearchEntries, type SettingsSectionId } from './settingsSearchCatalog';
import { Button } from '../../kit/button';
import { IconButton, IconFrame } from '../../kit/icon-button';
import { Input } from '../../kit/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../kit/select';
import { SettingsCard, SettingsRow } from '../../kit/settings-form';
import { Switch } from '../../kit/switch';
import { Tabs, TabsList, TabsTrigger } from '../../kit/tabs';
import { ThemeIcon } from '../../kit/icon';
import { ToggleGroup, ToggleGroupItem } from '../../kit/toggle-group';
import type { WebNextMessageKey } from '../../i18n/messages';

type SettingsSection = SettingsSectionId;

export type SettingsPanelChrome = 'window' | 'embedded';

export const SETTINGS_SECTION_IDS = [
  'general',
  'appearance',
  'data',
  'about',
] as const satisfies readonly SettingsSectionId[];

/**
 * Section bodies + in-panel search results only.
 * No drag header, close control, or left section rail (owned by SettingsShell).
 */
export function SettingsContent({
  section,
  searchQuery = '',
  onOpenSearchResult,
}: {
  section: SettingsSectionId;
  searchQuery?: string;
  onOpenSearchResult?: (section: SettingsSectionId) => void;
}) {
  const colorMode = usePreferencesStore((state) => state.colorMode);
  const locale = usePreferencesStore((state) => state.locale);
  const setColorMode = usePreferencesStore((state) => state.setColorMode);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const searchEngine = usePreferencesStore((state) => state.searchEngine);
  const customSearchTemplate = usePreferencesStore((state) => state.customSearchTemplate);
  const setSearchEngine = usePreferencesStore((state) => state.setSearchEngine);
  const setCustomSearchTemplate = usePreferencesStore((state) => state.setCustomSearchTemplate);
  const { t, locale: i18nLocale } = useI18n();
  const sections = [
    { id: 'general' as const, label: t('settings.general') },
    { id: 'appearance' as const, label: t('settings.appearance') },
    { id: 'data' as const, label: t('settings.data') },
    { id: 'about' as const, label: t('settings.about') },
  ];
  const sectionLabel = (id: SettingsSection) =>
    sections.find((entry) => entry.id === id)?.label ?? id;
  const isSearching = searchQuery.trim().length > 0;
  const searchResults = useMemo(
    () => matchSettingsSearchEntries(searchQuery, i18nLocale, t),
    [i18nLocale, searchQuery, t],
  );

  return (
    <div className="cardo-settings-content cardo-custom-scrollbar">
      {isSearching ? (
        <div
          className="cardo-settings-search-results"
          role="listbox"
          aria-label={t('settings.search')}
        >
          {searchResults.length === 0 ? (
            <p className="cardo-settings-search-empty">{t('settings.searchNoResults')}</p>
          ) : (
            searchResults.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="cardo-settings-search-result"
                role="option"
                onClick={() => onOpenSearchResult?.(entry.section)}
              >
                <span className="cardo-settings-search-result-copy">
                  <strong>{t(entry.titleKey)}</strong>
                  {entry.descriptionKey ? <small>{t(entry.descriptionKey)}</small> : null}
                  <em>{t('settings.searchInSection', { section: sectionLabel(entry.section) })}</em>
                </span>
                <ThemeIcon name="chevronRight" size={16} />
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="cardo-settings-tab-content">
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
                <AppearanceSettings colorMode={colorMode} setColorMode={setColorMode} />
              ) : null}
              {section === 'data' ? <DataSettings /> : null}
              {section === 'about' ? <AboutSettings /> : null}
            </motion.section>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/**
 * Product settings body wrapper. Production settings chrome is SettingsShell + SettingsContent;
 * chrome=embedded is the only path SettingsShell needs. chrome=window is residual header/rail
 * markup (no floating host mounts this after PR10).
 */
export function SettingsPanel({
  onClose,
  onHeaderPointerDown,
  chrome = 'window',
  section: sectionProp,
  onSectionChange,
  searchQuery: searchQueryProp,
  onSearchQueryChange,
}: {
  onClose: () => void;
  onHeaderPointerDown?: PointerEventHandler<HTMLElement>;
  /** embedded: body only for SettingsShell; window: residual self-chrome (unused host). */
  chrome?: SettingsPanelChrome;
  section?: SettingsSectionId;
  onSectionChange?: (section: SettingsSectionId) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}) {
  const [internalSection, setInternalSection] = useState<SettingsSection>('general');
  const [internalQuery, setInternalQuery] = useState('');
  const section = sectionProp ?? internalSection;
  const setSection = (next: SettingsSection) => {
    if (onSectionChange) onSectionChange(next);
    else setInternalSection(next);
  };
  const settingsQuery = searchQueryProp ?? internalQuery;
  const setSettingsQuery = (next: string) => {
    if (onSearchQueryChange) onSearchQueryChange(next);
    else setInternalQuery(next);
  };
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const sections = [
    { id: 'general' as const, label: t('settings.general') },
    { id: 'appearance' as const, label: t('settings.appearance') },
    { id: 'data' as const, label: t('settings.data') },
    { id: 'about' as const, label: t('settings.about') },
  ];
  const isSearching = settingsQuery.trim().length > 0;

  const openSearchResult = (nextSection: SettingsSection) => {
    setSection(nextSection);
    setSettingsQuery('');
  };

  if (chrome === 'embedded') {
    return (
      <div
        className="cardo-settings-panel cardo-settings-panel-embedded"
        role="region"
        aria-label={t('settings.title')}
      >
        <SettingsContent
          section={section}
          searchQuery={settingsQuery}
          onOpenSearchResult={openSearchResult}
        />
      </div>
    );
  }

  return (
    <div className="cardo-settings-panel" role="dialog" aria-label={t('settings.title')}>
      <header className="cardo-settings-header" onPointerDown={onHeaderPointerDown}>
        <div className="cardo-settings-header-title">
          <IconFrame>
            <ThemeIcon name="settings" size={17} />
          </IconFrame>
          <span>{t('settings.title')}</span>
        </div>
        <div className="cardo-settings-header-drag-space" aria-hidden="true" />
        <div className="cardo-settings-header-actions">
          <label className="cardo-settings-search" data-no-menu-drag>
            <span className="cardo-settings-search-icon" aria-hidden>
              <ThemeIcon name="search" size={16} />
            </span>
            <Input
              ref={searchInputRef}
              value={settingsQuery}
              onChange={(event) => setSettingsQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && settingsQuery) {
                  event.stopPropagation();
                  setSettingsQuery('');
                }
              }}
              placeholder={t('settings.searchPlaceholder')}
              aria-label={t('settings.search')}
              data-no-menu-drag
            />
            {settingsQuery ? (
              <button
                type="button"
                className="cardo-settings-search-clear"
                data-no-menu-drag
                aria-label={t('common.close')}
                onClick={() => setSettingsQuery('')}
              >
                <ThemeIcon name="close" size={14} />
              </button>
            ) : null}
          </label>
          <IconButton data-no-menu-drag onClick={onClose} aria-label={t('common.close')}>
            <ThemeIcon name="close" size={16} />
          </IconButton>
        </div>
      </header>
      <Tabs
        className="cardo-settings-layout"
        value={section}
        onValueChange={(value) => {
          setSection(value as SettingsSection);
          setSettingsQuery('');
        }}
      >
        <TabsList className="cardo-settings-nav" aria-label={t('settings.sections')}>
          {sections.map(({ id, label }) => (
            <TabsTrigger key={id} value={id}>
              {section === id && !isSearching ? (
                <span className="cardo-settings-nav-indicator" aria-hidden />
              ) : null}
              <SettingsNavIcon id={id} />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <SettingsContent
          section={section}
          searchQuery={settingsQuery}
          onOpenSearchResult={openSearchResult}
        />
      </Tabs>
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

      <SettingsCard
        head={t('settings.workspaceBackup')}
        description={t('settings.workspaceBackupDescription')}
      >
        <SettingsRow
          icon={
            <IconFrame>
              <ThemeIcon name="download" size={16} />
            </IconFrame>
          }
          title={t('settings.exportData')}
          description={t('settings.exportDataDescription')}
          control={
            <Button
              type="button"
              variant="ghost"
              className="cardo-settings-secondary-button"
              onClick={() => void exportWorkspaceData()}
            >
              {t('settings.exportDataAction')}
            </Button>
          }
        />
        <SettingsRow
          icon={
            <IconFrame>
              <ThemeIcon name="upload" size={16} />
            </IconFrame>
          }
          title={t('settings.importData')}
          description={t('settings.importDataDescription')}
          control={
            <Button
              type="button"
              variant="ghost"
              className="cardo-settings-secondary-button"
              onClick={() => inputRef.current?.click()}
            >
              {t('settings.importDataAction')}
            </Button>
          }
        />
      </SettingsCard>
      <Input
        className="cardo-data-file-input"
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void readImportFile(file);
          event.currentTarget.value = '';
        }}
      />
      {importError ? <p className="cardo-data-error">{t('settings.importInvalid')}</p> : null}
      <AnimatePresence>
        {pendingImport ? (
          <motion.div
            className="cardo-data-import-confirm"
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
                className="cardo-data-import-confirm-button"
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

      <SettingsCard
        head={t('settings.operationLog')}
        description={t('settings.operationLogDescription')}
      >
        <SettingsRow
          icon={
            <IconFrame>
              <ThemeIcon name="fileDown" size={16} />
            </IconFrame>
          }
          title={t('settings.exportLog')}
          description={t('settings.exportLogDescription')}
          control={
            <Button
              type="button"
              variant="ghost"
              className="cardo-settings-secondary-button"
              onClick={() => void exportOperationLog()}
            >
              {t('settings.exportLogAction')}
            </Button>
          }
        />
      </SettingsCard>
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
  setCustomSearchTemplate: (template: string) => void;
}) {
  const { t } = useI18n();
  const templateInvalid =
    searchEngine === 'custom' && !isValidCustomSearchTemplate(customSearchTemplate);

  return (
    <>
      <SettingsHeading
        title={t('settings.general')}
        description={t('settings.generalDescription')}
      />
      <SettingsCard>
        <SettingsRow
          title={t('settings.language')}
          description={t('settings.languageDescription')}
          control={
            <ToggleGroup
              aria-label={t('settings.language')}
              type="single"
              value={locale}
              onValueChange={(value) => value && setLocale(preferenceLocaleSchema.parse(value))}
            >
              <SegmentButton active={locale === 'zh'} value="zh">
                {t('settings.chinese')}
              </SegmentButton>
              <SegmentButton active={locale === 'en'} value="en">
                {t('settings.english')}
              </SegmentButton>
            </ToggleGroup>
          }
        />
        <SettingsRow
          title={t('settings.searchEngine')}
          description={t('settings.searchEngineDescription')}
          control={
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
          }
        />
      </SettingsCard>
      {searchEngine === 'custom' ? (
        <label className="cardo-custom-search-template">
          <span>{t('settings.customSearchTemplate')}</span>
          <Input
            className={templateInvalid ? 'cardo-custom-search-template-invalid' : undefined}
            value={customSearchTemplate}
            onChange={(event) => setCustomSearchTemplate(event.target.value)}
            placeholder={t('settings.customSearchTemplatePlaceholder')}
          />
          <small>{t('settings.customSearchTemplateHint')}</small>
        </label>
      ) : null}
      <FeatureSettings />
    </>
  );
}

function FeatureSettings() {
  const featureFlags = usePreferencesStore((state) => state.featureFlags);
  const setFeatureEnabled = usePreferencesStore((state) => state.setFeatureEnabled);
  const resetFeatureFlags = usePreferencesStore((state) => state.resetFeatureFlags);
  const { t } = useI18n();
  const hasOverrides = Object.keys(featureFlags).length > 0;

  return (
    <>
      <SettingsCard head={t('settings.features')}>
        {FEATURE_CATALOG.map((feature) => {
          const enabled = isFeatureEnabled(feature.id, featureFlags);
          const label = t(feature.labelKey as WebNextMessageKey);
          return (
            <SettingsRow
              key={feature.id}
              title={label}
              description={t(feature.descriptionKey as WebNextMessageKey)}
              control={
                <Switch
                  checked={enabled}
                  aria-label={label}
                  onCheckedChange={(next) => setFeatureEnabled(feature.id, next)}
                />
              }
            />
          );
        })}
      </SettingsCard>
      <SettingsRow
        className="cardo-feature-reset-card cardo-settings-list-group-spaced"
        title={t('settings.resetFeatures')}
        control={
          <Button
            type="button"
            variant="ghost"
            className="cardo-settings-secondary-button"
            disabled={!hasOverrides}
            onClick={() => resetFeatureFlags()}
          >
            {t('settings.resetFeaturesAction')}
          </Button>
        }
      />
    </>
  );
}

const COLOR_OVERRIDE_LABEL_KEYS = {
  canvas: 'settings.colorOverride.canvas',
  panel: 'settings.colorOverride.panel',
  surface: 'settings.colorOverride.surface',
  text: 'settings.colorOverride.text',
  blue: 'settings.colorOverride.blue',
  createBackground: 'settings.colorOverride.createBackground',
  settingsChrome: 'settings.colorOverride.settingsChrome',
  settingsHover: 'settings.colorOverride.settingsHover',
} as const satisfies Record<OverridableColorKey, string>;

function AppearanceSettings({
  colorMode,
  setColorMode,
}: {
  colorMode: WebNextColorMode;
  setColorMode: (colorMode: WebNextColorMode) => void;
}) {
  const { t, locale } = useI18n();
  const themeId = usePreferencesStore((state) => state.themeId);
  const setThemeId = usePreferencesStore((state) => state.setThemeId);
  const themeColorOverrides = usePreferencesStore((state) => state.themeColorOverrides);
  const setThemeColorOverride = usePreferencesStore((state) => state.setThemeColorOverride);
  const applyThemeColorLook = usePreferencesStore((state) => state.applyThemeColorLook);
  const resetThemeColorOverrides = usePreferencesStore((state) => state.resetThemeColorOverrides);
  const themes = useMemo(() => getRegisteredWebNextThemes(), []);
  const [customColorsOpen, setCustomColorsOpen] = useState(false);

  const pack = useMemo(() => getThemePack(themeId || OFFICIAL_DEFAULT_THEME_ID), [themeId]);
  const lookPresets = useMemo(
    () => getThemeLookPresets(themeId || OFFICIAL_DEFAULT_THEME_ID),
    [themeId],
  );
  const effectiveColors = useMemo(
    () =>
      resolveEffectiveThemeTokens({
        pack,
        colorMode,
        colorOverrides: themeColorOverrides,
      }).colors,
    [pack, colorMode, themeColorOverrides],
  );
  const modeOverrides = themeColorOverrides[themeId]?.[colorMode] ?? {};
  const themeBucket = themeColorOverrides[themeId];
  const hasAnyOverrides = Boolean(
    themeBucket &&
    (Object.keys(themeBucket.light ?? {}).length > 0 ||
      Object.keys(themeBucket.dark ?? {}).length > 0),
  );
  const activeLookId = matchThemeLookId(
    themeId || OFFICIAL_DEFAULT_THEME_ID,
    themeBucket?.light,
    themeBucket?.dark,
  );

  const applyLook = (look: ThemeLookPreset) => {
    const id = themeId || OFFICIAL_DEFAULT_THEME_ID;
    // Absolute replace for this theme's light+dark maps (default look clears overrides).
    applyThemeColorLook(id, look.colors);
  };

  return (
    <>
      <SettingsHeading
        title={t('settings.appearance')}
        description={t('settings.appearanceDescription')}
      />

      {/* Theme packs + looks: list-group rows (same dialect as about-details), not loose cards. */}
      <SettingsCard head={t('settings.theme')}>
        {themes.map((theme) => {
          const selected = theme.id === themeId;
          return (
            <button
              key={theme.id}
              type="button"
              className={[
                'cardo-settings-card',
                'cardo-theme-choice-row',
                selected ? 'cardo-theme-choice-row-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={selected}
              onClick={() => setThemeId(theme.id)}
            >
              <div className="cardo-settings-card-copy">
                <span
                  className="cardo-theme-choice-preview"
                  aria-hidden="true"
                  style={{
                    background: `linear-gradient(90deg, ${theme.palettes.light.canvas} 50%, ${theme.palettes.dark.canvas} 50%)`,
                    boxShadow: `inset 0 0 0 1px ${theme.palettes[colorMode].border}`,
                  }}
                >
                  <i style={{ background: theme.palettes[colorMode].blue ?? '#3b82f6' }} />
                </span>
                <span>
                  {theme.name[locale === 'zh' ? 'zh' : 'en']}
                  {theme.official ? (
                    <em className="cardo-theme-official-badge">{t('settings.themeOfficial')}</em>
                  ) : null}
                  <small>{theme.description[locale === 'zh' ? 'zh' : 'en']}</small>
                </span>
              </div>
              {selected ? (
                <IconFrame className="cardo-theme-choice-check">
                  <ThemeIcon name="check" size={14} />
                </IconFrame>
              ) : null}
            </button>
          );
        })}
      </SettingsCard>

      <SettingsCard spaced>
        <SettingsRow
          title={t('settings.mode')}
          description={t('settings.modeDescription')}
          control={
            <ToggleGroup
              aria-label={t('settings.mode')}
              type="single"
              value={colorMode}
              onValueChange={(value) => value && setColorMode(colorModeSchema.parse(value))}
            >
              <SegmentButton active={colorMode === 'light'} value="light">
                <ThemeIcon name="sun" size={14} />
                {t('settings.light')}
              </SegmentButton>
              <SegmentButton active={colorMode === 'dark'} value="dark">
                <ThemeIcon name="moon" size={14} />
                {t('settings.dark')}
              </SegmentButton>
            </ToggleGroup>
          }
        />
      </SettingsCard>

      <SettingsCard
        spaced
        head={t('settings.themeLooks')}
        description={t('settings.themeLooksDescription')}
      >
        {lookPresets.map((look) => {
          const selected = activeLookId === look.id;
          const lightCanvas = look.colors.light.canvas ?? pack.tokens.colors.light.canvas;
          const darkCanvas = look.colors.dark.canvas ?? pack.tokens.colors.dark.canvas;
          const accent =
            look.colors[colorMode].blue ?? pack.tokens.colors[colorMode].blue ?? '#3b82f6';
          const panel = look.colors[colorMode].panel ?? pack.tokens.colors[colorMode].panel;
          const label = look.name[locale === 'zh' ? 'zh' : 'en'];
          return (
            <button
              key={look.id}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={label}
              className={[
                'cardo-settings-card',
                'cardo-theme-choice-row',
                selected ? 'cardo-theme-choice-row-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => applyLook(look)}
            >
              <div className="cardo-settings-card-copy">
                <span
                  className="cardo-theme-look-swatches cardo-theme-look-swatches-inline"
                  aria-hidden="true"
                >
                  <i style={{ background: lightCanvas }} />
                  <i style={{ background: darkCanvas }} />
                  <i style={{ background: panel }} />
                  <i style={{ background: accent }} />
                </span>
                <span>{label}</span>
              </div>
              {selected ? (
                <IconFrame className="cardo-theme-choice-check">
                  <ThemeIcon name="check" size={14} />
                </IconFrame>
              ) : null}
            </button>
          );
        })}
        {activeLookId === null && hasAnyOverrides ? (
          <div
            className="cardo-settings-card cardo-theme-choice-row cardo-theme-choice-row-custom"
            role="option"
            aria-selected
            aria-label={t('settings.themeLookCustom')}
          >
            <div className="cardo-settings-card-copy">
              <span
                className="cardo-theme-look-swatches cardo-theme-look-swatches-inline"
                aria-hidden="true"
              >
                <i style={{ background: effectiveColors.canvas }} />
                <i
                  style={{
                    background:
                      effectiveColors.panel ?? effectiveColors.surface ?? effectiveColors.canvas,
                  }}
                />
                <i style={{ background: effectiveColors.blue ?? '#3b82f6' }} />
              </span>
              <span>{t('settings.themeLookCustom')}</span>
            </div>
          </div>
        ) : null}
      </SettingsCard>

      <div className="cardo-settings-group cardo-settings-list-group-spaced">
        <button
          type="button"
          className="cardo-settings-disclosure cardo-settings-group-header"
          aria-expanded={customColorsOpen}
          onClick={() => setCustomColorsOpen((open) => !open)}
        >
          <span>
            {t('settings.colorOverrides')}
            <small>{t('settings.colorOverridesDescription')}</small>
          </span>
          <ThemeIcon
            name="chevronRight"
            size={16}
            className={
              customColorsOpen
                ? 'cardo-settings-disclosure-chevron cardo-settings-disclosure-chevron-open'
                : 'cardo-settings-disclosure-chevron'
            }
          />
        </button>

        {customColorsOpen ? (
          <div className="cardo-settings-group-body">
            <div className="cardo-theme-color-list">
              {overridableColorKeys.map((key) => {
                const current = String(effectiveColors[key] ?? '');
                const pickerValue = cssColorToHexInput(current);
                const presets = COLOR_OVERRIDE_PRESETS[key][colorMode];
                const label = t(COLOR_OVERRIDE_LABEL_KEYS[key] as Parameters<typeof t>[0]);
                return (
                  <div className="cardo-theme-color-row" key={key}>
                    <div className="cardo-theme-color-row-main">
                      <span className="cardo-theme-color-label">
                        <i
                          className="cardo-theme-color-swatch"
                          style={{ background: current }}
                          aria-hidden
                        />
                        {label}
                      </span>
                      <span className="cardo-theme-color-controls">
                        <input
                          className="cardo-theme-color-picker"
                          type="color"
                          value={pickerValue}
                          aria-label={label}
                          title={t('settings.colorOverride.custom')}
                          onChange={(event) =>
                            setThemeColorOverride(colorMode, key, event.target.value)
                          }
                        />
                        <Input
                          className="cardo-theme-color-text"
                          value={modeOverrides[key] ?? ''}
                          placeholder={current}
                          spellCheck={false}
                          aria-label={t('settings.colorOverride.customValue', { label })}
                          onChange={(event) => {
                            const next = event.target.value.trim();
                            setThemeColorOverride(colorMode, key, next.length ? next : null);
                          }}
                        />
                      </span>
                    </div>
                    <div
                      className="cardo-theme-color-presets"
                      role="group"
                      aria-label={t('settings.colorOverride.presets', { label })}
                    >
                      {presets.map((preset) => {
                        const active = isColorPresetActive(current, preset.value);
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            className={[
                              'cardo-theme-color-preset',
                              active ? 'cardo-theme-color-preset-active' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            aria-label={`${label}: ${preset.id}`}
                            aria-pressed={active}
                            title={preset.value}
                            onClick={() => setThemeColorOverride(colorMode, key, preset.value)}
                          >
                            <span
                              className="cardo-theme-color-preset-fill"
                              style={{ background: preset.value }}
                              aria-hidden
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <SettingsRow
              className="cardo-theme-color-reset-card"
              icon={
                <IconFrame>
                  <ThemeIcon name="rotateCcw" size={16} />
                </IconFrame>
              }
              title={t('settings.resetColorOverrides')}
              description={t('settings.resetColorOverridesDescription')}
              control={
                <Button
                  type="button"
                  variant="ghost"
                  className="cardo-settings-secondary-button"
                  disabled={!hasAnyOverrides}
                  onClick={() => resetThemeColorOverrides()}
                >
                  {t('settings.resetColorOverridesAction')}
                </Button>
              }
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

/** Best-effort #rrggbb for native color inputs; falls back to accent blue. */
function cssColorToHexInput(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, a, b, c] = trimmed;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  const rgb = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+\s*)?\)$/i,
  );
  if (rgb) {
    const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
    return `#${hex(rgb[1])}${hex(rgb[2])}${hex(rgb[3])}`;
  }
  return '#3b82f6';
}

function AboutSettings() {
  const { t } = useI18n();
  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
  const isDesktop = typeof window !== 'undefined' && Boolean(window.cardoDesktop);

  return (
    <>
      <SettingsHeading title={t('settings.about')} description={t('settings.aboutDescription')} />
      <div className="cardo-about-card">
        <img
          className="cardo-about-logo"
          src={cardoMarkUrl}
          alt="Cardo"
          width={48}
          height={48}
          draggable={false}
        />
        <div className="cardo-about-copy">
          <span className="cardo-about-name">Cardo</span>
          <small className="cardo-about-edition">
            {t('settings.webNextEdition')} · v{appVersion}
          </small>
        </div>
      </div>
      <dl className="cardo-about-details">
        <div>
          <dt>{t('settings.version')}</dt>
          <dd>{appVersion}</dd>
        </div>
        <div>
          <dt>{t('settings.themeSystem')}</dt>
          <dd>{t('settings.tokenThemePack')}</dd>
        </div>
      </dl>
      {isDesktop ? <DesktopUpdatePanel /> : null}
    </>
  );
}

function DesktopUpdatePanel() {
  const { t } = useI18n();
  const [state, setState] = useState<DesktopUpdateState | null>(null);
  const [busy, setBusy] = useState(false);
  const [proxyMode, setProxyMode] = useState<'auto' | 'manual' | 'off'>('auto');
  const [proxyHost, setProxyHost] = useState('127.0.0.1');
  const [proxyPort, setProxyPort] = useState('7890');
  const [proxyHint, setProxyHint] = useState<string | null>(null);

  useEffect(() => {
    const bridge = window.cardoDesktop;
    if (!bridge) return;
    let cancelled = false;
    void bridge.getUpdateState().then((next) => {
      if (!cancelled) setState(next);
    });
    void bridge.getUpdateProxySettings().then((settings) => {
      if (cancelled) return;
      setProxyMode(settings.mode);
      setProxyHost(settings.host);
      setProxyPort(String(settings.port));
    });
    const unsubscribe = bridge.onUpdateStateChange((next) => {
      setState(next);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!state) return null;

  const statusText = (() => {
    switch (state.phase) {
      case 'checking':
        return t('settings.updateChecking');
      case 'upToDate':
        return t('settings.updateUpToDate');
      case 'available':
        return state.forceUpdate
          ? `${t('settings.updateForceRequired')} ${t('settings.updateAvailable', {
              version: state.available?.version ?? '',
            })}`
          : t('settings.updateAvailable', {
              version: state.available?.version ?? '',
            });
      case 'downloading':
        return t('settings.updateDownloading', {
          percent: String(state.downloadPercent ?? 0),
        });
      case 'readyToInstall':
        return state.installChannel === 'portable' && state.available?.assetKind === 'portable'
          ? t('settings.updateReadyPortable')
          : t('settings.updateReady');
      case 'installing':
        return state.installChannel === 'portable' && state.available?.assetKind === 'portable'
          ? t('settings.updateInstallingPortable')
          : t('settings.updateInstalling');
      case 'unsupported':
        return t('settings.updateUnsupported');
      case 'error':
        return state.errorMessage
          ? `${t('settings.updateError')}: ${state.errorMessage}`
          : t('settings.updateError');
      default:
        return t('settings.updateIdle');
    }
  })();

  const installChannelLabel =
    state.installChannel === 'setup'
      ? t('settings.updateInstallChannel.setup')
      : state.installChannel === 'portable'
        ? t('settings.updateInstallChannel.portable')
        : t('settings.updateInstallChannel.dev');

  const assetLabel =
    state.available?.assetKind === 'portable'
      ? t('settings.updateAssetPortable')
      : state.available
        ? t('settings.updateAssetSetup')
        : null;

  const applyLabel =
    state.installChannel === 'portable' && state.available?.assetKind === 'portable'
      ? t('settings.updateReplace')
      : t('settings.updateInstall');

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const bridge = window.cardoDesktop;
  if (!bridge) return null;

  // Match language / search-engine / export rows: subheading (no surface) + list-group cards.
  // Never wrap in .cardo-settings-group — that class paints the shared item surface and
  // makes subheading copy look like it has a card background.
  return (
    <>
      <div className="cardo-settings-subheading cardo-settings-list-group-spaced">
        <span>{t('settings.update')}</span>
        <small>{t('settings.updateDescription')}</small>
      </div>
      <div className="cardo-settings-list-group">
        <div className="cardo-settings-card">
          <div className="cardo-settings-card-copy">
            <span className="cardo-update-status-copy">
              {statusText}
              <small>
                {t('settings.updateInstallChannel')}: {installChannelLabel}
                {assetLabel ? ` · ${assetLabel}` : ''}
              </small>
              {state.available?.version ? (
                <small>
                  v{state.currentVersion} → v{state.available.version}
                </small>
              ) : (
                <small>v{state.currentVersion}</small>
              )}
            </span>
          </div>
          <div className="cardo-settings-card-actions">
            <Button
              type="button"
              variant="ghost"
              className="cardo-settings-secondary-button"
              disabled={busy || state.phase === 'checking' || state.phase === 'downloading'}
              onClick={() => void run(() => bridge.checkForUpdates())}
            >
              {t('settings.updateCheck')}
            </Button>
            {state.phase === 'available' || state.phase === 'error' ? (
              <Button
                type="button"
                variant="ghost"
                className="cardo-settings-secondary-button"
                disabled={busy || !state.available}
                onClick={() => void run(() => bridge.downloadUpdate())}
              >
                {t('settings.updateDownload')}
              </Button>
            ) : null}
            {state.phase === 'downloading' && !state.forceUpdate ? (
              <Button
                type="button"
                variant="ghost"
                className="cardo-settings-secondary-button"
                disabled={busy}
                onClick={() => void run(() => bridge.cancelUpdateDownload())}
              >
                {t('settings.updateCancel')}
              </Button>
            ) : null}
            {state.phase === 'readyToInstall' ? (
              <Button
                type="button"
                variant="ghost"
                className="cardo-settings-secondary-button"
                disabled={busy}
                onClick={() => void run(() => bridge.installUpdate())}
              >
                {applyLabel}
              </Button>
            ) : null}
            {state.available?.releaseUrl ? (
              <Button
                type="button"
                variant="ghost"
                className="cardo-settings-secondary-button"
                disabled={busy}
                onClick={() => void run(() => bridge.openUpdateReleasePage())}
              >
                {t('settings.updateOpenRelease')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="cardo-settings-subheading">
        <span>{t('settings.updateProxy')}</span>
        <small>{t('settings.updateProxyDescription')}</small>
      </div>
      <div className="cardo-settings-list-group">
        <div className="cardo-settings-card">
          <div className="cardo-settings-card-copy">
            <span>{t('settings.updateProxyMode')}</span>
          </div>
          <Select
            value={proxyMode}
            onValueChange={(value) => {
              if (value === 'auto' || value === 'manual' || value === 'off') {
                setProxyMode(value);
                setProxyHint(null);
              }
            }}
            disabled={busy}
          >
            <SelectTrigger aria-label={t('settings.updateProxyMode')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="auto">{t('settings.updateProxyMode.auto')}</SelectItem>
              <SelectItem value="manual">{t('settings.updateProxyMode.manual')}</SelectItem>
              <SelectItem value="off">{t('settings.updateProxyMode.off')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {proxyMode !== 'off' ? (
          <>
            <div className="cardo-settings-card">
              <div className="cardo-settings-card-copy">
                <span>{t('settings.updateProxyHost')}</span>
              </div>
              <Input
                className="cardo-settings-inline-field"
                value={proxyHost}
                onChange={(event) => {
                  setProxyHost(event.target.value);
                  setProxyHint(null);
                }}
                disabled={busy}
                placeholder="127.0.0.1"
                autoComplete="off"
              />
            </div>
            <div className="cardo-settings-card">
              <div className="cardo-settings-card-copy">
                <span>{t('settings.updateProxyPort')}</span>
              </div>
              <Input
                className="cardo-settings-inline-field cardo-settings-inline-field-narrow"
                value={proxyPort}
                onChange={(event) => {
                  setProxyPort(event.target.value.replace(/[^\d]/g, ''));
                  setProxyHint(null);
                }}
                disabled={busy}
                inputMode="numeric"
                placeholder="7890"
                autoComplete="off"
              />
            </div>
          </>
        ) : null}
        <div className="cardo-settings-card">
          <div className="cardo-settings-card-copy">
            <span>
              {t('settings.updateProxyApply')}
              {proxyHint ? <small>{proxyHint}</small> : null}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="cardo-settings-secondary-button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const port = Number(proxyPort || '7890');
                const saved = await bridge.setUpdateProxySettings({
                  mode: proxyMode,
                  host: proxyHost.trim() || '127.0.0.1',
                  port: Number.isFinite(port) && port > 0 ? port : 7890,
                });
                setProxyMode(saved.mode);
                setProxyHost(saved.host);
                setProxyPort(String(saved.port));
                setProxyHint(t('settings.updateProxySaved'));
              })
            }
          >
            {t('settings.updateProxySave')}
          </Button>
        </div>
      </div>
    </>
  );
}

function SettingsHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="cardo-settings-heading">
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
  children: ReactNode;
  value: string;
}) {
  return (
    <ToggleGroupItem value={value}>
      {/* Static indicator — no Motion scale (blurred text under Fluent) */}
      <span
        className={['cardo-segment-indicator', active ? 'cardo-segment-indicator-active' : '']
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      />
      <span>{children}</span>
    </ToggleGroupItem>
  );
}

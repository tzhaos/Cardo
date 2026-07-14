import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import cardoMarkUrl from '../../../../assets/brand/cardo-mark.svg';
import { AnimatePresence, motion } from 'motion/react';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { useI18n } from '../../i18n/useI18n';
import type { WebNextColorMode } from '../../themes/themeRegistry';
import { getRegisteredWebNextThemes } from '../../themes/themeRegistry';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import type { WorkspaceProjection } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import {
  exportOperationLog,
  exportThemePackFile,
  exportWorkspaceData,
  parseWorkspaceImportFile,
} from '../../platform/hostPlatform';
import { parseThemePackImportFile } from '../../themes/themeIO';
import { isValidCustomSearchTemplate, type WebSearchEngineId } from '../../domain/webSearch';
import {
  colorModeSchema,
  densitySchema,
  fontFamilyIdSchema,
  fontScaleSchema,
  preferenceLocaleSchema,
  webSearchEngineIdSchema,
} from '../../../core/contracts/preferences';
import type { DesktopUpdateState } from '../../../core/contracts/desktopUpdate';
import {
  FEATURE_CATALOG,
  getFeatureDefinition,
  isFeatureEnabled,
} from '../../../core/contracts/featureCatalog';
import { validateCssSnippet } from '../../../core/contracts/cssSnippet';
import { matchSettingsSearchEntries, type SettingsSectionId } from './settingsSearchCatalog';
import { Button } from '../../kit/button';
import { IconFrame } from '../../kit/icon-button';
import { Input } from '../../kit/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../kit/select';
import { SettingsCard, SettingsRow } from '../../kit/settings-form';
import { Switch } from '../../kit/switch';
import { Textarea } from '../../kit/textarea';
import { ThemeIcon } from '../../kit/icon';
import { ToggleGroup, ToggleGroupItem } from '../../kit/toggle-group';
import type { WebNextMessageKey } from '../../i18n/messages';

type SettingsSection = SettingsSectionId;

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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
          const missingDeps = feature.dependsOn.filter(
            (dep) => !isFeatureEnabled(dep, featureFlags),
          );
          const requiresHint =
            missingDeps.length > 0
              ? t('settings.featureRequires', {
                  features: missingDeps
                    .map((dep) => t(getFeatureDefinition(dep).labelKey as WebNextMessageKey))
                    .join(', '),
                })
              : null;
          const description = requiresHint
            ? `${t(feature.descriptionKey as WebNextMessageKey)} · ${requiresHint}`
            : t(feature.descriptionKey as WebNextMessageKey);
          return (
            <SettingsRow
              key={feature.id}
              title={label}
              description={description}
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
  const fontFamily = usePreferencesStore((state) => state.fontFamily);
  const fontScale = usePreferencesStore((state) => state.fontScale);
  const density = usePreferencesStore((state) => state.density);
  const setFontFamily = usePreferencesStore((state) => state.setFontFamily);
  const setFontScale = usePreferencesStore((state) => state.setFontScale);
  const setDensity = usePreferencesStore((state) => state.setDensity);
  const cssSnippet = usePreferencesStore((state) => state.cssSnippet);
  const cssSnippetEnabled = usePreferencesStore((state) => state.cssSnippetEnabled);
  const setCssSnippet = usePreferencesStore((state) => state.setCssSnippet);
  const setCssSnippetEnabled = usePreferencesStore((state) => state.setCssSnippetEnabled);
  const importThemePack = usePreferencesStore((state) => state.importThemePack);
  const removeImportedThemePack = usePreferencesStore((state) => state.removeImportedThemePack);
  const restoreOfficialLook = usePreferencesStore((state) => state.restoreOfficialLook);
  const importedThemePacks = usePreferencesStore((state) => state.importedThemePacks);
  // importedThemePacks is a version signal; registry is outside React state.
  const importedPackCount = Object.keys(importedThemePacks).length;
  const themes = useMemo(
    () => getRegisteredWebNextThemes(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read after import/remove
    [importedPackCount],
  );
  const selectedTheme = themes.find((theme) => theme.id === themeId);
  const selectedIsImported = Boolean(selectedTheme && !selectedTheme.official);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const themeImportRef = useRef<HTMLInputElement>(null);
  const [importThemeError, setImportThemeError] = useState(false);
  const snippetInvalid = cssSnippet.trim().length > 0 && !validateCssSnippet(cssSnippet).ok;

  return (
    <>
      <SettingsHeading
        title={t('settings.appearance')}
        description={t('settings.appearanceDescription')}
      />

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
              <span
                className="cardo-theme-choice-preview"
                aria-hidden="true"
                style={{
                  background: `linear-gradient(90deg, ${theme.palettes.light.canvas} 50%, ${theme.palettes.dark.canvas} 50%)`,
                  boxShadow: `inset 0 0 0 1px ${theme.palettes[colorMode].border}`,
                }}
              />
              <span className="cardo-theme-choice-meta">
                <span className="cardo-theme-choice-title">
                  {theme.name[locale === 'zh' ? 'zh' : 'en']}
                  {theme.official ? (
                    <em className="cardo-theme-official-badge">{t('settings.themeOfficial')}</em>
                  ) : null}
                </span>
                <small className="cardo-theme-choice-desc">
                  {theme.description[locale === 'zh' ? 'zh' : 'en']}
                </small>
              </span>
              <span
                className={
                  selected
                    ? 'cardo-theme-choice-radio cardo-theme-choice-radio-on'
                    : 'cardo-theme-choice-radio'
                }
                aria-hidden
              />
            </button>
          );
        })}
      </SettingsCard>

      <SettingsCard spaced>
        <SettingsRow
          title={t('settings.restoreOfficialLook')}
          description={t('settings.restoreOfficialLookDescription')}
          control={
            <Button
              type="button"
              variant="ghost"
              className="cardo-settings-secondary-button"
              onClick={() => restoreOfficialLook()}
            >
              {t('settings.restoreOfficialLook')}
            </Button>
          }
        />
        {selectedIsImported ? (
          <SettingsRow
            title={t('settings.removeImportedTheme')}
            description={t('settings.removeImportedThemeDescription')}
            control={
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => removeImportedThemePack(themeId)}
              >
                {t('settings.removeImportedTheme')}
              </Button>
            }
          />
        ) : null}
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
        <SettingsRow
          title={t('settings.fontFamily')}
          description={t('settings.fontFamilyDescription')}
          control={
            <Select
              value={fontFamily}
              onValueChange={(value) => setFontFamily(fontFamilyIdSchema.parse(value))}
            >
              <SelectTrigger aria-label={t('settings.fontFamily')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="default">{t('settings.fontFamily.default')}</SelectItem>
                <SelectItem value="system-ui">{t('settings.fontFamily.systemUi')}</SelectItem>
                <SelectItem value="serif">{t('settings.fontFamily.serif')}</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <SettingsRow
          title={t('settings.fontScale')}
          description={t('settings.fontScaleDescription')}
          control={
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
          }
        />
        <SettingsRow
          title={t('settings.density')}
          description={t('settings.densityDescription')}
          control={
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
          }
        />
      </SettingsCard>

      <button
        type="button"
        className="cardo-settings-disclosure cardo-settings-list-group-spaced"
        aria-expanded={advancedOpen}
        onClick={() => setAdvancedOpen((open) => !open)}
      >
        <span>
          {t('settings.advancedTheme')}
          <small>{t('settings.advancedThemeDescription')}</small>
        </span>
        <ThemeIcon
          name="chevronRight"
          size={16}
          className={[
            'cardo-settings-disclosure-chevron',
            advancedOpen ? 'cardo-settings-disclosure-chevron-open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      </button>

      {advancedOpen ? (
        <>
          <SettingsCard
            spaced
            head={t('settings.expertCss')}
            description={t('settings.expertCssDescription')}
          >
            <SettingsRow
              title={t('settings.cssSnippetEnabled')}
              description={t('settings.cssSnippetDescription')}
              control={
                <Switch
                  checked={cssSnippetEnabled}
                  aria-label={t('settings.cssSnippetEnabled')}
                  onCheckedChange={(next) => setCssSnippetEnabled(next)}
                />
              }
            />
            <div className="cardo-settings-card cardo-settings-css-snippet">
              <Textarea
                value={cssSnippet}
                onChange={(event) => setCssSnippet(event.target.value)}
                placeholder={t('settings.cssSnippetPlaceholder')}
                spellCheck={false}
                aria-label={t('settings.cssSnippet')}
              />
              <small>
                {snippetInvalid ? t('settings.cssSnippetInvalid') : t('settings.cssSnippetHint')}
              </small>
            </div>
          </SettingsCard>

          <SettingsCard spaced>
            <SettingsRow
              title={t('settings.exportTheme')}
              description={t('settings.exportThemeDescription')}
              control={
                <Button
                  type="button"
                  variant="ghost"
                  className="cardo-settings-secondary-button"
                  onClick={() => exportThemePackFile(themeId)}
                >
                  {t('settings.exportTheme')}
                </Button>
              }
            />
            <SettingsRow
              title={t('settings.importTheme')}
              description={t('settings.importThemeDescription')}
              control={
                <Button
                  type="button"
                  variant="ghost"
                  className="cardo-settings-secondary-button"
                  onClick={() => themeImportRef.current?.click()}
                >
                  {t('settings.importTheme')}
                </Button>
              }
            />
          </SettingsCard>
          <Input
            className="cardo-data-file-input"
            ref={themeImportRef}
            type="file"
            accept="application/json,.json,.cardo-theme.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = '';
              if (!file) return;
              void parseThemePackImportFile(file)
                .then((pack) => {
                  importThemePack(pack);
                  setImportThemeError(false);
                })
                .catch(() => setImportThemeError(true));
            }}
          />
          {importThemeError ? (
            <p className="cardo-data-error">{t('settings.importThemeInvalid')}</p>
          ) : null}
        </>
      ) : null}
    </>
  );
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [proxyMode, setProxyMode] = useState<'auto' | 'manual' | 'off'>('auto');
  const [proxyHost, setProxyHost] = useState('127.0.0.1');
  const [proxyPort, setProxyPort] = useState('7890');
  const [proxyHint, setProxyHint] = useState<string | null>(null);

  useEffect(() => {
    const bridge = window.cardoDesktop;
    if (!bridge) return;
    let cancelled = false;
    void bridge
      .getUpdateState()
      .then((next) => {
        if (!cancelled) {
          setState(next);
          setLoadError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(t('settings.updateError'));
      });
    void bridge.getUpdateProxySettings().then((settings) => {
      if (cancelled) return;
      setProxyMode(settings.mode);
      setProxyHost(settings.host);
      setProxyPort(String(settings.port));
    });
    const unsubscribe = bridge.onUpdateStateChange((next) => {
      setState(next);
      setLoadError(null);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [t]);

  if (!state) {
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
                {loadError ?? t('settings.updateLoading')}
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

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
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(
        error instanceof Error && error.message ? error.message : t('settings.updateError'),
      );
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
              {actionError ? (
                <small className="cardo-update-action-error">{actionError}</small>
              ) : null}
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
            <span>
              {t('settings.updateProxyMode')}
              {proxyMode === 'auto' ? <small>{t('settings.updateProxyAutoHint')}</small> : null}
            </span>
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

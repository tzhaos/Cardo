import { useMemo, useRef, useState } from 'react';
import type { PointerEventHandler, ReactNode } from 'react';
import {
  Check,
  ChevronRight,
  CircleHelp,
  Database,
  Download,
  FileDown,
  Moon,
  Palette,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  Upload,
  X,
} from 'lucide-react';
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
import { IconButton, IconFrame } from '../../ui/cardo/icon-button';
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
import {
  overridableColorKeys,
  type OverridableColorKey,
} from '../../../core/contracts/themePack';
import {
  COLOR_OVERRIDE_PRESETS,
  isColorPresetActive,
} from './colorPresets';
import {
  matchSettingsSearchEntries,
  type SettingsSectionId,
} from './settingsSearchCatalog';
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

type SettingsSection = SettingsSectionId;

/**
 * Product settings: language, search, theme packs, light/dark, color overrides, backup.
 */
export function SettingsPanel({
  onClose,
  onHeaderPointerDown,
}: {
  onClose: () => void;
  onHeaderPointerDown?: PointerEventHandler<HTMLElement>;
}) {
  const [section, setSection] = useState<SettingsSection>('general');
  const [settingsQuery, setSettingsQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const colorMode = usePreferencesStore((state) => state.colorMode);
  const locale = usePreferencesStore((state) => state.locale);
  const setColorMode = usePreferencesStore((state) => state.setColorMode);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const searchEngine = usePreferencesStore((state) => state.searchEngine);
  const customSearchTemplate = usePreferencesStore((state) => state.customSearchTemplate);
  const setSearchEngine = usePreferencesStore((state) => state.setSearchEngine);
  const setCustomSearchTemplate = usePreferencesStore((state) => state.setCustomSearchTemplate);
  const themeId = usePreferencesStore((state) => state.themeId);
  const isFluent = themeId === 'fluent';
  const isSwiftUI = themeId === 'swiftui';
  /** Static nav pill under themed shells — avoids layoutId soft text. */
  const useStaticNavIndicator =
    themeId === 'glass' ||
    themeId === 'fluent' ||
    themeId === 'material' ||
    themeId === 'swiftui';
  const { t, locale: i18nLocale } = useI18n();
  const sections = [
    {
      id: 'general' as const,
      label: t('settings.general'),
      monoIcon: <SlidersHorizontal size={16} />,
    },
    {
      id: 'appearance' as const,
      label: t('settings.appearance'),
      monoIcon: <Palette size={16} />,
    },
    {
      id: 'data' as const,
      label: t('settings.data'),
      monoIcon: <Database size={16} />,
    },
    {
      id: 'about' as const,
      label: t('settings.about'),
      monoIcon: <CircleHelp size={16} />,
    },
  ];
  const sectionLabel = (id: SettingsSection) =>
    sections.find((entry) => entry.id === id)?.label ?? id;
  const isSearching = settingsQuery.trim().length > 0;
  const searchResults = useMemo(
    () => matchSettingsSearchEntries(settingsQuery, i18nLocale, t),
    [i18nLocale, settingsQuery, t],
  );

  const openSearchResult = (nextSection: SettingsSection) => {
    setSection(nextSection);
    setSettingsQuery('');
  };

  return (
    <div className="cardo-settings-panel" role="dialog" aria-label={t('settings.title')}>
      <header className="cardo-settings-header" onPointerDown={onHeaderPointerDown}>
        {isSwiftUI ? (
          <span className="cardo-settings-traffic-lights" data-no-menu-drag aria-hidden="true">
            <button
              type="button"
              className="cardo-tl-close"
              aria-label={t('common.close')}
              onClick={onClose}
            />
            <i className="cardo-tl-min" />
            <i className="cardo-tl-max" />
          </span>
        ) : null}
        <div className="cardo-settings-header-title">
          {isSwiftUI ? null : (
            <IconFrame>
              <Settings size={17} />
            </IconFrame>
          )}
          <span>{t('settings.title')}</span>
        </div>
        <div className="cardo-settings-header-drag-space" aria-hidden="true" />
        <div className="cardo-settings-header-actions">
          <label className="cardo-settings-search" data-no-menu-drag>
            <span className="cardo-settings-search-icon" aria-hidden>
              <Search size={16} strokeWidth={2} />
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
                <X size={14} />
              </button>
            ) : null}
          </label>
          {isSwiftUI ? null : (
            <IconButton data-no-menu-drag onClick={onClose} aria-label={t('common.close')}>
              <X size={16} />
            </IconButton>
          )}
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
          {sections.map(({ id, label, monoIcon }) => (
            <TabsTrigger key={id} value={id}>
              {/* Classic: layoutId pill. Fluent/Material: static CSS indicator (crisper). */}
              {section === id && !isSearching ? (
                useStaticNavIndicator ? (
                  <span className="cardo-settings-nav-indicator" aria-hidden />
                ) : (
                  <motion.span
                    className="cardo-settings-nav-indicator"
                    layoutId="settings-nav-indicator"
                    transition={{ type: 'spring', bounce: 0.12, duration: 0.42 }}
                  />
                )
              ) : null}
              {isFluent ? (
                <SettingsNavIcon id={id} />
              ) : (
                <IconFrame className="cardo-settings-nav-mono-icon">{monoIcon}</IconFrame>
              )}
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="cardo-settings-content cardo-custom-scrollbar">
          {isSearching ? (
            <div className="cardo-settings-search-results" role="listbox" aria-label={t('settings.search')}>
              {searchResults.length === 0 ? (
                <p className="cardo-settings-search-empty">{t('settings.searchNoResults')}</p>
              ) : (
                searchResults.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="cardo-settings-search-result"
                    role="option"
                    onClick={() => openSearchResult(entry.section)}
                  >
                    <span className="cardo-settings-search-result-copy">
                      <strong>{t(entry.titleKey)}</strong>
                      {entry.descriptionKey ? <small>{t(entry.descriptionKey)}</small> : null}
                      <em>{t('settings.searchInSection', { section: sectionLabel(entry.section) })}</em>
                    </span>
                    <ChevronRight size={16} aria-hidden />
                  </button>
                ))
              )}
            </div>
          ) : (
            <TabsContent className="cardo-settings-tab-content" value={section}>
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
            </TabsContent>
          )}
        </div>
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
      <div className="cardo-data-actions">
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
      <div className="cardo-settings-list-group">
        <div className="cardo-settings-card">
          <div className="cardo-settings-card-copy">
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
            <SegmentButton active={locale === 'zh'} value="zh">
              {t('settings.chinese')}
            </SegmentButton>
            <SegmentButton active={locale === 'en'} value="en">
              {t('settings.english')}
            </SegmentButton>
          </ToggleGroup>
        </div>
        <div className="cardo-settings-card">
          <div className="cardo-settings-card-copy">
            <span>
              {t('settings.searchEngine')}
              <small>{t('settings.searchEngineDescription')}</small>
            </span>
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
      </div>
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
  const resetThemeColorOverrides = usePreferencesStore((state) => state.resetThemeColorOverrides);
  const themes = useMemo(() => getRegisteredWebNextThemes(), []);

  const pack = useMemo(() => getThemePack(themeId || OFFICIAL_DEFAULT_THEME_ID), [themeId]);
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

  return (
    <>
      <SettingsHeading
        title={t('settings.appearance')}
        description={t('settings.appearanceDescription')}
      />

      <div className="cardo-settings-subheading">
        <span>{t('settings.theme')}</span>
      </div>
      <ToggleGroup
        className="cardo-theme-pack-grid"
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
                className={
                  selected
                    ? 'cardo-theme-pack-card cardo-theme-pack-card-selected'
                    : 'cardo-theme-pack-card'
                }
                type="button"
              >
                <span className="cardo-theme-pack-preview" aria-hidden="true">
                  <span style={{ background: theme.palettes.light.canvas }} />
                  <span style={{ background: theme.palettes.dark.canvas }} />
                  <i style={{ background: theme.palettes[colorMode].panel }} />
                </span>
                <span className="cardo-theme-pack-card-copy">
                  <span>
                    {theme.name[locale === 'zh' ? 'zh' : 'en']}
                    {theme.official ? (
                      <em className="cardo-theme-official-badge">{t('settings.themeOfficial')}</em>
                    ) : null}
                  </span>
                  <small>{theme.description[locale === 'zh' ? 'zh' : 'en']}</small>
                </span>
                {selected ? (
                  <IconFrame className="cardo-theme-check">
                    <Check size={12} />
                  </IconFrame>
                ) : null}
              </MotionButton>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      <div className="cardo-settings-list-group cardo-settings-list-group-spaced">
        <div className="cardo-settings-card">
          <div className="cardo-settings-card-copy">
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
      </div>

      <div className="cardo-settings-subheading">
        <span>{t('settings.colorOverrides')}</span>
        <small>{t('settings.colorOverridesDescription')}</small>
      </div>
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

      <div className="cardo-settings-list-group cardo-settings-list-group-spaced">
        <div className="cardo-settings-card cardo-theme-color-reset-card">
          <div className="cardo-settings-card-copy">
            <IconFrame>
              <RotateCcw size={16} />
            </IconFrame>
            <span>
              {t('settings.resetColorOverrides')}
              <small>{t('settings.resetColorOverridesDescription')}</small>
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="cardo-settings-secondary-button"
            disabled={!hasAnyOverrides}
            onClick={() => resetThemeColorOverrides()}
          >
            {t('settings.resetColorOverridesAction')}
          </Button>
        </div>
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
    return `#${hex(rgb[1]!)}${hex(rgb[2]!)}${hex(rgb[3]!)}`;
  }
  return '#3b82f6';
}

function AboutSettings() {
  const { t } = useI18n();

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
          <small className="cardo-about-edition">{t('settings.webNextEdition')}</small>
        </div>
      </div>
      <dl className="cardo-about-details">
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
        className={[
          'cardo-segment-indicator',
          active ? 'cardo-segment-indicator-active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      />
      <span>{children}</span>
    </ToggleGroupItem>
  );
}

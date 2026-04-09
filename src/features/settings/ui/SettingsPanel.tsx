import { useState, useRef, useEffect, type ChangeEvent, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Info,
  Languages,
  Palette,
  RefreshCw,
  Settings,
  Upload,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { useI18n } from '../../../app/hooks/useI18n';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import { useSettingsPanelStore } from '../../../app/stores/useSettingsPanelStore';
import { exportWorkspace } from '../../../app/use-cases/exportWorkspace';
import { importWorkspace } from '../../../app/use-cases/importWorkspace';
import type { AppTheme } from '../../../domains/preferences/model/preferences';
import { cn } from '../../../lib/utils';

type SettingsTab = 'general' | 'theme' | 'sync' | 'about';
type LocaleValue = 'en' | 'zh';

interface SelectOption<Value extends string> {
  label: string;
  value: Value;
}

function WinSelect<Value extends string>({
  value,
  options,
  onChange,
}: {
  value: Value;
  options: SelectOption<Value>[];
  onChange: (value: Value) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label;

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-w-[140px] items-center justify-between gap-6 rounded-md border border-win-border-strong bg-win-bg-secondary px-3 py-1.5 text-sm transition-colors hover:bg-win-hover active:bg-win-active"
      >
        <span className="text-win-text">{activeLabel}</span>
        <ChevronDown className="h-4 w-4 text-win-text-secondary" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-md border border-win-border bg-win-mica py-1 shadow-win-flyout backdrop-blur-xl"
          >
            {options.map((option) => {
              const isActive = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className="group relative flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-win-hover"
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-3/5 w-1 -translate-y-1/2 rounded-r-full bg-win-accent" />
                  )}
                  <span
                    className={cn(
                      'pl-2',
                      isActive
                        ? 'font-medium text-win-text'
                        : 'text-win-text-secondary group-hover:text-win-text',
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingRow({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-win-border bg-win-card p-4 shadow-sm">
      <div className="flex items-center gap-4">
        {icon}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-win-text">{title}</span>
          <span className="text-xs text-win-text-secondary">{description}</span>
        </div>
      </div>
      {action}
    </div>
  );
}

function ActionRow({
  icon,
  title,
  description,
  onClick,
  roundedClassName,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  roundedClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between p-4 text-left transition-colors hover:bg-win-hover',
        roundedClassName,
      )}
    >
      <div className="flex items-center gap-4">
        {icon}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-win-text">{title}</span>
          <span className="text-xs text-win-text-secondary">{description}</span>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-win-text-secondary" />
    </button>
  );
}

function GeneralPanel() {
  const { t, locale, setLocale } = useI18n();
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const copy =
    locale === 'zh'
      ? {
          themeTitle: '\u5e94\u7528\u4e3b\u9898',
          themeDescription: '\u9009\u62e9 KhaosBox \u4f7f\u7528\u7684\u5916\u89c2\u4e3b\u9898',
          languageTitle: '\u8bed\u8a00',
          languageDescription: '\u5207\u6362\u5e94\u7528\u663e\u793a\u8bed\u8a00',
          dataManagement: '\u6570\u636e\u7ba1\u7406',
          exportTitle: '\u5bfc\u51fa\u5de5\u4f5c\u533a',
          exportDescription:
            '\u5c06\u5f53\u524d\u5e03\u5c40\u548c\u5185\u5bb9\u4fdd\u5b58\u4e3a JSON \u6587\u4ef6',
          importTitle: '\u5bfc\u5165\u5de5\u4f5c\u533a',
          importDescription:
            '\u4ece JSON \u6587\u4ef6\u6062\u590d\u4f60\u7684\u5e03\u5c40\u548c\u5185\u5bb9',
          themeOptions: [
            { label: '\u6d45\u8272', value: 'light' },
            { label: '\u6df1\u8272', value: 'dark' },
            { label: '\u8ddf\u968f\u7cfb\u7edf', value: 'system' },
          ] as const satisfies SelectOption<AppTheme>[],
          languageOptions: [
            { label: 'English', value: 'en' },
            { label: '\u4e2d\u6587', value: 'zh' },
          ] as const satisfies SelectOption<LocaleValue>[],
        }
      : {
          themeTitle: 'App theme',
          themeDescription: 'Select which app theme to display',
          languageTitle: 'Language',
          languageDescription: 'Windows display language',
          dataManagement: 'Data Management',
          exportTitle: 'Export workspace',
          exportDescription: 'Save your current layout and content to a JSON file',
          importTitle: 'Import workspace',
          importDescription: 'Restore your layout and content from a JSON file',
          themeOptions: [
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'System', value: 'system' },
          ] as const satisfies SelectOption<AppTheme>[],
          languageOptions: [
            { label: 'English', value: 'en' },
            { label: 'Chinese', value: 'zh' },
          ] as const satisfies SelectOption<LocaleValue>[],
        };

  const handleExport = () => {
    exportWorkspace(t('dock.exportFilePrefix'));
    toast.success(t('toast.dataExported'));
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      await importWorkspace(file);
      toast.success(t('toast.dataImported'));
    } catch {
      toast.error(t('toast.importFailed'));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <SettingRow
        icon={<Palette className="h-5 w-5 text-win-text-secondary" />}
        title={copy.themeTitle}
        description={copy.themeDescription}
        action={<WinSelect<AppTheme> value={theme} options={copy.themeOptions} onChange={setTheme} />}
      />

      <SettingRow
        icon={<Languages className="h-5 w-5 text-win-text-secondary" />}
        title={copy.languageTitle}
        description={copy.languageDescription}
        action={
          <WinSelect<LocaleValue>
            value={locale}
            options={copy.languageOptions}
            onChange={setLocale}
          />
        }
      />

      <h2 className="mb-3 mt-8 px-1 text-sm font-semibold text-win-text">
        {copy.dataManagement}
      </h2>
      <div className="flex flex-col rounded-lg border border-win-border bg-win-card shadow-sm">
        <ActionRow
          icon={<Download className="h-5 w-5 text-win-text-secondary" />}
          title={copy.exportTitle}
          description={copy.exportDescription}
          onClick={handleExport}
          roundedClassName="rounded-t-lg"
        />
        <div className="mx-4 h-px bg-win-border" />
        <ActionRow
          icon={<Upload className="h-5 w-5 text-win-text-secondary" />}
          title={copy.importTitle}
          description={copy.importDescription}
          onClick={() => fileInputRef.current?.click()}
          roundedClassName="rounded-b-lg"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  );
}

function PlaceholderPanel({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-win-border bg-win-card p-6 shadow-sm">
        <p className="text-sm text-win-text-secondary">{message}</p>
      </div>
    </div>
  );
}

function SettingsContent({ activeTab }: { activeTab: SettingsTab }) {
  const { t } = useI18n();

  if (activeTab === 'general') {
    return <GeneralPanel />;
  }

  if (activeTab === 'theme') {
    return <PlaceholderPanel message={t('settings.theme.placeholder')} />;
  }

  if (activeTab === 'sync') {
    return <PlaceholderPanel message={t('settings.sync.placeholder')} />;
  }

  return <PlaceholderPanel message={t('settings.about.placeholder')} />;
}

export default function SettingsPanel() {
  const isOpen = useSettingsPanelStore((state) => state.isOpen);
  const close = useSettingsPanelStore((state) => state.close);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { t } = useI18n();

  const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Settings }> = [
    { id: 'general', label: t('settings.general'), icon: Settings },
    { id: 'theme', label: t('settings.theme'), icon: Palette },
    { id: 'sync', label: t('settings.sync'), icon: RefreshCw },
    { id: 'about', label: t('settings.about'), icon: Info },
  ];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab('general');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[99998] bg-black/10 backdrop-blur-[1px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-[99999] flex h-[min(600px,88vh)] w-[min(850px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl shadow-win-flyout"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="win-mica flex h-full w-full overflow-hidden rounded-xl">
              <div className="relative flex w-72 flex-col px-3 pb-4 pt-10">
                <div className="mb-6 px-3">
                  <h2 className="mb-1 text-2xl font-semibold text-win-text">{t('settings.title')}</h2>
                </div>

                <div className="flex flex-col gap-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                          isActive ? 'bg-win-active' : 'hover:bg-win-hover',
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="settings-active-tab"
                            className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-win-accent"
                          />
                        )}
                        <Icon
                          className={cn(
                            'h-4 w-4',
                            isActive ? 'text-win-text' : 'text-win-text-secondary',
                          )}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span className={isActive ? 'font-medium text-win-text' : 'text-win-text'}>
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative flex flex-1 flex-col">
                <button
                  type="button"
                  onClick={close}
                  title={t('settings.close')}
                  aria-label={t('settings.close')}
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-win-text-secondary transition-colors hover:bg-[#E81123] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex-1 overflow-y-auto p-10">
                  <div className="mx-auto max-w-2xl">
                    <h1 className="mb-8 text-3xl font-semibold text-win-text">
                      {tabs.find((tab) => tab.id === activeTab)?.label ?? t('settings.general')}
                    </h1>
                    <SettingsContent activeTab={activeTab} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

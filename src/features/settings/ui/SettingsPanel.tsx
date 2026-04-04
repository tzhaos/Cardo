import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Palette,
  Cloud,
  Info,
  X,
  Download,
  Upload,
  MoonStar,
  SunMedium,
  Languages,
} from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '../../../app/hooks/useI18n';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import { useSettingsPanelStore } from '../../../app/stores/useSettingsPanelStore';
import { exportWorkspace } from '../../../app/use-cases/exportWorkspace';
import { importWorkspace } from '../../../app/use-cases/importWorkspace';
import { cn } from '../../../lib/utils';

type SettingsTab = 'general' | 'theme' | 'sync' | 'about';

interface SettingsCategory {
  id: SettingsTab;
  labelKey: 'settings.general' | 'settings.theme' | 'settings.sync' | 'settings.about';
  icon: React.ReactNode;
}

const categories: SettingsCategory[] = [
  { id: 'general', labelKey: 'settings.general', icon: <Settings size={18} /> },
  { id: 'theme', labelKey: 'settings.theme', icon: <Palette size={18} /> },
  { id: 'sync', labelKey: 'settings.sync', icon: <Cloud size={18} /> },
  { id: 'about', labelKey: 'settings.about', icon: <Info size={18} /> },
];

const ZH_GLYPH = '\u6587';

function LocaleToggleGlyph({ locale }: { locale: 'zh' | 'en' }) {
  const isZhActive = locale === 'zh';
  return (
    <span className="relative block h-5 w-5" aria-hidden="true">
      <span
        className={cn(
          'absolute left-[1px] top-0 font-sans font-semibold leading-none transition-all',
          isZhActive ? 'text-[13px] opacity-100' : 'text-[9px] opacity-70',
        )}
      >
        {ZH_GLYPH}
      </span>
      <span
        className={cn(
          'absolute bottom-0 right-0 font-sans font-semibold leading-none transition-all',
          isZhActive ? 'text-[9px] opacity-70' : 'text-[13px] opacity-100',
        )}
      >
        A
      </span>
    </span>
  );
}

function GeneralSettings({ t }: { t: (key: string, params?: Record<string, string>) => string }) {
  const theme = usePreferencesStore((state) => state.theme);
  const toggleTheme = usePreferencesStore((state) => state.toggleTheme);
  const { locale, toggleLocale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportWorkspace(t('dock.exportFilePrefix'));
    toast.success(t('toast.dataExported'));
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
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

  const themeLabel =
    theme === 'dark' ? t('dock.switchToLightTheme') : t('dock.switchToDarkTheme');

  return (
    <div className="flex flex-col gap-5">
      {/* Theme Toggle */}
      <div className="kb-settings-card rounded-xl border p-5">
        <div className="mb-3 flex items-center gap-2">
          {theme === 'dark' ? <MoonStar size={16} /> : <SunMedium size={16} />}
          <span className="text-sm font-medium text-[var(--surface-text-strong)]">
            {t('settings.theme')}
          </span>
        </div>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-hover-soft)]"
        >
          {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
          <span className="text-[var(--surface-text)]">{themeLabel}</span>
        </button>
      </div>

      {/* Language Toggle */}
      <div className="kb-settings-card rounded-xl border p-5">
        <div className="mb-3 flex items-center gap-2">
          <Languages size={16} />
          <span className="text-sm font-medium text-[var(--surface-text-strong)]">
            {t(locale === 'zh' ? 'dock.switchToEnglish' : 'dock.switchToChinese')}
          </span>
        </div>
        <button
          onClick={toggleLocale}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-hover-soft)]"
        >
          <LocaleToggleGlyph locale={locale} />
          <span className="text-[var(--surface-text)]">
            {locale === 'zh' ? 'English' : '中文'}
          </span>
        </button>
      </div>

      {/* Data Management */}
      <div className="kb-settings-card rounded-xl border p-5">
        <div className="mb-3 flex items-center gap-2">
          <Upload size={16} />
          <span className="text-sm font-medium text-[var(--surface-text-strong)]">
            {t('settings.dataManagement')}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-hover-soft)]"
          >
            <Download size={18} />
            <span className="text-[var(--surface-text)]">{t('dock.exportJson')}</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-hover-soft)]"
          >
            <Upload size={18} />
            <span className="text-[var(--surface-text)]">{t('dock.importJson')}</span>
          </button>
        </div>
        <input
          type="file"
          accept=".json"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImport}
        />
      </div>
    </div>
  );
}

function SettingsContent({
  tab,
  t,
}: {
  tab: SettingsTab;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  switch (tab) {
    case 'general':
      return <GeneralSettings t={t} />;
    case 'theme':
      return (
        <div className="flex flex-col gap-6">
          <div className="kb-settings-card rounded-xl border p-6">
            <p className="text-sm text-[var(--surface-text-muted)]">
              {t('settings.theme.placeholder')}
            </p>
          </div>
        </div>
      );
    case 'sync':
      return (
        <div className="flex flex-col gap-6">
          <div className="kb-settings-card rounded-xl border p-6">
            <p className="text-sm text-[var(--surface-text-muted)]">
              {t('settings.sync.placeholder')}
            </p>
          </div>
        </div>
      );
    case 'about':
      return (
        <div className="flex flex-col gap-6">
          <div className="kb-settings-card rounded-xl border p-6">
            <p className="text-sm text-[var(--surface-text-muted)]">
              {t('settings.about.placeholder')}
            </p>
          </div>
        </div>
      );
  }
}

export default function SettingsPanel() {
  const isOpen = useSettingsPanelStore((state) => state.isOpen);
  const close = useSettingsPanelStore((state) => state.close);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { t } = useI18n();

  const handleClose = useCallback(() => {
    close();
  }, [close]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="kb-popover flex h-[min(80vh,560px)] w-[min(90vw,880px)] overflow-hidden rounded-2xl border backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left sidebar */}
            <div className="flex w-[220px] shrink-0 flex-col border-r border-[var(--surface-divider)]">
              <div className="flex items-center justify-between px-4 py-4">
                <h2 className="text-base font-semibold text-[var(--surface-text-strong)]">
                  {t('settings.title')}
                </h2>
              </div>

              <nav className="flex flex-1 flex-col gap-1 px-3 pb-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      activeTab === cat.id
                        ? 'bg-[var(--surface-hover-strong)] text-[var(--surface-text-strong)]'
                        : 'text-[var(--surface-text-muted)] hover:bg-[var(--surface-hover-soft)] hover:text-[var(--surface-text)]',
                    )}
                  >
                    <span className="opacity-80">{cat.icon}</span>
                    <span>{t(cat.labelKey)}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Right content */}
            <div className="flex flex-1 flex-col bg-[var(--app-bg)]/30">
              <div className="flex items-center justify-between border-b border-[var(--surface-divider)] px-6 py-4">
                <h3 className="text-lg font-semibold text-[var(--surface-text-strong)]">
                  {t(`settings.${activeTab}` as const)}
                </h3>
                <button
                  onClick={handleClose}
                  title={t('settings.close')}
                  aria-label={t('settings.close')}
                  className="kb-icon-button rounded-md p-1.5 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
                <SettingsContent tab={activeTab} t={t} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

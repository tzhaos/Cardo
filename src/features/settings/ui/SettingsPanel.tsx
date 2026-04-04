import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Palette, Cloud, Info, X } from 'lucide-react';
import { useI18n } from '../../../app/hooks/useI18n';
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

function SettingsContent({ tab, t }: { tab: SettingsTab; t: (key: string, params?: Record<string, string>) => string }) {
  const placeholders: Record<SettingsTab, string> = {
    general: t('settings.general.placeholder'),
    theme: t('settings.theme.placeholder'),
    sync: t('settings.sync.placeholder'),
    about: t('settings.about.placeholder'),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="kb-settings-card rounded-xl border p-6">
        <p className="text-sm text-[var(--surface-text-muted)]">{placeholders[tab]}</p>
      </div>
    </div>
  );
}

export default function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { t } = useI18n();

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setActiveTab('general');
  }, []);

  // ESC key to close
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
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        title={t('settings.title')}
        aria-label={t('settings.title')}
        className="kb-dock-action rounded-xl p-2 transition-colors"
      >
        <Settings size={20} />
      </button>

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

                <div className="flex-1 overflow-y-auto p-6">
                  <SettingsContent tab={activeTab} t={t} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

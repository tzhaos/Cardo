import { Database, Info, Palette, Settings, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { useSettingsPanelController, type SettingsTab } from '../hooks/useSettingsPanelController';
import { AboutPanel } from './AboutPanel';
import { DataPanel } from './DataPanel';
import { GeneralPanel } from './GeneralPanel';
import { ThemePanel } from './ThemePanel';

function SettingsContent({ activeTab }: { activeTab: SettingsTab }) {
  if (activeTab === 'general') {
    return <GeneralPanel />;
  }

  if (activeTab === 'theme') {
    return <ThemePanel />;
  }

  if (activeTab === 'data') {
    return <DataPanel />;
  }

  return <AboutPanel />;
}

export default function SettingsPanel() {
  const controller = useSettingsPanelController();

  const tabs = [
    { id: 'general' as const, label: controller.tabLabels.general, icon: Settings },
    { id: 'theme' as const, label: controller.tabLabels.theme, icon: Palette },
    { id: 'data' as const, label: controller.tabLabels.data, icon: Database },
    { id: 'about' as const, label: controller.tabLabels.about, icon: Info },
  ];

  return (
    <AnimatePresence>
      {controller.isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={controller.close}
            className="fixed inset-0 z-[99998] bg-black/10 backdrop-blur-[1px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-[99999] flex h-[min(640px,90vh)] w-[min(900px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl shadow-win-flyout"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="win-mica flex h-full w-full overflow-hidden rounded-xl">
              <div className="relative flex w-72 flex-col px-3 pb-4 pt-10">
                <div className="mb-6 px-3">
                  <h2 className="mb-1 text-2xl font-semibold text-win-text">{controller.title}</h2>
                </div>

                <div className="flex flex-col gap-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = controller.activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => controller.setActiveTab(tab.id)}
                        className={cn(
                          'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                          isActive ? 'bg-win-active' : 'hover:bg-win-hover',
                        )}
                      >
                        {isActive ? (
                          <motion.div
                            layoutId="settings-active-tab"
                            className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-win-accent"
                          />
                        ) : null}
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
                  onClick={controller.close}
                  title={controller.closeLabel}
                  aria-label={controller.closeLabel}
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-win-text-secondary transition-colors hover:bg-[#E81123] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex-1 overflow-y-auto p-10">
                  <div className="mx-auto max-w-2xl">
                    <h1 className="mb-8 text-3xl font-semibold text-win-text">
                      {tabs.find((tab) => tab.id === controller.activeTab)?.label ??
                        controller.tabLabels.general}
                    </h1>
                    <SettingsContent activeTab={controller.activeTab} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

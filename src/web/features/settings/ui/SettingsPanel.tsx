import { Database, Info, Palette, Settings, X } from 'lucide-react';
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

  if (!controller.isOpen) {
    return null;
  }

  return (
    <div
      className="fixed left-1/2 top-1/2 z-[99999] flex h-[min(560px,86vh)] w-[min(760px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] shadow-win-flyout"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="kb-settings-surface flex h-full w-full overflow-hidden rounded-[28px]">
        <div className="kb-settings-sidebar relative flex w-56 flex-col px-3 pb-4 pt-8">
          <div className="mb-5 px-3">
            <h2 className="text-xl font-semibold text-win-text">{controller.title}</h2>
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
                    'kb-settings-tab relative flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors',
                    isActive ? 'kb-settings-tab-active' : '',
                  )}
                >
                  {isActive ? (
                    <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-win-accent" />
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
            className="kb-icon-button kb-icon-button-danger absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-win-text-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex-1 overflow-y-auto px-8 py-8">
            <div className="mx-auto max-w-xl">
              <h1 className="mb-6 text-2xl font-semibold text-win-text">
                {tabs.find((tab) => tab.id === controller.activeTab)?.label ??
                  controller.tabLabels.general}
              </h1>
              <SettingsContent activeTab={controller.activeTab} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

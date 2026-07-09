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

interface SettingsPanelProps {
  open?: boolean;
  onClose?: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const controller = useSettingsPanelController({ isOpen: open, onClose });

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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/30 p-6" onClick={controller.close}>
      <div
        className="flex h-[min(640px,88vh)] w-[min(960px,92vw)] overflow-hidden rounded-[28px] shadow-win-flyout"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="kb-settings-surface flex h-full w-full overflow-hidden rounded-[28px]">
          <div className="kb-settings-sidebar relative flex w-64 flex-col px-4 pb-4 pt-8">
            <div className="mb-5 px-3">
              <h2 className="text-xl text-win-text">{controller.title}</h2>
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
                      'kb-settings-tab relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors',
                      isActive ? 'kb-settings-tab-active' : '',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        isActive ? 'text-win-text' : 'text-win-text-secondary',
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className="text-win-text">{tab.label}</span>
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
              className="kb-icon-button kb-icon-button-danger absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-win-text-secondary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex-1 overflow-y-auto px-10 py-10">
              <div className="mx-auto max-w-2xl">
                <h1 className="mb-6 text-2xl text-win-text">
                  {tabs.find((tab) => tab.id === controller.activeTab)?.label ??
                    controller.tabLabels.general}
                </h1>
                <SettingsContent activeTab={controller.activeTab} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

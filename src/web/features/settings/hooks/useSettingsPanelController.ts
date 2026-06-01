import { useEffect, useState } from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import { useSettingsPanelStore } from '../../../app/stores/useSettingsPanelStore';

export type SettingsTab = 'general' | 'theme' | 'data' | 'about';

export function useSettingsPanelController() {
  const isOpen = useSettingsPanelStore((state) => state.isOpen);
  const close = useSettingsPanelStore((state) => state.close);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { t, locale } = useI18n();

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

  return {
    isOpen,
    close,
    activeTab,
    setActiveTab,
    title: t('settings.title'),
    closeLabel: t('settings.close'),
    tabLabels: {
      general: t('settings.general'),
      theme: t('settings.theme'),
      data: locale === 'zh' ? '\u6570\u636e' : 'Data',
      about: t('settings.about'),
    },
  };
}

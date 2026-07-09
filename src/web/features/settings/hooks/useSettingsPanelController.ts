import { useEffect, useState } from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import { useSettingsPanelStore } from '../../../app/stores/useSettingsPanelStore';

export type SettingsTab = 'general' | 'theme' | 'data' | 'about';

interface UseSettingsPanelControllerOptions {
  isOpen?: boolean;
  onClose?: () => void;
}

export function useSettingsPanelController(options: UseSettingsPanelControllerOptions = {}) {
  const storeIsOpen = useSettingsPanelStore((state) => state.isOpen);
  const storeClose = useSettingsPanelStore((state) => state.close);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { t, locale } = useI18n();
  const isOpen = options.isOpen ?? storeIsOpen;
  const close = options.onClose ?? storeClose;

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
      data: locale === 'zh' ? '数据' : 'Data',
      about: t('settings.about'),
    },
  };
}

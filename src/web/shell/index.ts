export { AppShell } from './AppShell';
export { BottomActionBar } from './BottomActionBar';
export { FeatureGate, useFeatureEnabled } from './FeatureGate';
export { MainStage } from './MainStage';
export { PanelHeader } from './PanelHeader';
export { SettingsFoot } from './SettingsFoot';
export { SettingsNav } from './SettingsNav';
export { SettingsShell } from './SettingsShell';
export { ShellTitleLeading } from './ShellTitleLeading';
export { SidebarBrand } from './SidebarBrand';
export { SidebarNav } from './SidebarNav';
export {
  registerSidebarNavRoot,
  sidebarNavItemClassName,
  sidebarNavRootClassName,
  sidebarNavRootRef,
  sidebarPageDropRowClassName,
  usePageDropElementRef,
  useSidebarBoxDropUi,
} from './SidebarPageDropBridge';

/** Shared section bodies for SettingsShell (SettingsContent + section id list). */
export { SettingsContent, SETTINGS_SECTION_IDS } from '../features/settings/SettingsPanel';

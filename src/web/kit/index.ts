/**
 * Cardo UI — thin barrel (compatibility).
 *
 * Prefer path imports for new code (discoverable, tree-shake friendly):
 *   import { Button } from '…/kit/button'
 *   import { NavItem } from '…/kit/nav-item'
 *   import { ThemeIcon } from '…/kit/icon'
 *   import { SettingsRow } from '…/kit/settings-form'
 *
 * Styles load from app stylesheets (web/app/styles.css, web/app/styles.css),
 * not as a side-effect of this module.
 *
 * Icons: Lucide only. Internals: ./internal (do not import from app code).
 * Data attributes: data-cardo-ui.
 * @see docs/architecture/cardo-ui-system-paradigm.md
 */

export { cn } from './cn';

export { Button, kitButtonVariants, type KitButtonProps } from './button';
export { IconButton, IconFrame, type IconButtonProps } from './icon-button';
export { Input, type KitInputProps } from './input';
export { Textarea, type KitTextareaProps } from './textarea';
export { SearchField, type SearchFieldProps } from './search-field';
export { Switch, type KitSwitchProps } from './switch';
export { Segmented, type SegmentedOption, type SegmentedProps } from './segmented';
export { Pill, type PillProps } from './pill';
export { NavItem, SectionLabel, type NavItemProps } from './nav-item';
export { Panel, PanelHeader, Divider } from './panel';
export { PageTitle, PageDescription, SettingsCard, SettingsRow } from './settings-form';
export { ConfirmBar, type ConfirmBarProps } from './confirm-bar';
export { ThemeIcon, type ThemeIconName } from './icon';

export { ContextMenuHost, useContextMenu, type ContextMenuItem } from './context-menu';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
export { ToggleGroup, ToggleGroupItem } from './toggle-group';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { TooltipProvider, HoverTip } from './tooltip';
export { CardoErrorBoundary } from './error-boundary';
export {
  renderCardoErrorScreen,
  classifyCardoError,
  type CardoErrorSurface,
  type CardoErrorViewModel,
  type RenderCardoErrorScreenOptions,
} from './error-screen';

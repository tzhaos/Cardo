import {
  Boxes,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Columns3,
  Globe2,
  LayoutGrid,
  List,
  Inbox,
  Package,
  Plus,
  Rocket,
  Search,
  Settings,
  Star,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { BoxTemplateId } from '../../../../core/domains/workspace/model/workspace';
import { useWorkspaceCommandCenter } from '../hooks/useWorkspaceCommandCenter';
import { cn } from '../../../lib/utils';

const TEMPLATE_ICONS = {
  collection: Package,
  'web-library': Globe2,
  'frequent-sites': Star,
  'reading-list': BookOpen,
  'project-board': ClipboardList,
  'daily-desk': CalendarDays,
  kanban: Columns3,
  launcher: Rocket,
  inbox: Inbox,
} as const satisfies Record<BoxTemplateId, typeof Package>;

interface WorkspaceCommandCenterProps {
  onSelectTemplatePage: (templateId: BoxTemplateId) => void;
  onRevealBox: (boxId: string, itemId?: string) => void;
}

export default function WorkspaceCommandCenter({
  onSelectTemplatePage,
  onRevealBox,
}: WorkspaceCommandCenterProps) {
  const controller = useWorkspaceCommandCenter({
    onSelectTemplatePage,
    onRevealBox,
  });
  const [isOpen, setOpen] = useState(false);
  const SelectedTemplateIcon = TEMPLATE_ICONS[controller.selectedTemplate.id];
  const SelectedLayoutIcon =
    controller.selectedTemplate.defaultLayout === 'grid' ? LayoutGrid : List;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={controller.labels.searchPlaceholder}
        aria-label={controller.labels.searchPlaceholder}
        className="kb-floating-action fixed right-4 top-4 z-[99992] flex h-11 w-11 items-center justify-center rounded-2xl border border-win-border bg-win-mica shadow-win-flyout transition-colors active:scale-95"
      >
        <Search size={18} />
      </button>
    );
  }

  return (
    <aside className="fixed left-4 top-20 z-[99990] w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-win-border bg-win-mica p-2 shadow-win-flyout">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => controller.setTemplateMenuOpen((isOpen) => !isOpen)}
          disabled={controller.hasReachedBoxLimit}
          title={controller.labels.createTemplate}
          aria-label={controller.labels.createTemplate}
          className="kb-floating-action flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={18} />
        </button>

        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-win-border bg-win-bg-secondary px-2 py-1.5">
          <Search size={15} className="shrink-0 text-win-text-secondary" />
          <input
            value={controller.query}
            onChange={(event) => controller.setQuery(event.target.value)}
            placeholder={controller.labels.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-win-text outline-none placeholder:text-win-text-secondary"
          />
        </label>

        <button
          type="button"
          onClick={controller.openSettings}
          title={controller.labels.settings}
          aria-label={controller.labels.settings}
          className="kb-floating-action flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors active:scale-95"
        >
          <Settings size={18} />
        </button>

        <button
          type="button"
          onClick={() => setOpen(false)}
          title={controller.labels.close}
          aria-label={controller.labels.close}
          className="kb-floating-action flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors active:scale-95"
        >
          <X size={18} />
        </button>
      </div>

      {controller.isTemplateMenuOpen ? (
        <div className="mt-2 rounded-lg border border-win-border bg-win-card p-2">
          <div className="mb-2 flex items-center gap-2 px-1 text-xs text-win-text-secondary">
            <Package size={13} />
            <span>{controller.labels.templatePicker}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-1">
              {controller.templates.map((template) => {
                const Icon = TEMPLATE_ICONS[template.id];
                const isSelected = template.id === controller.selectedTemplateId;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => controller.setSelectedTemplateId(template.id)}
                    className={cn(
                      'flex min-h-10 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                      isSelected
                        ? 'bg-win-active text-win-text'
                        : 'text-win-text-secondary hover:bg-win-hover hover:text-win-text',
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{template.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="min-w-0 rounded-md border border-win-border bg-win-bg-secondary p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-win-border bg-win-card text-win-text-secondary">
                  <SelectedTemplateIcon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-win-text">
                    {controller.selectedTemplate.label}
                  </div>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-win-text-secondary">
                    {controller.selectedTemplate.description}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-win-text-secondary">
                <SelectedLayoutIcon size={14} />
                <span className="truncate">{controller.selectedTemplate.action}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  controller.createTemplate(controller.selectedTemplate.id);
                  setOpen(false);
                }}
                disabled={controller.hasReachedBoxLimit}
                className="kb-primary-button mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md px-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={16} />
                <span className="truncate">{controller.labels.createTemplate}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-2 max-h-[min(42vh,24rem)] overflow-y-auto">
        <div className="mb-1 flex items-center gap-2 px-1 text-xs text-win-text-secondary">
          <Boxes size={13} />
          <span>{controller.labels.navigator}</span>
        </div>
        <div className="flex flex-col gap-1">
          {controller.filteredBoxRows.length > 0 ? (
            controller.filteredBoxRows.map(({ box, title }) => {
              const TemplateIcon = TEMPLATE_ICONS[box.templateId];

              return (
                <button
                  key={box.id}
                  type="button"
                  onClick={() => {
                    controller.focusBox(box);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-win-hover',
                    box.isLocked ? 'text-red-300' : 'text-win-text',
                  )}
                >
                  <TemplateIcon size={15} className="shrink-0 text-win-text-secondary" />
                  <span className="min-w-0 flex-1 truncate">{title}</span>
                </button>
              );
            })
          ) : (
            <div className="rounded-lg px-2 py-2 text-sm text-win-text-secondary">
              {controller.labels.noBoxes}
            </div>
          )}
        </div>
        {controller.filteredFrequentBookmarkRows.length > 0 || controller.hasQuery ? (
          <>
            <div className="mb-1 mt-3 flex items-center gap-2 px-1 text-xs text-win-text-secondary">
              <Star size={13} />
              <span>{controller.labels.frequentSites}</span>
            </div>
            <div className="flex flex-col gap-1">
              {controller.filteredFrequentBookmarkRows.length > 0 ? (
                controller.filteredFrequentBookmarkRows.map(({ bookmark }) => (
                  <button
                    key={bookmark.id}
                    type="button"
                    onClick={() => {
                      controller.openBookmark(bookmark);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-win-text transition-colors hover:bg-win-hover"
                  >
                    <Star
                      size={15}
                      className="shrink-0 text-win-text-secondary"
                      fill={bookmark.isPinned ? 'currentColor' : 'none'}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{bookmark.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-win-text-secondary">
                        {bookmark.url}
                      </span>
                    </span>
                    {bookmark.openCount > 0 ? (
                      <span className="rounded-full bg-win-bg-secondary px-2 py-0.5 text-xs text-win-text-secondary">
                        {bookmark.openCount}
                      </span>
                    ) : null}
                  </button>
                ))
              ) : (
                <div className="rounded-lg px-2 py-2 text-sm text-win-text-secondary">
                  {controller.labels.noFrequentSites}
                </div>
              )}
            </div>
          </>
        ) : null}
        {controller.filteredItemRows.length > 0 || controller.hasQuery ? (
          <>
            <div className="mb-1 mt-3 flex items-center gap-2 px-1 text-xs text-win-text-secondary">
              <ClipboardList size={13} />
              <span>{controller.labels.items}</span>
            </div>
            <div className="flex flex-col gap-1">
              {controller.filteredItemRows.length > 0 ? (
                controller.filteredItemRows.map(({ item, box, boxTitle }) => (
                  <button
                    key={`${box.id}:${item.id}`}
                    type="button"
                    onClick={() => {
                      controller.focusItem(box, item.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-win-text transition-colors hover:bg-win-hover"
                  >
                    <ClipboardList size={15} className="shrink-0 text-win-text-secondary" />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="max-w-[6rem] truncate text-xs text-win-text-secondary">
                      {boxTitle}
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-lg px-2 py-2 text-sm text-win-text-secondary">
                  {controller.labels.noItems}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}

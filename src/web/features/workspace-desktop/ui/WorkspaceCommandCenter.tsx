import {
  Boxes,
  ClipboardList,
  Columns3,
  Inbox,
  Package,
  Plus,
  Rocket,
  Search,
  Settings,
} from 'lucide-react';
import type { BoxTemplateId } from '../../../../core/domains/workspace/model/workspace';
import { useWorkspaceCommandCenter } from '../hooks/useWorkspaceCommandCenter';
import { cn } from '../../../lib/utils';

const TEMPLATE_ICONS = {
  collection: Package,
  kanban: Columns3,
  launcher: Rocket,
  inbox: Inbox,
} as const satisfies Record<BoxTemplateId, typeof Package>;

export default function WorkspaceCommandCenter() {
  const controller = useWorkspaceCommandCenter();

  return (
    <aside className="fixed left-4 top-20 z-[99990] w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-win-border bg-win-mica p-2 shadow-win-flyout">
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
      </div>

      {controller.isTemplateMenuOpen ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {controller.templates.map((template) => {
            const Icon = TEMPLATE_ICONS[template.id];

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => controller.createTemplate(template.id)}
                className="kb-secondary-button flex items-center gap-2 rounded-lg border border-win-border bg-win-card px-3 py-2 text-left text-sm transition-colors"
              >
                <Icon size={16} className="shrink-0 text-win-text-secondary" />
                <span className="truncate">{template.label}</span>
              </button>
            );
          })}
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
                  onClick={() => controller.focusBox(box)}
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
                    onClick={() => controller.focusItem(box, item.id)}
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

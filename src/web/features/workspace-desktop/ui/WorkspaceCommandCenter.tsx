import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen,
  Boxes,
  CalendarDays,
  ClipboardList,
  Columns3,
  Globe2,
  Inbox,
  Package,
  Rocket,
  Search,
  Settings,
  Star,
} from 'lucide-react';
import { useRef, useState, type ComponentType, type ReactNode } from 'react';
import type { BoxTemplateId } from '../../../../core/domains/workspace/model/workspace';
import { cn } from '../../../lib/utils';
import { useWorkspaceCommandCenter } from '../hooks/useWorkspaceCommandCenter';

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

interface ResultSectionProps {
  children: ReactNode;
  emptyLabel: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  isEmpty: boolean;
  title: string;
}

function ResultSection({ children, emptyLabel, icon: Icon, isEmpty, title }: ResultSectionProps) {
  return (
    <section className="kb-command-section">
      <div className="mb-1 flex items-center gap-2 px-2 text-xs text-win-text-secondary">
        <Icon size={13} className="shrink-0" />
        <span className="truncate">{title}</span>
      </div>
      <div className="flex flex-col gap-1">
        {isEmpty ? (
          <div className="rounded-lg px-3 py-2 text-sm text-win-text-secondary">{emptyLabel}</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export default function WorkspaceCommandCenter({
  onSelectTemplatePage,
  onRevealBox,
}: WorkspaceCommandCenterProps) {
  const controller = useWorkspaceCommandCenter({
    onSelectTemplatePage,
    onRevealBox,
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setFocused] = useState(false);
  const isExpanded = isFocused || controller.hasQuery;

  const closePanel = () => {
    controller.setQuery('');
    setFocused(false);
    rootRef.current?.querySelector('input')?.blur();
  };

  return (
    <div
      ref={rootRef}
      className="kb-command-center fixed right-4 top-4 z-[99992] w-[min(23rem,calc(100vw-2rem))]"
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        const nextFocusedNode = event.relatedTarget;

        if (nextFocusedNode instanceof Node && event.currentTarget.contains(nextFocusedNode)) {
          return;
        }

        setFocused(false);
      }}
    >
      <div className={cn('kb-command-search flex h-11 items-center gap-2 rounded-2xl px-3')}>
        <Search size={16} className="shrink-0 text-win-text-secondary" />
        <input
          value={controller.query}
          onChange={(event) => controller.setQuery(event.target.value)}
          placeholder={controller.labels.searchPlaceholder}
          aria-label={controller.labels.searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-win-text outline-none placeholder:text-win-text-secondary"
        />
        <button
          type="button"
          onClick={controller.openSettings}
          title={controller.labels.settings}
          aria-label={controller.labels.settings}
          className="kb-command-icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition active:scale-95"
        >
          <Settings size={16} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            key="command-results"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'tween', duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="kb-command-panel custom-scrollbar absolute right-0 top-[calc(100%+10px)] max-h-[min(58vh,32rem)] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl p-2"
            onMouseDown={(event) => event.preventDefault()}
          >
            <ResultSection
              icon={Boxes}
              title={controller.labels.navigator}
              emptyLabel={controller.labels.noBoxes}
              isEmpty={controller.filteredBoxRows.length === 0}
            >
              {controller.filteredBoxRows.map(({ box, title }) => {
                const TemplateIcon = TEMPLATE_ICONS[box.templateId];

                return (
                  <button
                    key={box.id}
                    type="button"
                    onClick={() => {
                      controller.focusBox(box);
                      closePanel();
                    }}
                    className={cn(
                      'kb-command-result flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition',
                      box.isLocked ? 'text-red-400' : 'text-win-text',
                    )}
                  >
                    <TemplateIcon size={15} className="shrink-0 text-win-text-secondary" />
                    <span className="min-w-0 flex-1 truncate">{title}</span>
                  </button>
                );
              })}
            </ResultSection>

            {controller.filteredFrequentBookmarkRows.length > 0 || controller.hasQuery ? (
              <ResultSection
                icon={Star}
                title={controller.labels.frequentSites}
                emptyLabel={controller.labels.noFrequentSites}
                isEmpty={controller.filteredFrequentBookmarkRows.length === 0}
              >
                {controller.filteredFrequentBookmarkRows.map(({ bookmark }) => (
                  <button
                    key={bookmark.id}
                    type="button"
                    onClick={() => {
                      controller.openBookmark(bookmark);
                      closePanel();
                    }}
                    className="kb-command-result flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-win-text transition"
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
                      <span className="kb-command-count rounded-full px-2 py-0.5 text-xs text-win-text-secondary">
                        {bookmark.openCount}
                      </span>
                    ) : null}
                  </button>
                ))}
              </ResultSection>
            ) : null}

            {controller.filteredItemRows.length > 0 || controller.hasQuery ? (
              <ResultSection
                icon={ClipboardList}
                title={controller.labels.items}
                emptyLabel={controller.labels.noItems}
                isEmpty={controller.filteredItemRows.length === 0}
              >
                {controller.filteredItemRows.map(({ item, box, boxTitle }) => (
                  <button
                    key={`${box.id}:${item.id}`}
                    type="button"
                    onClick={() => {
                      controller.focusItem(box, item.id);
                      closePanel();
                    }}
                    className="kb-command-result flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-win-text transition"
                  >
                    <ClipboardList size={15} className="shrink-0 text-win-text-secondary" />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="max-w-[7rem] truncate text-xs text-win-text-secondary">
                      {boxTitle}
                    </span>
                  </button>
                ))}
              </ResultSection>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

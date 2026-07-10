import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { webNextStorage } from '../../platform/hostPlatform';

export type OperationCategory = 'mutation' | 'activity' | 'system';
export type OperationSource = 'user' | 'undo' | 'redo' | 'system' | 'import';

export interface OperationTarget {
  pageId?: string;
  boxId?: string;
  itemId?: string;
  pageTitle?: string;
  boxTitle?: string;
  itemTitle?: string;
}

export interface OperationEvent {
  id: string;
  timestamp: string;
  category: OperationCategory;
  action: string;
  source: OperationSource;
  target?: OperationTarget;
  details?: Record<string, string | number | boolean | null>;
  transactionId?: string;
  relatedEventId?: string;
  undoable: boolean;
}

export interface OperationDraft extends Omit<OperationEvent, 'id' | 'timestamp'> {
  timestamp?: string;
}

interface OperationJournalStore {
  events: OperationEvent[];
  append: (draft: OperationDraft) => string;
}

const MAX_EVENTS = 5000;
const MAX_EVENT_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export const useOperationJournalStore = create<OperationJournalStore>()(
  persist(
    (set) => ({
      events: [],
      append: (draft) => {
        const event: OperationEvent = {
          ...draft,
          id: createOperationId(),
          timestamp: draft.timestamp ?? new Date().toISOString(),
        };
        set((state) => ({ events: retainEvents([...state.events, event]) }));
        return event.id;
      },
    }),
    {
      name: 'khaosbox.web-next.operation-journal',
      version: 1,
      storage: createJSONStorage(() => webNextStorage),
      skipHydration: true,
      partialize: ({ events }) => ({ events }),
      merge: (persistedState, currentState) => {
        const persistedEvents = (persistedState as Partial<OperationJournalStore> | undefined)
          ?.events;
        return {
          ...currentState,
          events: Array.isArray(persistedEvents)
            ? retainEvents(persistedEvents.filter(isOperationEvent))
            : [],
        };
      },
    },
  ),
);

export function recordOperation(draft: OperationDraft) {
  return useOperationJournalStore.getState().append(draft);
}

export function exportOperationJournal() {
  const events = useOperationJournalStore.getState().events;
  const exportedAt = new Date().toISOString();
  const payload = {
    format: 'khaosbox-operation-journal',
    version: 1,
    exportedAt,
    privacy: 'redacted',
    retention: { maximumEvents: MAX_EVENTS, maximumAgeDays: 90 },
    events,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `khaosbox-operation-log-${exportedAt.slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  recordOperation({
    category: 'system',
    action: 'journal.export',
    source: 'system',
    undoable: false,
    details: { eventCount: events.length },
  });
}

function retainEvents(events: OperationEvent[]) {
  const minimumTimestamp = Date.now() - MAX_EVENT_AGE_MS;
  return events
    .filter((event) => {
      const timestamp = Date.parse(event.timestamp);
      return Number.isFinite(timestamp) && timestamp >= minimumTimestamp;
    })
    .slice(-MAX_EVENTS);
}

function createOperationId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `operation-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function isOperationEvent(input: unknown): input is OperationEvent {
  if (!input || typeof input !== 'object') return false;
  const event = input as Partial<OperationEvent>;
  return (
    typeof event.id === 'string' &&
    typeof event.timestamp === 'string' &&
    (event.category === 'mutation' ||
      event.category === 'activity' ||
      event.category === 'system') &&
    typeof event.action === 'string' &&
    (event.source === 'user' ||
      event.source === 'undo' ||
      event.source === 'redo' ||
      event.source === 'system' ||
      event.source === 'import') &&
    typeof event.undoable === 'boolean'
  );
}

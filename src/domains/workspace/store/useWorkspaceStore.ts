import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BoxData } from '../../../types/box';
import { createItemFromText } from '../../items/services/createItem';
import { createPlatformJSONStorage } from '../../../platform/storage/createPlatformStateStorage';
import { useUIStore } from '../../ui/store/useUIStore';
import { createInitialBoxes, DEFAULT_BOX_THEME, getMaxZIndex } from '../model/defaultBoxes';

interface WorkspaceState {
  boxes: BoxData[];
  maxZIndex: number;
  bringToFront: (id: string) => void;
  updateBox: (id: string, updates: Partial<BoxData>) => void;
  toggleMinimize: (id: string) => void;
  deleteBox: (id: string) => void;
  createBox: () => void;
  toggleAllMinimized: () => boolean;
  addPastedItem: (text: string) => string | null;
  moveItem: (
    itemId: string,
    sourceBoxId: string,
    targetBoxId: string,
    targetIndex?: number,
  ) => void;
  replaceBoxes: (boxes: BoxData[]) => void;
  clearBoxes: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      boxes: createInitialBoxes(),
      maxZIndex: 12,

      bringToFront: (id) => {
        const nextZIndex = get().maxZIndex + 1;

        set({
          maxZIndex: nextZIndex,
          boxes: get().boxes.map((box) => (box.id === id ? { ...box, zIndex: nextZIndex } : box)),
        });
      },

      updateBox: (id, updates) => {
        set({
          boxes: get().boxes.map((box) => (box.id === id ? { ...box, ...updates } : box)),
        });
      },

      toggleMinimize: (id) => {
        set({
          boxes: get().boxes.map((box) =>
            box.id === id ? { ...box, isMinimized: !box.isMinimized } : box,
          ),
        });
      },

      deleteBox: (id) => {
        set({
          boxes: get().boxes.filter((box) => box.id !== id),
        });
      },

      createBox: () => {
        const nextZIndex = get().maxZIndex + 1;

        const newBox: BoxData = {
          id: `box-${Date.now()}`,
          title: 'New Box',
          x: window.innerWidth / 2 - 160,
          y: window.innerHeight / 2 - 200,
          width: 320,
          height: 400,
          theme: DEFAULT_BOX_THEME,
          isLocked: false,
          isMinimized: false,
          layout: 'list',
          zIndex: nextZIndex,
          items: [],
        };

        set({
          maxZIndex: nextZIndex,
          boxes: [...get().boxes, newBox],
        });

        useUIStore.getState().setActiveBox(newBox.id);
      },

      toggleAllMinimized: () => {
        const allMinimized = get().boxes.every((box) => box.isMinimized);

        set({
          boxes: get().boxes.map((box) => ({ ...box, isMinimized: !allMinimized })),
        });

        return !allMinimized;
      },

      addPastedItem: (text) => {
        const boxes = get().boxes;
        const activeBoxId = useUIStore.getState().activeBoxId;
        const newItem = createItemFromText(text);
        const isUrl = newItem.type === 'url';

        let targetBox = activeBoxId ? boxes.find((box) => box.id === activeBoxId) : null;

        if (!targetBox) {
          targetBox = boxes.find((box) => box.id === (isUrl ? 'webpages' : 'clipboard'));
        }

        if (!targetBox) {
          targetBox = boxes[0];
        }

        if (!targetBox) {
          return null;
        }

        set({
          boxes: boxes.map((box) =>
            box.id === targetBox.id ? { ...box, items: [...box.items, newItem] } : box,
          ),
        });

        return targetBox.title;
      },

      moveItem: (itemId, sourceBoxId, targetBoxId, targetIndex) => {
        set((state) => {
          const boxes = [...state.boxes];
          const sourceBoxIndex = boxes.findIndex((box) => box.id === sourceBoxId);
          const targetBoxIndex = boxes.findIndex((box) => box.id === targetBoxId);

          if (sourceBoxIndex === -1 || targetBoxIndex === -1) {
            return state;
          }

          const sourceBox = { ...boxes[sourceBoxIndex], items: [...boxes[sourceBoxIndex].items] };
          const itemIndex = sourceBox.items.findIndex((item) => item.id === itemId);

          if (itemIndex === -1) {
            return state;
          }

          const [item] = sourceBox.items.splice(itemIndex, 1);

          if (sourceBoxId === targetBoxId) {
            if (targetIndex !== undefined) {
              const adjustedIndex = targetIndex > itemIndex ? targetIndex - 1 : targetIndex;
              const referenceItem =
                sourceBox.items[adjustedIndex] || sourceBox.items[adjustedIndex - 1];

              if (referenceItem) {
                item.isPinned = referenceItem.isPinned;
              }

              sourceBox.items.splice(adjustedIndex, 0, item);
            } else {
              item.isPinned = false;
              sourceBox.items.push(item);
            }

            boxes[sourceBoxIndex] = sourceBox;
          } else {
            const targetBox = { ...boxes[targetBoxIndex], items: [...boxes[targetBoxIndex].items] };

            if (targetIndex !== undefined) {
              const referenceItem = targetBox.items[targetIndex] || targetBox.items[targetIndex - 1];

              if (referenceItem) {
                item.isPinned = referenceItem.isPinned;
              }

              targetBox.items.splice(targetIndex, 0, item);
            } else {
              item.isPinned = false;
              targetBox.items.push(item);
            }

            boxes[sourceBoxIndex] = sourceBox;
            boxes[targetBoxIndex] = targetBox;
          }

          return { boxes };
        });
      },

      replaceBoxes: (boxes) => {
        set({
          boxes,
          maxZIndex: getMaxZIndex(boxes),
        });
      },

      clearBoxes: () => {
        set({
          boxes: [],
          maxZIndex: 0,
        });
      },
    }),
    {
      name: 'khaosbox-workspace',
      storage: createPlatformJSONStorage<WorkspaceState>(),
      partialize: ({ boxes, maxZIndex }) => ({ boxes, maxZIndex }),
    },
  ),
);

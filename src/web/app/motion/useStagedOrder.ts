import { useEffect, useRef, useState } from 'react';

/**
 * Keeps drag-reorder updates local to the animated list and persists only the
 * final order. This prevents pointer-rate storage writes and workspace-wide
 * renders while Motion is calculating a drag.
 */
export function useStagedOrder<TItem extends { id: string }>(
  items: TItem[],
  commitOrder: (orderedIds: string[]) => void,
) {
  const initialIds = items.map((item) => item.id);
  const orderRef = useRef(initialIds);
  const persistedOrderRef = useRef(initialIds);
  const isStagingRef = useRef(false);
  const commitOrderRef = useRef(commitOrder);
  const [orderedIds, setOrderedIds] = useState(() => items.map((item) => item.id));

  useEffect(() => {
    commitOrderRef.current = commitOrder;
  }, [commitOrder]);

  useEffect(() => {
    if (isStagingRef.current) {
      return;
    }

    const persistedIds = items.map((item) => item.id);
    orderRef.current = persistedIds;
    persistedOrderRef.current = persistedIds;
    setOrderedIds((currentIds) =>
      areIdsEqual(currentIds, persistedIds) ? currentIds : persistedIds,
    );
  }, [items]);

  // Unmount mid-drag must exit staging so later item updates are not ignored.
  useEffect(
    () => () => {
      isStagingRef.current = false;
    },
    [],
  );

  return {
    orderedIds,
    startReordering: () => {
      isStagingRef.current = true;
    },
    updateOrder: (nextOrderedIds: string[]) => {
      // Keep pinned items before unpinned (Runtime enforces the same rule).
      const pinned = new Set(
        items.filter((item) => 'isPinned' in item && item.isPinned).map((item) => item.id),
      );
      if (pinned.size > 0) {
        const nextPinned = nextOrderedIds.filter((id) => pinned.has(id));
        const nextUnpinned = nextOrderedIds.filter((id) => !pinned.has(id));
        nextOrderedIds = [...nextPinned, ...nextUnpinned];
      }
      orderRef.current = nextOrderedIds;
      setOrderedIds(nextOrderedIds);
    },
    finishReordering: () => {
      if (!isStagingRef.current) {
        return;
      }

      isStagingRef.current = false;
      if (!areIdsEqual(orderRef.current, persistedOrderRef.current)) {
        commitOrderRef.current(orderRef.current);
      }
    },
    cancelReordering: () => {
      isStagingRef.current = false;
      orderRef.current = persistedOrderRef.current;
      setOrderedIds(persistedOrderRef.current);
    },
  };
}

function areIdsEqual(first: string[], second: string[]) {
  return first.length === second.length && first.every((id, index) => id === second[index]);
}

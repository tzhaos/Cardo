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

  return {
    orderedIds,
    startReordering: () => {
      isStagingRef.current = true;
    },
    updateOrder: (nextOrderedIds: string[]) => {
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
  };
}

function areIdsEqual(first: string[], second: string[]) {
  return first.length === second.length && first.every((id, index) => id === second[index]);
}

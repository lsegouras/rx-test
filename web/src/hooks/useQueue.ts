/*
 * useQueue.ts | Layer: Web
 * State of the page: the queue as the API returned it, the filter, and the action in flight.
 * Must NOT change rows locally: after every action it asks the API for the queue again.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchQueue, postAction, type ApiError } from '../api/ordersApi';
import type { QueueFilter, QueueItem } from '../api/types';

/**
 * Loads the queue for the current filter and runs order actions.
 * @returns items in API order, the filter and its setter, loading and error state, the id of the
 *   order whose action is in flight, and runAction
 * @see PDF §8
 */
export function useQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<QueueFilter>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const latestRequest = useRef(0);
  // The filter on screen right now, readable by an action that started before it changed.
  const currentFilter = useRef(filter);

  const load = useCallback(async (filterToLoad: QueueFilter) => {
    const request = ++latestRequest.current;
    try {
      const queue = await fetchQueue(filterToLoad);
      // A slower, older response must not overwrite a newer one (e.g. after a quick filter change).
      if (request === latestRequest.current) setItems(queue);
    } catch (caught) {
      if (request === latestRequest.current) setError(caught as ApiError);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    currentFilter.current = filter;
    setLoading(true);
    void load(filter);
  }, [filter, load]);

  const runAction = useCallback(
    async (id: number, action: string) => {
      setPendingId(id);
      setError(null);
      try {
        await postAction(id, action);
      } catch (caught) {
        setError(caught as ApiError);
      }
      // Refetch whether it worked or not: the API is the only source of score, order and status.
      // Use the filter selected now, which may differ from the one selected when the action started.
      await load(currentFilter.current);
      setPendingId(null);
    },
    [load],
  );

  const clearError = useCallback(() => setError(null), []);

  return { items, filter, setFilter, loading, error, clearError, pendingId, runAction };
}

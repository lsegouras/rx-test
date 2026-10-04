/*
 * ordersApi.ts | Layer: Web
 * The only place that talks to the API: fetch the queue and post an action.
 * Must NOT compute, sort or cache anything.
 */
import type { ApiErrorBody, QueueFilter, QueueItem } from './types';

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/**
 * A failed API call. `code` is the stable error code of the API (for example INVALID_TRANSITION);
 * it is undefined for failures outside the API contract, which get a generic message.
 */
export class ApiError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init).catch(() => {
    // The API could not be reached at all.
    throw new ApiError(GENERIC_MESSAGE);
  });
  if (response.ok) return (await response.json()) as T;

  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  // Only errors with a code are part of the API contract; never show any other server text.
  if (body?.error?.code) throw new ApiError(body.error.message, body.error.code);
  throw new ApiError(GENERIC_MESSAGE);
}

/**
 * Loads the queue, already scored and sorted by the API.
 * @param filter 'active' sends no query param; a status sends ?status=<status>
 * @see PDF §7
 */
export function fetchQueue(filter: QueueFilter): Promise<QueueItem[]> {
  return request(filter === 'active' ? '/orders/queue' : `/orders/queue?status=${filter}`);
}

/**
 * Asks the API to apply an action to an order. The API decides whether it is legal.
 * @param action a name taken from the order's allowed_actions
 * @see PDF §6, §7
 */
export function postAction(id: number, action: string): Promise<{ id: number; status: string }> {
  return request(`/orders/${id}/${action}`, { method: 'POST' });
}

/*
 * types.ts | Layer: Web
 * Shapes of what the API sends. They mirror the queue item of GET /orders/queue field by field.
 * Must NOT list the statuses, types or actions an order can have (the API owns them);
 * the only exception is QueueFilter, the filter values the page offers (PDF §8).
 */

/** One row of the queue, exactly as the API returns it. @see PDF §7, §8 */
export interface QueueItem {
  id: number;
  /** Computed by the API at request time; the UI only displays it. */
  score: number;
  customer_name: string;
  type: string;
  items: { name: string; quantity: number }[];
  /** Whole minutes since placed_at, computed by the API with the same "now" as the score. */
  minutes_waiting: number;
  /** ISO 8601 UTC. */
  placed_at: string;
  /** ISO 8601 UTC, or null when the order has no promised time. */
  promised_at: string | null;
  is_vip: boolean;
  status: string;
  /** Actions the server allows for this order right now; the UI renders one button per entry. */
  allowed_actions: string[];
}

/** Filter of the page: the default active queue, or one status. @see PDF §8 */
export type QueueFilter = 'active' | 'received' | 'preparing';

/** Body of a 4xx response. A 500 carries no code. @see PDF §7 */
export interface ApiErrorBody {
  error: { code?: string; message: string };
}

/*
 * format.ts | Layer: Web
 * Display only: turns API values into labels and text for the table.
 * Must NOT score, sort, or decide which actions an order has.
 */
import type { QueueItem } from './api/types';

type ChipColor = 'default' | 'info' | 'success';
type ButtonColor = 'primary' | 'error';

const ACTION_LABELS: Record<string, string> = {
  start: 'Start',
  ready: 'Mark ready',
  pickup: 'Picked up',
  cancel: 'Cancel',
};
const ACTION_COLORS: Record<string, ButtonColor> = { cancel: 'error' };
const TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine-in',
  takeout: 'Takeout',
  delivery: 'Delivery',
};
const STATUS_LABELS: Record<string, string> = { received: 'Received', preparing: 'Preparing' };
const STATUS_COLORS: Record<string, ChipColor> = { preparing: 'info', ready: 'success' };

/** Button text for an action; an action without a label shows its API name. */
export const actionLabel = (action: string): string => ACTION_LABELS[action] ?? action;

/** Button color for an action. */
export const actionColor = (action: string): ButtonColor => ACTION_COLORS[action] ?? 'primary';

/** Text for an order type; an unknown type shows its API value. */
export const typeLabel = (type: string): string => TYPE_LABELS[type] ?? type;

/** Text for a status; an unknown status shows its API value. */
export const statusLabel = (status: string): string => STATUS_LABELS[status] ?? status;

/** Chip color for a status. */
export const statusColor = (status: string): ChipColor => STATUS_COLORS[status] ?? 'default';

/** Items summary, e.g. "2x Grilled Salmon, 1x Caesar Salad". @see PDF §8 */
export const formatItems = (items: QueueItem['items']): string =>
  items.map((item) => `${item.quantity}x ${item.name}`).join(', ');

/** Wait time as sent by the API, e.g. "35 min". */
export const formatWait = (minutesWaiting: number): string => `${minutesWaiting} min`;

/** Promised time in the viewer's local time as HH:mm, or a dash when there is none. */
export const formatPromised = (promisedAt: string | null): string =>
  promisedAt === null
    ? '—'
    : new Date(promisedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

/*
 * QueueTable.test.tsx | Layer: Web (test)
 * Component test of the queue table with its own fixtures (not the seed).
 * It protects one architecture rule: buttons come from allowed_actions, never from status.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import type { QueueItem } from '../api/types';
import QueueTable from './QueueTable';

afterEach(cleanup);

const item = (overrides: Partial<QueueItem>): QueueItem => ({
  id: 1,
  score: 60,
  customer_name: 'Ana',
  type: 'dine_in',
  items: [{ name: 'Grilled Salmon', quantity: 2 }],
  minutes_waiting: 35,
  placed_at: '2026-06-15T11:25:00.000Z',
  promised_at: null,
  is_vip: false,
  status: 'received',
  allowed_actions: ['start', 'cancel'],
  ...overrides,
});

function renderTable(items: QueueItem[]) {
  const { container } = render(<QueueTable items={items} pendingId={null} onAction={() => {}} />);
  const row = (id: number) => within(container.querySelector<HTMLElement>(`tr[data-order-id="${id}"]`)!);
  const hasButton = (id: number, name: string) => row(id).queryByRole('button', { name }) !== null;
  return { hasButton };
}

describe('QueueTable', () => {
  test('shows the empty state when there are no orders', () => {
    renderTable([]);

    expect(screen.getByText('No orders in the queue')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toEqual([]);
  });

  test('with the actions the API sends today, Cancel is shown only on the received row', () => {
    const { hasButton } = renderTable([
      item({ id: 1, status: 'received', allowed_actions: ['start', 'cancel'] }),
      item({ id: 2, status: 'preparing', allowed_actions: ['ready'] }),
    ]);

    expect(hasButton(1, 'Cancel')).toBe(true);
    expect(hasButton(2, 'Cancel')).toBe(false);
  });

  test('buttons follow allowed_actions, not status', () => {
    // Deliberately mismatched with today's rules: if the table derived buttons from status, this fails.
    const { hasButton } = renderTable([
      item({ id: 1, status: 'received', allowed_actions: ['start'] }),
      item({ id: 2, status: 'preparing', allowed_actions: ['ready', 'cancel'] }),
    ]);

    expect(hasButton(1, 'Start')).toBe(true);
    expect(hasButton(1, 'Cancel')).toBe(false);
    expect(hasButton(2, 'Mark ready')).toBe(true);
    expect(hasButton(2, 'Cancel')).toBe(true);
  });
});

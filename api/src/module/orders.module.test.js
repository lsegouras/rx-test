/*
 * orders.module.test.js | Layer: Module (test)
 * Tests queue assembly and applyAction with an in-memory fake repository and a fixed clock: no PostgreSQL.
 * Active statuses, scores and allowed actions are derived from the rules, so changing a weight, the active
 * queue or an allowed action does not edit this file. applyAction cases use received -> preparing as example.
 */
const { createOrdersModule } = require('./orders.module');
const { computePriority, compareQueue } = require('./priority');
const { ACTIVE_QUEUE_STATUSES, INITIAL_STATUS } = require('./status.rules');
const { ORDER_STATUSES, allowedActions } = require('./transitions');
const { FROZEN_NOW, minutesAgo, minutesFromNow, fixedClock } = require('../testing/frozen-now');

const SALMON = { name: 'Grilled Salmon', quantity: 2, prep_time_minutes: 20 };
const PIZZA = { name: 'Margherita Pizza', quantity: 1, prep_time_minutes: 12 };

const order = (overrides) => ({
  id: 1,
  customer_name: 'Ana',
  type: 'dine_in',
  is_vip: false,
  status: 'received',
  placed_at: minutesAgo(35),
  promised_at: null,
  items: [SALMON],
  ...overrides,
});

/** Ids of the menu items the fake repository knows. */
const MENU_ITEM_IDS = [1, 2, 3];

/** One order per status, with different scores among the active ones. */
const ONE_PER_STATUS = [
  order({ id: 1, status: 'received', type: 'delivery', items: [PIZZA] }),
  order({ id: 2, status: 'preparing', type: 'dine_in', is_vip: true }),
  order({ id: 3, status: 'ready' }),
  order({ id: 4, status: 'picked_up' }),
  order({ id: 5, status: 'cancelled' }),
  order({ id: 6, status: 'received', type: 'takeout', promised_at: minutesFromNow(20) }),
];

/** Same contract as orders.repository.js, backed by an array. */
function fakeRepository(orders) {
  const rows = orders.map((row) => ({ ...row }));
  return {
    rows,
    findByStatuses: async (statuses) => rows.filter((row) => statuses.includes(row.status)),
    findById: async (id) => {
      const row = rows.find((candidate) => candidate.id === id);
      return row ? { id: row.id, status: row.status } : null;
    },
    updateStatusIfCurrent: async (id, from, to) => {
      const row = rows.find((candidate) => candidate.id === id && candidate.status === from);
      if (!row) return 0;
      row.status = to;
      return 1;
    },
    findMenuItemsByIds: async (ids) => MENU_ITEM_IDS.filter((id) => ids.includes(id)).map((id) => ({ id })),
    createOrder: async (newOrder) => {
      const row = { ...newOrder, id: rows.length + 1 };
      rows.push(row);
      return { id: row.id, status: row.status, placed_at: row.placed_at };
    },
  };
}

function setup(orders = ONE_PER_STATUS) {
  const repository = fakeRepository(orders);
  const ordersModule = createOrdersModule({ repository, clock: fixedClock(FROZEN_NOW) });
  return { repository, ordersModule };
}

const domainError = (code) => expect.objectContaining({ code });
const idsOf = (items) => items.map((item) => item.id);

describe('getQueue', () => {
  test('the default queue returns exactly the orders whose status is active', async () => {
    const { ordersModule } = setup();
    const expected = ONE_PER_STATUS.filter((o) => ACTIVE_QUEUE_STATUSES.includes(o.status));

    const queue = await ordersModule.getQueue();

    expect(idsOf(queue).sort()).toEqual(idsOf(expected).sort());
  });

  test('a picked_up order and a cancelled order are never in the default queue', async () => {
    const { ordersModule } = setup();

    const statuses = (await ordersModule.getQueue()).map((item) => item.status);

    expect(statuses).not.toContain('picked_up');
    expect(statuses).not.toContain('cancelled');
  });

  test.each([['received'], ['preparing']])('status=%s returns only %s orders', async (status) => {
    const { ordersModule } = setup();

    const queue = await ordersModule.getQueue({ status });

    expect(queue.length).toBeGreaterThan(0);
    expect(queue.every((item) => item.status === status)).toBe(true);
  });

  test.each([
    ...ORDER_STATUSES.filter((status) => !ACTIVE_QUEUE_STATUSES.includes(status)),
    'banana',
    '',
  ])('status=%j is rejected with VALIDATION_ERROR', async (status) => {
    const { ordersModule } = setup();

    await expect(ordersModule.getQueue({ status })).rejects.toEqual(domainError('VALIDATION_ERROR'));
  });

  test('items come sorted by compareQueue, each with score = computePriority(order, now)', async () => {
    const { ordersModule } = setup();
    const expected = ONE_PER_STATUS.filter((o) => ACTIVE_QUEUE_STATUSES.includes(o.status))
      .map((o) => ({ ...o, score: computePriority(o, FROZEN_NOW) }))
      .sort(compareQueue);

    const queue = await ordersModule.getQueue();

    expect(queue.map(({ id, score }) => ({ id, score }))).toEqual(
      expected.map(({ id, score }) => ({ id, score })),
    );
  });

  test('each item has exactly the fields of the queue item DTO', async () => {
    const { ordersModule } = setup();

    const [item] = await ordersModule.getQueue();

    expect(Object.keys(item)).toEqual([
      'id',
      'score',
      'customer_name',
      'type',
      'items',
      'minutes_waiting',
      'placed_at',
      'promised_at',
      'is_vip',
      'status',
      'allowed_actions',
    ]);
    expect(Object.keys(item.items[0])).toEqual(['name', 'quantity']);
  });

  test('minutes_waiting uses the same now as the score, read from the clock exactly once', async () => {
    const clock = { now: jest.fn(() => FROZEN_NOW) };
    const ordersModule = createOrdersModule({ repository: fakeRepository(ONE_PER_STATUS), clock });

    const queue = await ordersModule.getQueue();

    expect(queue.map((item) => item.minutes_waiting)).toEqual(queue.map(() => 35));
    expect(clock.now).toHaveBeenCalledTimes(1);
  });

  test('allowed_actions of each item equals allowedActions(item.status)', async () => {
    const { ordersModule } = setup();

    const queue = await ordersModule.getQueue();

    for (const item of queue) {
      expect(item.allowed_actions).toEqual(allowedActions(item.status));
    }
  });
});

describe('applyAction', () => {
  test.each([['abc'], [0], [-1], [1.5]])('id %j is rejected with VALIDATION_ERROR', async (id) => {
    const { ordersModule } = setup();

    await expect(ordersModule.applyAction(id, 'start')).rejects.toEqual(domainError('VALIDATION_ERROR'));
  });

  test('an unknown id is rejected with ORDER_NOT_FOUND', async () => {
    const { ordersModule } = setup();

    await expect(ordersModule.applyAction(999, 'start')).rejects.toEqual(domainError('ORDER_NOT_FOUND'));
  });

  test('start on a preparing order is rejected with INVALID_TRANSITION and updates nothing', async () => {
    const { ordersModule, repository } = setup();

    await expect(ordersModule.applyAction(2, 'start')).rejects.toEqual(domainError('INVALID_TRANSITION'));
    expect(repository.rows.map((row) => row.status)).toEqual(ONE_PER_STATUS.map((o) => o.status));
  });

  test('start on a received order returns the new status and updates the repository', async () => {
    const { ordersModule, repository } = setup();

    // The id arrives as text from the URL.
    await expect(ordersModule.applyAction('1', 'start')).resolves.toEqual({ id: 1, status: 'preparing' });
    expect(repository.rows.find((row) => row.id === 1).status).toBe('preparing');
  });

  test('a conditional update that affects 0 rows is rejected with INVALID_TRANSITION', async () => {
    const { ordersModule, repository } = setup();
    // Another request changed the order between the read and the update.
    repository.updateStatusIfCurrent = async () => 0;

    await expect(ordersModule.applyAction(1, 'start')).rejects.toEqual(domainError('INVALID_TRANSITION'));
  });
});

describe('createOrder', () => {
  const payload = (overrides = {}) => ({
    customer_name: 'Lia',
    type: 'takeout',
    items: [{ menu_item_id: 1, quantity: 2 }],
    ...overrides,
  });
  const rejected = (ordersModule, body) =>
    expect(ordersModule.createOrder(body)).rejects.toEqual(domainError('VALIDATION_ERROR'));

  test.each([[[]], [undefined], ['1x pizza']])('items = %j is rejected with VALIDATION_ERROR', async (items) => {
    const { ordersModule } = setup([]);

    await rejected(ordersModule, payload({ items }));
  });

  test('an unknown menu_item_id is rejected with VALIDATION_ERROR', async () => {
    const { ordersModule } = setup([]);

    await rejected(ordersModule, payload({ items: [{ menu_item_id: 999, quantity: 1 }] }));
  });

  test.each([[0], [-1], [1.5], ['2'], [2147483648]])('quantity %j is rejected with VALIDATION_ERROR', async (quantity) => {
    const { ordersModule } = setup([]);

    await rejected(ordersModule, payload({ items: [{ menu_item_id: 1, quantity }] }));
  });

  test.each([
    ['an empty customer_name', { customer_name: '  ' }],
    ['a customer_name longer than the column', { customer_name: 'A'.repeat(256) }],
    ['a menu_item_id larger than the column', { items: [{ menu_item_id: 2147483648, quantity: 1 }] }],
    ['an unknown type', { type: 'banana' }],
    ['a non-boolean is_vip', { is_vip: 'yes' }],
    ['a promised_at that is not a timestamp', { promised_at: 'tomorrow' }],
  ])('%s is rejected with VALIDATION_ERROR', async (_label, overrides) => {
    const { ordersModule } = setup([]);

    await rejected(ordersModule, payload(overrides));
  });

  test('a body that is not an object is rejected with VALIDATION_ERROR', async () => {
    const { ordersModule } = setup([]);

    await rejected(ordersModule, undefined);
  });

  test('a valid payload is stored with the initial status and placed_at = clock.now()', async () => {
    const { ordersModule, repository } = setup([]);
    const promised_at = minutesFromNow(40);

    const created = await ordersModule.createOrder(payload({ promised_at: promised_at.toISOString() }));

    expect(created).toEqual({ id: 1, status: INITIAL_STATUS, placed_at: FROZEN_NOW });
    expect(repository.rows[0]).toEqual({
      id: 1,
      customer_name: 'Lia',
      type: 'takeout',
      is_vip: false,
      status: INITIAL_STATUS,
      placed_at: FROZEN_NOW,
      promised_at,
      items: [{ menu_item_id: 1, quantity: 2 }],
    });
  });
});

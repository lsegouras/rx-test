/*
 * priority.test.js | Layer: Module (test)
 * Proves the priority score and the tie-break of PDF §5 with literal fixtures and a frozen now.
 * @rule-change RANKING: when a value in priority.rules.js changes, update the matching expectation here.
 */
const { computePriority, compareQueue, totalPrepMinutes } = require('./priority');
const {
  FROZEN_NOW,
  secondsFromNow,
  minutesFromNow,
  secondsAgo,
  minutesAgo,
} = require('../testing/frozen-now');

/** An order that scores only its type points: no VIP, no wait, no promise, no items. */
const order = (overrides = {}) => ({
  id: 1,
  type: 'dine_in',
  is_vip: false,
  placed_at: FROZEN_NOW,
  promised_at: null,
  items: [],
  ...overrides,
});

const score = (overrides) => computePriority(order(overrides), FROZEN_NOW);

/** Points one component adds on top of the baseline order, so each table tests one rule. */
const pointsAdded = (overrides) => score(overrides) - score({});

const EXAMPLE_A = {
  id: 1,
  type: 'dine_in',
  is_vip: false,
  placed_at: new Date('2026-06-15T11:25:00Z'),
  promised_at: null,
  items: [
    { prep_time_minutes: 20, quantity: 2 }, // Grilled Salmon
    { prep_time_minutes: 10, quantity: 1 }, // Caesar Salad
  ],
};

const EXAMPLE_B = {
  id: 2,
  type: 'delivery',
  is_vip: true,
  placed_at: new Date('2026-06-15T11:50:00Z'),
  promised_at: new Date('2026-06-15T12:20:00Z'),
  items: [{ prep_time_minutes: 12, quantity: 1 }], // Margherita Pizza
};

describe('worked examples (PDF §5.3)', () => {
  test('example A scores 60', () => {
    expect(computePriority(EXAMPLE_A, FROZEN_NOW)).toBe(60);
  });

  test('example B scores 60', () => {
    expect(computePriority(EXAMPLE_B, FROZEN_NOW)).toBe(60);
  });

  test('B ranks above A: the scores tie and a promised_at beats null', () => {
    const a = { ...EXAMPLE_A, score: computePriority(EXAMPLE_A, FROZEN_NOW) };
    const b = { ...EXAMPLE_B, score: computePriority(EXAMPLE_B, FROZEN_NOW) };
    expect([a, b].sort(compareQueue).map((o) => o.id)).toEqual([2, 1]);
  });
});

describe('score components (PDF §5.1)', () => {
  test.each([
    ['dine_in', 30],
    ['takeout', 20],
    ['delivery', 10],
  ])('type %s is worth %i points', (type, points) => {
    expect(score({ type })).toBe(points);
  });

  test('VIP adds 20; a non-VIP order scores only its other points', () => {
    expect(pointsAdded({ is_vip: true })).toBe(20);
    expect(score({ type: 'dine_in', is_vip: false })).toBe(30);
  });

  test.each([
    ['9 min 50 s', 0, secondsAgo(9 * 60 + 50)],
    ['10 min 00 s', 5, minutesAgo(10)],
    ['35 min', 15, minutesAgo(35)],
    ['80 min', 40, minutesAgo(80)],
    ['200 min (cap)', 40, minutesAgo(200)],
    ['-30 s (placed_at ahead of now by clock skew)', 0, secondsFromNow(30)],
  ])('waiting %s adds %i points', (_label, points, placed_at) => {
    expect(pointsAdded({ placed_at })).toBe(points);
  });

  test.each([
    ['+20 min', 25, minutesFromNow(20)],
    ['+30:00', 25, minutesFromNow(30)],
    ['+30:30', 15, minutesFromNow(30.5)],
    ['+45 min', 15, minutesFromNow(45)],
    ['+60:00', 15, minutesFromNow(60)],
    ['+60:01', 0, secondsFromNow(60 * 60 + 1)],
    ['+90 min', 0, minutesFromNow(90)],
    ['null', 0, null],
    ['overdue by 10 min', 25, minutesAgo(10)],
  ])('promised_at %s adds %i points', (_label, points, promised_at) => {
    expect(pointsAdded({ promised_at })).toBe(points);
  });

  test('promised_at is scored for every type, dine_in included', () => {
    expect(score({ type: 'dine_in', promised_at: minutesFromNow(20) })).toBe(30 + 25);
  });

  test.each([
    ['14 min', 0, [{ prep_time_minutes: 14, quantity: 1 }]],
    ['15 min', 5, [{ prep_time_minutes: 15, quantity: 1 }]],
    ['50 min', 15, [{ prep_time_minutes: 20, quantity: 2 }, { prep_time_minutes: 10, quantity: 1 }]],
    ['60 min', 20, [{ prep_time_minutes: 20, quantity: 3 }]],
    ['84 min (cap)', 20, [{ prep_time_minutes: 12, quantity: 7 }]],
  ])('total prep of %s adds %i points', (_label, points, items) => {
    expect(pointsAdded({ items })).toBe(points);
  });

  test('total prep minutes is the sum of prep_time_minutes * quantity over all items', () => {
    const items = [
      { prep_time_minutes: 20, quantity: 2 },
      { prep_time_minutes: 10, quantity: 1 },
      { prep_time_minutes: 12, quantity: 3 },
    ];
    expect(totalPrepMinutes(items)).toBe(86);
  });
});

describe('queue order (PDF §5.2)', () => {
  /** A queue entry with an explicit score, so these tests exercise the tie-break only. */
  const entry = (overrides) => ({
    id: 1,
    score: 50,
    promised_at: null,
    placed_at: minutesAgo(30),
    ...overrides,
  });
  const sortedIds = (entries) => [...entries].sort(compareQueue).map((e) => e.id);

  test('on a tie, the earlier promised_at comes first and null comes last', () => {
    const entries = [
      entry({ id: 1, promised_at: null }),
      entry({ id: 2, promised_at: minutesFromNow(90) }),
      entry({ id: 3, promised_at: minutesFromNow(70) }),
    ];
    expect(sortedIds(entries)).toEqual([3, 2, 1]);
  });

  test('same promised_at: earlier placed_at first; same placed_at: smaller id first', () => {
    const promised_at = minutesFromNow(90);
    const entries = [
      entry({ id: 7, promised_at, placed_at: minutesAgo(10) }),
      entry({ id: 5, promised_at, placed_at: minutesAgo(10) }),
      entry({ id: 9, promised_at, placed_at: minutesAgo(20) }),
    ];
    expect(sortedIds(entries)).toEqual([9, 5, 7]);
  });

  test('a higher score comes first whatever the tie-break fields say', () => {
    const entries = [
      entry({ id: 1, score: 60, promised_at: minutesFromNow(5), placed_at: minutesAgo(90) }),
      entry({ id: 9, score: 61, promised_at: null, placed_at: minutesAgo(1) }),
    ];
    expect(sortedIds(entries)).toEqual([9, 1]);
  });

  test('a delivery VIP with a tight promise (55) outranks a plain dine_in (30)', () => {
    const delivery = order({ id: 1, type: 'delivery', is_vip: true, promised_at: minutesFromNow(20) });
    const dineIn = order({ id: 2, type: 'dine_in' });
    const entries = [dineIn, delivery].map((o) => ({ ...o, score: computePriority(o, FROZEN_NOW) }));

    expect(entries.map((e) => e.score)).toEqual([30, 55]);
    expect(sortedIds(entries)).toEqual([1, 2]);
  });
});

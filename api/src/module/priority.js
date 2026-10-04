/*
 * priority.js | Layer: Module
 * Pure functions that turn an order and a "now" into a priority score and a queue position.
 * Must NOT read the clock, import Express or Sequelize, or hold numbers: they live in priority.rules.js.
 */
const { PRIORITY_RULES } = require('./priority.rules');

const MS_PER_MINUTE = 60_000;

/** Valid order types, derived from the rules so there is one list. @see PDF §4.2 */
const ORDER_TYPES = Object.freeze(Object.keys(PRIORITY_RULES.typeWeights));

/**
 * Whole minutes elapsed since placed_at, floored: 9 min 50 s is 9.
 * Never negative, so a placed_at slightly ahead of now (clock skew) cannot lower the score.
 * @param {Date} placedAt
 * @param {Date} now
 * @returns {number}
 * @see PDF §5.1
 */
function minutesWaiting(placedAt, now) {
  const minutes = Math.floor((now.getTime() - placedAt.getTime()) / MS_PER_MINUTE);
  return Math.max(0, minutes);
}

/**
 * Sum of prep_time_minutes * quantity over all items of the order.
 * @param {{ prep_time_minutes: number, quantity: number }[]} items
 * @returns {number}
 * @see PDF §5.1
 */
function totalPrepMinutes(items) {
  return items.reduce((sum, item) => sum + item.prep_time_minutes * item.quantity, 0);
}

/** Shared shape of the wait and complexity rules: min(cap, floor(minutes / step) * points). */
function steppedPoints(minutes, { stepMinutes, pointsPerStep, cap }) {
  return Math.min(cap, Math.floor(minutes / stepMinutes) * pointsPerStep);
}

/** Points of the first bucket that covers the time left until promisedAt; null scores 0. */
function promisedPoints(promisedAt, now) {
  if (promisedAt === null) return 0;
  const msLeft = promisedAt.getTime() - now.getTime();
  const bucket = PRIORITY_RULES.promisedBuckets.find(
    ({ withinMinutes }) => msLeft <= withinMinutes * MS_PER_MINUTE,
  );
  return bucket ? bucket.points : 0;
}

/**
 * Priority score of one order at the instant now. Pure: same arguments, same number.
 * @param {{ type: string, is_vip: boolean, placed_at: Date, promised_at: Date | null,
 *   items: { prep_time_minutes: number, quantity: number }[] }} order
 * @param {Date} now
 * @returns {number}
 * @see PDF §5.1
 */
function computePriority(order, now) {
  return (
    PRIORITY_RULES.typeWeights[order.type] +
    (order.is_vip ? PRIORITY_RULES.vipBonus : 0) +
    steppedPoints(minutesWaiting(order.placed_at, now), PRIORITY_RULES.wait) +
    promisedPoints(order.promised_at, now) +
    steppedPoints(totalPrepMinutes(order.items), PRIORITY_RULES.complexity)
  );
}

/** Smaller value first, null last. Dates compare by their UTC instant. */
function compareAscendingNullLast(a, b) {
  if (a === null || b === null) return (a === null) - (b === null);
  return (a instanceof Date ? a.getTime() : a) - (b instanceof Date ? b.getTime() : b);
}

/**
 * Sort comparator of the queue: higher score first, then the tie-break fields in order.
 * @param {{ score: number, promised_at: Date | null, placed_at: Date, id: number }} a
 * @param {{ score: number, promised_at: Date | null, placed_at: Date, id: number }} b
 * @returns {number} negative when a comes first
 * @see PDF §5.2
 */
function compareQueue(a, b) {
  if (a.score !== b.score) return b.score - a.score;
  for (const field of PRIORITY_RULES.tieBreak) {
    const difference = compareAscendingNullLast(a[field], b[field]);
    if (difference !== 0) return difference;
  }
  return 0;
}

module.exports = { ORDER_TYPES, computePriority, compareQueue, minutesWaiting, totalPrepMinutes };

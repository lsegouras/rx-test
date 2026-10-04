/*
 * priority.rules.js | Layer: Module (rules data)
 * Every number of the priority score and the tie-break order, as one frozen table (PDF §5.1, §5.2).
 * Must NOT contain logic; priority.js reads this table.
 * @rule-change RANKING: edit a value here and its matching expectation in priority.test.js.
 */
const PRIORITY_RULES = Object.freeze({
  // Base points per order type. The keys are also the list of valid order types.
  typeWeights: Object.freeze({ dine_in: 30, takeout: 20, delivery: 10 }),

  vipBonus: 20,

  // pointsPerStep for every full stepMinutes waited since placed_at, up to cap.
  wait: Object.freeze({ stepMinutes: 10, pointsPerStep: 5, cap: 40 }),

  // Read top to bottom: the first bucket that covers the time left until promised_at wins.
  // An overdue order has negative time left, so it lands in the first bucket. No bucket = 0.
  promisedBuckets: Object.freeze([
    Object.freeze({ withinMinutes: 30, points: 25 }),
    Object.freeze({ withinMinutes: 60, points: 15 }),
  ]),

  // pointsPerStep for every full stepMinutes of total prep time, up to cap.
  complexity: Object.freeze({ stepMinutes: 15, pointsPerStep: 5, cap: 20 }),

  // Applied in this order when two scores are equal: smaller value first, null last.
  tieBreak: Object.freeze(['promised_at', 'placed_at', 'id']),
});

module.exports = { PRIORITY_RULES };

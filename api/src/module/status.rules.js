/*
 * status.rules.js | Layer: Module (rules data)
 * The order state machine and the statuses of the active queue, as frozen tables (PDF §5, §6).
 * Must NOT contain logic; transitions.js reads these tables.
 * @rule-change STATUS: edit a row here and its matching expectation in transitions.test.js.
 */

// status: { action: next status }. A status with no actions is terminal.
// The keys are also the list of valid statuses, and each action is also a POST /orders/:id/<action> route.
const TRANSITIONS = Object.freeze({
  received: Object.freeze({ start: 'preparing', cancel: 'cancelled' }),
  preparing: Object.freeze({ ready: 'ready' }),
  ready: Object.freeze({ pickup: 'picked_up' }),
  picked_up: Object.freeze({}),
  cancelled: Object.freeze({}),
});

// Statuses listed by the default queue; they are also the only values the ?status filter accepts.
const ACTIVE_QUEUE_STATUSES = Object.freeze(['received', 'preparing']);

// Status of an order created through POST /orders.
const INITIAL_STATUS = 'received';

module.exports = { TRANSITIONS, ACTIVE_QUEUE_STATUSES, INITIAL_STATUS };

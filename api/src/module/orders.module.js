/*
 * orders.module.js | Layer: Module
 * Use cases of the kitchen queue: assemble the ranked queue and apply a status action to an order.
 * Must NOT import Express, Sequelize or the repository file, and must not read the clock:
 * the repository and the clock arrive as arguments of createOrdersModule.
 */
const { computePriority, compareQueue, minutesWaiting } = require('./priority');
const { ACTIVE_QUEUE_STATUSES } = require('./status.rules');
const { ACTIONS, allowedActions, transition } = require('./transitions');
const { DomainError, ERROR_CODES } = require('./errors');

/** Statuses to load: the active queue by default, or the single active status asked for. */
function statusesFor(status) {
  if (status === undefined) return ACTIVE_QUEUE_STATUSES;
  if (!ACTIVE_QUEUE_STATUSES.includes(status)) {
    throw new DomainError(
      ERROR_CODES.VALIDATION_ERROR,
      `status must be one of: ${ACTIVE_QUEUE_STATUSES.join(', ')}.`,
    );
  }
  return [status];
}

/** A positive integer that fits the INTEGER id column, given as a number or as URL text. */
function parseOrderId(id) {
  if (!/^[1-9][0-9]{0,8}$/.test(String(id))) {
    throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'Order id must be a positive integer.');
  }
  return Number(id);
}

/** Shapes one stored order as a queue item; score and minutes_waiting share the same now. */
function toQueueItem(order, now) {
  return {
    id: order.id,
    score: computePriority(order, now),
    customer_name: order.customer_name,
    type: order.type,
    items: order.items.map(({ name, quantity }) => ({ name, quantity })),
    minutes_waiting: minutesWaiting(order.placed_at, now),
    placed_at: order.placed_at,
    promised_at: order.promised_at,
    is_vip: order.is_vip,
    status: order.status,
    allowed_actions: allowedActions(order.status),
  };
}

/**
 * Builds the orders module on top of a repository and a clock. The app passes the Sequelize
 * repository and the system clock; tests pass an in-memory fake and a fixed clock.
 * @param {{ repository: object, clock: { now: () => Date } }} dependencies
 * @returns {{ actions: readonly string[], getQueue: Function, applyAction: Function }}
 * @see PDF §9.1
 */
function createOrdersModule({ repository, clock }) {
  /**
   * The queue, highest priority first. The score is computed here, at request time.
   * @param {{ status?: string }} [filter] omit status for the default active queue
   * @returns {Promise<object[]>} queue items, already sorted
   * @throws {DomainError} VALIDATION_ERROR when status is not an active-queue status
   * @see PDF §5, §7
   */
  async function getQueue({ status } = {}) {
    const statuses = statusesFor(status);
    const now = clock.now();
    const orders = await repository.findByStatuses(statuses);
    return orders.map((order) => toQueueItem(order, now)).sort(compareQueue);
  }

  /**
   * Moves an order to its next status. The update only succeeds if the order still has the
   * status that was validated, so two simultaneous requests cannot both win.
   * @param {number | string} id
   * @param {string} action one of the action names of the transition table
   * @returns {Promise<{ id: number, status: string }>}
   * @throws {DomainError} VALIDATION_ERROR, ORDER_NOT_FOUND or INVALID_TRANSITION
   * @see PDF §6, §7
   */
  async function applyAction(id, action) {
    const orderId = parseOrderId(id);
    const order = await repository.findById(orderId);
    if (!order) {
      throw new DomainError(ERROR_CODES.ORDER_NOT_FOUND, `Order ${orderId} does not exist.`);
    }
    const nextStatus = transition(order, action);
    const updatedRows = await repository.updateStatusIfCurrent(orderId, order.status, nextStatus);
    if (updatedRows === 0) {
      throw new DomainError(
        ERROR_CODES.INVALID_TRANSITION,
        `Order ${orderId} changed status during the request. Refresh and try again.`,
      );
    }
    return { id: orderId, status: nextStatus };
  }

  return { actions: ACTIONS, getQueue, applyAction };
}

module.exports = { createOrdersModule };

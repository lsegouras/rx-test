/*
 * orders.module.js | Layer: Module
 * Use cases of the kitchen queue: assemble the ranked queue, apply a status action, create an order.
 * Must NOT import Express, Sequelize or the repository file, and must not read the clock:
 * the repository and the clock arrive as arguments of createOrdersModule.
 */
const { ORDER_TYPES, computePriority, compareQueue, minutesWaiting } = require('./priority');
const { ACTIVE_QUEUE_STATUSES, INITIAL_STATUS } = require('./status.rules');
const { ACTIONS, allowedActions, transition } = require('./transitions');
const { DomainError, ERROR_CODES } = require('./errors');

// Limits of the columns that store these values: INTEGER and VARCHAR(255).
// Checking them here answers 400 instead of letting the database fail with a 500.
const MAX_INTEGER = 2147483647;
const MAX_NAME_LENGTH = 255;

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
  const text = String(id);
  if (!/^[1-9][0-9]*$/.test(text) || Number(text) > MAX_INTEGER) {
    throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'Order id must be a positive integer.');
  }
  return Number(text);
}

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0 && value <= MAX_INTEGER;

function invalid(message) {
  return new DomainError(ERROR_CODES.VALIDATION_ERROR, message);
}

/** promised_at of a new order: absent or null means no promise; otherwise an ISO 8601 timestamp. */
function parsePromisedAt(value) {
  if (value === undefined || value === null) return null;
  const date = typeof value === 'string' ? new Date(value) : null;
  if (date === null || Number.isNaN(date.getTime())) {
    throw invalid('promised_at must be an ISO 8601 timestamp or null.');
  }
  return date;
}

/** Checks the fields of a new order and returns them in the shape the repository stores. */
function validateNewOrder(payload) {
  if (payload === null || typeof payload !== 'object') throw invalid('The body must be a JSON object.');
  const { customer_name, type, is_vip = false, promised_at, items } = payload;

  if (typeof customer_name !== 'string' || customer_name.trim() === '') {
    throw invalid('customer_name must be a non-empty string.');
  }
  if (customer_name.trim().length > MAX_NAME_LENGTH) {
    throw invalid(`customer_name must have at most ${MAX_NAME_LENGTH} characters.`);
  }
  if (!ORDER_TYPES.includes(type)) throw invalid(`type must be one of: ${ORDER_TYPES.join(', ')}.`);
  if (typeof is_vip !== 'boolean') throw invalid('is_vip must be a boolean.');
  if (!Array.isArray(items) || items.length === 0) throw invalid('items must be a non-empty array.');
  for (const item of items) {
    if (!isPositiveInteger(item?.menu_item_id) || !isPositiveInteger(item?.quantity)) {
      throw invalid('Each item needs a menu_item_id and a quantity that are positive integers.');
    }
  }

  return {
    customer_name: customer_name.trim(),
    type,
    is_vip,
    promised_at: parsePromisedAt(promised_at),
    items: items.map(({ menu_item_id, quantity }) => ({ menu_item_id, quantity })),
  };
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
 * @returns {{ actions: readonly string[], getQueue: Function, applyAction: Function, createOrder: Function }}
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

  /**
   * Creates an order in the initial status, placed at the clock's now.
   * @param {object} payload { customer_name, type, is_vip?, promised_at?, items: [{ menu_item_id, quantity }] }
   * @returns {Promise<{ id: number, status: string, placed_at: Date }>}
   * @throws {DomainError} VALIDATION_ERROR for an invalid field, empty items or an unknown menu item
   * @see PDF §11.1
   */
  async function createOrder(payload) {
    const order = validateNewOrder(payload);
    const menuItemIds = [...new Set(order.items.map((item) => item.menu_item_id))];
    const found = await repository.findMenuItemsByIds(menuItemIds);
    const foundIds = found.map((menuItem) => menuItem.id);
    const missing = menuItemIds.filter((id) => !foundIds.includes(id));
    if (missing.length > 0) throw invalid(`Unknown menu_item_id: ${missing.join(', ')}.`);

    return repository.createOrder({ ...order, status: INITIAL_STATUS, placed_at: clock.now() });
  }

  return { actions: ACTIONS, getQueue, applyAction, createOrder };
}

module.exports = { createOrdersModule };

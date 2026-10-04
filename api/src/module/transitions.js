/*
 * transitions.js | Layer: Module
 * Behavior of the state machine: reads the tables of status.rules.js and decides what is legal.
 * Must NOT list statuses or transitions itself, and must not touch HTTP or the database.
 */
const { TRANSITIONS } = require('./status.rules');
const { DomainError, ERROR_CODES } = require('./errors');

/** Valid order statuses, derived from the table so there is one list. @see PDF §4.2 */
const ORDER_STATUSES = Object.freeze(Object.keys(TRANSITIONS));

/** Every action name that appears in the table, once. The endpoint registers one route per name. */
const ACTIONS = Object.freeze([...new Set(Object.values(TRANSITIONS).flatMap(Object.keys))]);

/**
 * Actions an order in this status may take; empty for a terminal or unknown status.
 * @param {string} status
 * @returns {string[]}
 * @see PDF §6, §8
 */
function allowedActions(status) {
  return Object.keys(TRANSITIONS[status] ?? {});
}

/**
 * Next status of the order after the action. Skipping, repeating and leaving a terminal status all throw.
 * @param {{ status: string }} order
 * @param {string} action
 * @returns {string} the next status
 * @throws {DomainError} INVALID_TRANSITION when the table has no such row
 * @see PDF §6
 */
function transition(order, action) {
  if (!allowedActions(order.status).includes(action)) {
    throw new DomainError(
      ERROR_CODES.INVALID_TRANSITION,
      `Cannot ${action} an order that is ${order.status}.`,
    );
  }
  return TRANSITIONS[order.status][action];
}

module.exports = { ORDER_STATUSES, ACTIONS, allowedActions, transition };

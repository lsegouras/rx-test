/*
 * transitions.test.js | Layer: Module (test)
 * States the state-machine contract of PDF §6 with literal expectations; nothing here is computed from the rules.
 * @rule-change STATUS: when a row in status.rules.js changes, update the matching expectation here.
 */
const { ACTIVE_QUEUE_STATUSES } = require('./status.rules');
const { transition, allowedActions, ORDER_STATUSES, ACTIONS } = require('./transitions');

const attempt = (status, action) => () => transition({ id: 1, status }, action);
const invalidTransition = expect.objectContaining({ code: 'INVALID_TRANSITION' });

describe('legal transitions', () => {
  test.each([
    ['received', 'start', 'preparing'],
    ['received', 'cancel', 'cancelled'],
    ['preparing', 'ready', 'ready'],
    ['ready', 'pickup', 'picked_up'],
  ])('%s + %s -> %s', (status, action, next) => {
    expect(transition({ id: 1, status }, action)).toBe(next);
  });
});

describe('illegal transitions throw INVALID_TRANSITION', () => {
  test.each([
    ['received', 'ready'],
    ['received', 'pickup'],
    ['preparing', 'pickup'],
  ])('skipping a step: %s + %s', (status, action) => {
    expect(attempt(status, action)).toThrow(invalidTransition);
  });

  test('repeating: start on an order that is already preparing', () => {
    expect(attempt('preparing', 'start')).toThrow(invalidTransition);
  });

  test('repeating: ready on an order that is already ready', () => {
    expect(attempt('ready', 'ready')).toThrow(invalidTransition);
  });

  test.each([
    ['picked_up', 'start'],
    ['picked_up', 'ready'],
    ['picked_up', 'pickup'],
    ['picked_up', 'cancel'],
    ['cancelled', 'start'],
    ['cancelled', 'ready'],
    ['cancelled', 'pickup'],
    ['cancelled', 'cancel'],
  ])('terminal: %s + %s', (status, action) => {
    expect(attempt(status, action)).toThrow(invalidTransition);
  });

  test.each([['preparing'], ['ready']])('cancel is rejected from %s', (status) => {
    expect(attempt(status, 'cancel')).toThrow(invalidTransition);
  });

  test('the error names the status and the action', () => {
    expect(attempt('preparing', 'start')).toThrow(/start.*preparing/);
  });
});

describe('allowed actions', () => {
  test.each([
    ['received', ['start', 'cancel']],
    ['preparing', ['ready']],
    ['ready', ['pickup']],
  ])('%s -> %j', (status, actions) => {
    expect(allowedActions(status)).toEqual(actions);
  });

  test.each([['picked_up'], ['cancelled']])('terminal status %s has no actions', (status) => {
    expect(allowedActions(status)).toEqual([]);
  });

  test('the action names are start, cancel, ready and pickup', () => {
    expect(ACTIONS).toEqual(['start', 'cancel', 'ready', 'pickup']);
  });
});

describe('statuses', () => {
  test('the active queue is exactly received and preparing', () => {
    expect(ACTIVE_QUEUE_STATUSES).toEqual(['received', 'preparing']);
  });

  test.each([['ready'], ['picked_up'], ['cancelled']])('%s is outside the default queue', (status) => {
    expect(ACTIVE_QUEUE_STATUSES).not.toContain(status);
  });

  test('there are exactly the 5 statuses of PDF §4.2', () => {
    expect(ORDER_STATUSES).toEqual(['received', 'preparing', 'ready', 'picked_up', 'cancelled']);
  });
});

/*
 * errors.js | Layer: Module
 * The domain error and its stable, machine-readable codes (PDF §7).
 * Must NOT know HTTP statuses; the error middleware maps each code to one.
 */

/** The only error codes the API returns. Documented in the README. @see PDF §7 */
const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
});

/**
 * An error the caller caused and can understand: bad input, unknown order, illegal transition.
 * @see PDF §7
 */
class DomainError extends Error {
  /**
   * @param {string} code one of ERROR_CODES
   * @param {string} message text safe to show to the user
   */
  constructor(code, message) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

module.exports = { ERROR_CODES, DomainError };

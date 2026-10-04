/*
 * error.middleware.js | Layer: Endpoint
 * Turns errors into HTTP responses: one status per domain error code, one body shape.
 * Must NOT send stack traces or internal details to the client.
 */
const { DomainError, ERROR_CODES } = require('../module/errors');

const HTTP_STATUS = Object.freeze({
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.ORDER_NOT_FOUND]: 404,
  [ERROR_CODES.INVALID_TRANSITION]: 409,
});

/**
 * Express error handler; registered last in app.js.
 * A domain error answers { error: { code, message } } with its 4xx status. Anything else is
 * logged here and answered as a generic 500 with no code, because Express's own handler would
 * put the stack trace in the response outside production.
 * @see PDF §7
 */
function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof DomainError) {
    return res.status(HTTP_STATUS[err.code]).json({ error: { code: err.code, message: err.message } });
  }
  // express.json() could not parse the body: the request is invalid, not the server.
  if (err.type === 'entity.parse.failed') {
    const code = ERROR_CODES.VALIDATION_ERROR;
    return res.status(HTTP_STATUS[code]).json({ error: { code, message: 'The body must be valid JSON.' } });
  }
  console.error(err);
  return res.status(500).json({ error: { message: 'Internal server error' } });
}

module.exports = { errorMiddleware };

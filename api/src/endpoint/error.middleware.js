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
 * A domain error answers { error: { code, message } } with its 4xx status. A request Express itself
 * rejected (invalid JSON, body too large, bad URL encoding) answers 400 VALIDATION_ERROR. Anything else
 * is logged and answered as a generic 500 with no code: Express's own handler would put the stack trace
 * in the response outside production.
 * @see PDF §7
 */
function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof DomainError) {
    return res.status(HTTP_STATUS[err.code]).json({ error: { code: err.code, message: err.message } });
  }
  // Express rejected the request before any route ran (body that is not valid JSON or is too
  // large, bad URL encoding). It marks these with a 4xx status: the request is invalid, not the server.
  if (err.status >= 400 && err.status < 500) {
    const code = ERROR_CODES.VALIDATION_ERROR;
    const message = 'The request is malformed: check the URL and send a valid JSON body of normal size.';
    return res.status(HTTP_STATUS[code]).json({ error: { code, message } });
  }
  console.error(err);
  return res.status(500).json({ error: { message: 'Internal server error' } });
}

module.exports = { errorMiddleware };

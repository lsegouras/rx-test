/*
 * clock.js | Layer: none (composition)
 * The real clock of the running app. app.js injects it into the Module.
 * Must NOT be required by the Module; tests inject a fixed clock instead.
 */

/** Reads the system time; the result is a UTC instant. @see PDF §5 */
const systemClock = { now: () => new Date() };

module.exports = { systemClock };

/*
 * frozen-now.js | Layer: none (test support)
 * One frozen "now" and date helpers relative to it, so no test depends on the real clock.
 * Must NOT be required by application code.
 */

/** The "now" of the PDF §5.3 worked examples. */
const FROZEN_NOW = new Date('2026-06-15T12:00:00Z');

/**
 * @param {number} seconds seconds after FROZEN_NOW (negative for the past)
 * @returns {Date}
 */
function secondsFromNow(seconds) {
  return new Date(FROZEN_NOW.getTime() + seconds * 1000);
}

/** @param {number} minutes @returns {Date} */
const minutesFromNow = (minutes) => secondsFromNow(minutes * 60);

/** @param {number} seconds @returns {Date} */
const secondsAgo = (seconds) => secondsFromNow(-seconds);

/** @param {number} minutes @returns {Date} */
const minutesAgo = (minutes) => secondsFromNow(-minutes * 60);

/**
 * A clock that always answers the same instant; tests inject it where the app injects systemClock.
 * @param {Date} now
 * @returns {{ now: () => Date }}
 */
const fixedClock = (now) => ({ now: () => now });

module.exports = { FROZEN_NOW, secondsFromNow, minutesFromNow, secondsAgo, minutesAgo, fixedClock };

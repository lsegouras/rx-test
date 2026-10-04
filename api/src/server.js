/*
 * server.js | Layer: none (entry point)
 * Starts the HTTP server on the configured port (4000 by default).
 * Must NOT configure routes; app.js does the wiring.
 */
const { app } = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

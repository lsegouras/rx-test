/*
 * app.js | Layer: none (composition root)
 * The one place that wires the layers: repository + clock -> module -> endpoint -> Express app.
 * Must NOT hold routes, queries or business rules.
 */
const express = require('express');
const ordersRepository = require('./repository/orders.repository');
const { systemClock } = require('./clock');
const { createOrdersModule } = require('./module/orders.module');
const { createOrdersEndpoint } = require('./endpoint/orders.endpoint');
const { errorMiddleware } = require('./endpoint/error.middleware');

const ordersModule = createOrdersModule({ repository: ordersRepository, clock: systemClock });

const app = express();
app.use(createOrdersEndpoint(ordersModule));
app.use(errorMiddleware);

module.exports = { app };

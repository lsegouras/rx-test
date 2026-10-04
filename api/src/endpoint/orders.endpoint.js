/*
 * orders.endpoint.js | Layer: Endpoint
 * HTTP only: reads the request, calls one function of the orders module, writes the JSON response.
 * Must NOT score, sort, decide whether a transition is legal, or reach the database.
 */
const express = require('express');

/**
 * Routes of the kitchen queue. A rejected handler reaches the error middleware by itself (Express 5).
 * @param {{ actions: readonly string[], getQueue: Function, applyAction: Function }} ordersModule
 * @returns {import('express').Router}
 * @see PDF §7
 */
function createOrdersEndpoint(ordersModule) {
  const router = express.Router();

  router.get('/orders/queue', async (req, res) => {
    res.json(await ordersModule.getQueue({ status: req.query.status }));
  });

  // One POST /orders/:id/<action> per action of the transition table: start, cancel, ready, pickup.
  for (const action of ordersModule.actions) {
    router.post(`/orders/:id/${action}`, async (req, res) => {
      res.json(await ordersModule.applyAction(req.params.id, action));
    });
  }

  return router;
}

module.exports = { createOrdersEndpoint };

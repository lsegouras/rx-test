# Decisions

## Scope

<!-- AUTHOR: review and rewrite in your own words -->

I built the full required core: the queue endpoint with the status filter, the four transition endpoints, the Kitchen Display page, the migrations, a seed with relative dates, and the Jest tests for priority and transitions. The README lists the four commands and the error codes.

I kept the result small on purpose. I left out a button for `pickup` on the screen, automatic refresh of the queue, and integration tests against PostgreSQL. The Module tests run against an in-memory fake repository instead, and I checked the repository and the endpoints by hand with `curl` and `psql`.

Extra points:

- POST /orders (§11.1): attempted. The validation lives in the Module and is covered by Jest tests; there is no UI form.
- Vitest component test (§11.2): attempted. It covers the empty state and proves that the buttons follow `allowed_actions`, not the status.
- Playwright end-to-end (§11.3): not attempted.

Layout deviations from §14:

- The API layer folders are named after the §9.1 layers: `endpoint/`, `module/`, `repository/`, `schema/`.
- Each test file sits next to the module file it tests. A rule and its test are then side by side, which is where I want them during the live change.
- `docs/` holds the take-home brief, and `ai-logs/00-planning/` holds the planning prompt output and the plan. They are part of the AI evidence.

## Layers

<!-- AUTHOR: review and rewrite in your own words -->

The Module (`api/src/module`) holds every business rule: the score, the sort and tie-break, the state machine, which statuses are in the active queue, and input validation. The rules are data in two files, `priority.rules.js` and `status.rules.js`; the functions next to them only read those tables. The Module does not import Express or Sequelize and does not read the clock. `app.js` gives it a repository and a clock, so the same code runs on PostgreSQL in the app and on a fake in tests.

The Repository (`api/src/repository`) only translates between Sequelize and plain objects. It reads the queue in one query with the items and menu items included, and it receives the statuses to load as an argument. It does not know which statuses are active and it does not sort by priority.

The Endpoint receives only the orders module. It reads the request, calls one function and writes the JSON. One middleware maps the three domain error codes to HTTP statuses.

The Schema holds the models, the migrations and the seed. The database enforces the structural rules: foreign keys, NOT NULL, the unique menu item name, `quantity > 0`, `prep_time_minutes > 0` and the category values. `status` and `type` are plain VARCHAR columns, and the model validation reuses the constants owned by the Module. A status rule can then change without a migration.

The UI shows what the API returns, in the order the API returns it. The rule I refused to put in the UI is "which actions are valid for a status". The obvious shortcut is `if (status === 'received')` to show Start and Cancel. That would be a second copy of the state machine, and it would go stale the moment a transition changes. Instead, each queue item carries `allowed_actions`, computed from the transition table, and the table renders one button per entry. The score and the sort are not in the UI either.

## Priority

<!-- AUTHOR: review and rewrite in your own words -->

The score is never stored. On each `GET /orders/queue` the Module reads the clock once, loads the active orders, and calls `computePriority(order, now)` for each one. That function is pure: it takes the order and `now` and returns a number. Every number of the formula (weights, caps, steps, promised-time buckets) comes from one frozen table, `PRIORITY_RULES`, which reads like the table in §5.1. The queue is then sorted by `compareQueue`: score descending, then earlier `promised_at` with null last, then earlier `placed_at`, then smaller id. `minutes_waiting` in the response uses the same `now` as the score, so the screen cannot show a wait time that disagrees with the points.

The edge case that was easy to get wrong is the promised-time bucket. §5.1 says "within 30 minutes" and "within 31-60 minutes", which leaves a gap between 30 and 31 minutes and says nothing about an order whose promised time has already passed. I compare the difference in milliseconds: up to 30 minutes scores 25, more than 30 and up to 60 scores 15, anything else scores 0. So +30:00 scores 25, +30:30 scores 15 and +60:01 scores 0. An overdue order has a negative difference, so it scores 25. A late order must not drop in the queue.

Two smaller ones. Wait time is floored to whole minutes before the division, so 9 min 50 s is 9 minutes and scores 0. And the wait is never negative: if `placed_at` is slightly ahead of the app clock, the order scores 0 wait points, not -5.

## Transitions

<!-- AUTHOR: review and rewrite in your own words -->

The state machine is enforced on the server, in the Module. `status.rules.js` holds one table: for each status, the actions it allows and the status each action leads to. `transition(order, action)` returns the next status or throws `INVALID_TRANSITION`. The POST routes are generated from the action names in that table, and `allowed_actions` comes from the same table, so there is one source for what is legal.

`applyAction` does three steps: load the order (404 `ORDER_NOT_FOUND` if it does not exist), call `transition()`, then run `UPDATE ... WHERE id = ? AND status = <the status just validated>`. If that update changes 0 rows, another request moved the order first, and the answer is also `INVALID_TRANSITION`. Two expeditors clicking Start at the same time cannot both succeed, and no lock is needed.

When someone tries to start an order that is already `preparing`, the API answers `409 INVALID_TRANSITION` with the message "Cannot start an order that is preparing." The order is not changed. It is an error, not a silent success. On the screen the error appears in an alert above the table and the queue is fetched again, so the stale row is corrected.

## AI

<!-- AUTHOR: fill in -->

## Next

<!-- AUTHOR: review and rewrite in your own words -->

If this had to run in a real kitchen next month, these are the first two changes I would make.

1. A view for `ready` orders with the pickup action. Today a `ready` order leaves the queue, as §5 requires, and the filter only accepts `received` or `preparing`. `POST /orders/:id/pickup` exists and is tested, but no row on the screen can offer it. The expeditor needs to see what is waiting at the pass and close it.

2. Live refresh. Scores change every minute, and other people change orders. Today the page refetches only after an action or a filter change, so a screen left open goes stale. I would start with polling every few seconds, because it is simple and enough for one kitchen, and move to server push only if several screens need to stay in sync.

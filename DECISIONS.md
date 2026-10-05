# Decisions

## Scope

I implemented the full required core: the active queue with status filtering, the four transition endpoints, the Kitchen Display page, migrations, relative-time seed data, and the required Jest tests for priority and transitions. The README documents the four startup commands, ports, and API error codes.

I intentionally kept the solution small and explainable within the four-hour time box. I did not add automatic queue refresh or PostgreSQL integration tests; Module behavior is tested with an in-memory fake repository, while repository and endpoint behavior were verified with `psql` and `curl`.

`pickup` is supported by the API and covered by transition tests, but it is not shown on the Kitchen Display because `ready` orders are outside the active queue defined by the exercise.

Optional extras:

- POST /orders (§11.1): implemented with Module validation and Jest coverage; no UI form.
- Vitest component test (§11.2): implemented for the empty state and to prove that buttons follow `allowed_actions`, not frontend status rules.
- Playwright (§11.3): implemented as one seeded happy path; `npm run test:e2e` boots both apps through Playwright's `webServer`.

Layout deviations from §14 are small and intentional: API folders use the §9.1 layer names (`endpoint/`, `module/`, `repository/`, `schema/`), tests sit next to the code they protect, `docs/` contains the exercise brief, `ai-logs/00-planning/` contains planning artifacts, and the cross-application Playwright files live at the repository root.

## Layers

The Module (`api/src/module`) owns business behavior: priority scoring, queue ordering, transitions, active-queue statuses, and input validation. Ranking and lifecycle configuration live in `priority.rules.js` and `status.rules.js`. The Module does not import Express or Sequelize and receives its repository and clock from `app.js`.

The Repository (`api/src/repository`) contains Sequelize access only. It loads queue data with the required associations in one query and returns plain data to the Module. It does not decide which statuses are active or how orders are ranked.

The Endpoint layer handles HTTP only: it reads the request, calls the Module, and writes the response. Centralized middleware maps the known application errors to their HTTP responses.

The Schema layer contains models, migrations, and seed data. PostgreSQL enforces structural invariants such as foreign keys, NOT NULL constraints, unique menu-item names, positive quantities and preparation times, and valid categories. `status` and `type` remain VARCHAR values validated from domain constants, so lifecycle changes do not require a database migration.

The rule I deliberately kept out of the UI is transition legality. The frontend does not infer actions from `status`; it renders the `allowed_actions` returned by the API. This avoids duplicating the state machine in React. Priority and queue ordering also remain exclusively server-side.

## Priority

The priority score is calculated at request time and is never stored. The Module reads one UTC `now` from the injected clock and uses that same value for both `computePriority(order, now)` and `minutes_waiting`.

`computePriority` is a pure function. All weights, caps, steps, and promised-time buckets come from the declarative `PRIORITY_RULES` configuration. `compareQueue` then applies the required ordering: score descending, earlier `promised_at` with null last, earlier `placed_at`, and finally smaller id.

The easiest edge case to get wrong was the promised-time boundary. I use the exact time difference: up to 30 minutes receives 25 points, more than 30 and up to 60 receives 15, and beyond 60 receives 0. Therefore +30:00 scores 25, +30:30 scores 15, and +60:01 scores 0. An overdue promised time receives 25 points because it is already inside the most urgent window.

## Transitions

The state machine is enforced in the Module. `status.rules.js` contains the declarative transition table and the active-queue statuses, while `transition(order, action)` applies those rules. `allowed_actions` is derived from the same table and returned by the API, giving both the API and UI one source of truth.

`applyAction` first loads the order, then validates the requested transition, and finally performs a conditional update using both the order id and the previously validated status. If another request changes the order between the read and update, the zero-row update is treated as `INVALID_TRANSITION`.

If `start` is requested for an order that is already `preparing`, the Module rejects it and the API returns HTTP 409 with `INVALID_TRANSITION`. The order is not modified, and the UI displays the API error and refetches the queue.

## AI

One AI suggestion I kept was: “Scope the ambient-clock check to the entire Module layer.”

I initially considered restricting this check only to `computePriority` and its tests. I kept the broader suggestion because request-time business logic should not read the system clock directly. The Module receives time through the injected clock, keeping priority calculation, `minutes_waiting`, and tests deterministic and consistent. The seed is intentionally excluded because the exercise requires its dates to be relative to the real UTC time when it runs.

One AI suggestion I rejected and rewrote was: “Keep the transition rules and transition behavior together in `transitions.js`, with the STATUS change marker also appearing in the higher-level orders module test.”

I rewrote that structure because the exercise explicitly evaluates how quickly a ranking or status rule can be changed during the live panel. I moved the declarative state-machine data and active-queue statuses into `status.rules.js`, kept transition behavior in `transitions.js`, and limited the primary `@rule-change STATUS` surface to the rules file and its dedicated transition test. Higher-level module tests still verify queue behavior, but they do not become another place that must be edited for a normal status-rule change. This keeps the state machine easier to find, explain, test, and modify locally.

## Next

If this were going into a real kitchen next month, my first change would be production observability for API errors, transition failures, latency, and queue behavior so operational problems could be diagnosed quickly.

My second change would be a controlled live-update mechanism so multiple kitchen screens stay synchronized without manual refreshes. I intentionally did not implement this because real-time updates are explicitly outside the scope of this exercise.

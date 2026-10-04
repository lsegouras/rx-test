# PLAN: Kitchen Display Queue

Rendered from the `tasks` of [kitchen-queue.prompt.json](kitchen-queue.prompt.json) (v1.0.0) and then amended by the author. Requirements come from `docs/RxRedefined Staff Engineer Take-home test.pdf`.

**Precedence:** where this file and the JSON differ, this file wins. Every difference is listed under [Author amendments](#author-amendments). The JSON itself was not edited.

## Time budget

- **Hard stop:** 240 minutes (§1). That box also holds planning, author review, the author's own DECISIONS.md work and final checks, so the task minutes below are not expected to fill it.
- **Core T01-T12:** maximum 180 minutes. The per-task ceilings below add up to 175, which leaves 5 minutes of execution slack.
- **Extras T13-T15:** estimated separately (20, 15 and 20 minutes). Each one is attempted only after T12 passes and only if the elapsed time leaves room for it before the hard stop. They are cut before anything in the core.
- **Elapsed time** = minutes the author reports as already used when approving this plan + executor time from the start of T01. Each task report shows it.

## Gate policy

After each task the executor runs every acceptance check and every required test, posts the task report, and continues with the next task if everything passes.

The executor stops only when:

1. this PLAN.md is waiting for author approval;
2. the same gate fails twice;
3. an ambiguity that changes behavior, an API contract or a test expectation cannot be resolved from the PDF, the JSON or this file;
4. the 240-minute hard stop is reached.

Each task report still carries the reminder to export the session to `ai-logs/` and the suggested commit message `TNN: {task name}`. The executor never pushes.

## Structure

Layer folders use the §9.1 layer names. The Module is one flat folder because there is one domain.

```
api/src/
  server.js                # listens on 4000
  app.js                   # composition root
  config.js
  clock.js                 # systemClock.now()
  endpoint/
    orders.endpoint.js
    error.middleware.js
  module/
    priority.rules.js      # data   @rule-change RANKING
    priority.js            # computePriority, compareQueue
    priority.test.js       #        @rule-change RANKING
    status.rules.js        # data   @rule-change STATUS
    transitions.js         # transition, allowedActions
    transitions.test.js    #        @rule-change STATUS
    orders.module.js       # createOrdersModule
    orders.module.test.js
    errors.js
  repository/
    orders.repository.js
  schema/
    sequelize.config.js
    models/  migrations/  seeders/
  testing/
    frozen-now.js
```

Rule-change surface: one rules file and one matching test per rule.

| Marker | Rules file | Matching test |
| --- | --- | --- |
| `@rule-change RANKING` | `api/src/module/priority.rules.js` | `api/src/module/priority.test.js` |
| `@rule-change STATUS` | `api/src/module/status.rules.js` | `api/src/module/transitions.test.js` |

Composition root (`app.js`), plain function calls and no DI container:

```js
const ordersRepository = require('./repository/orders.repository');
const { systemClock } = require('./clock');

const ordersModule = createOrdersModule({ repository: ordersRepository, clock: systemClock });
app.use(createOrdersEndpoint(ordersModule));
app.use(errorMiddleware);
```

Module tests call the same `createOrdersModule` with an in-memory fake repository and a fixed clock. The Endpoint receives only `ordersModule`: it never receives, requires or knows about the Repository.

Layer rules that the checks below enforce:

- **Clock.** The Module never reads the ambient clock (`Date.now()` or an argument-less `new Date()`). Request-time logic gets time from the injected clock, so score and `minutes_waiting` use one deterministic `now`. Building a date from an explicit value, such as `new Date(timestamp)`, is valid. The seeder is outside this rule: §9.5 requires dates relative to the real UTC time of the seed run.
- **Status and type values.** The Schema/model validation reuses domain constants owned by the Module. `status` and `type` are VARCHAR with no PostgreSQL ENUM and no CHECK, so a lifecycle rule can change at the panel without a migration.
- **Structural invariants.** The database enforces them: foreign keys, NOT NULL, unique menu item name, `quantity > 0`, `prep_time_minutes > 0` and the four category values.
- **Errors.** The API contract is three codes: 400 `VALIDATION_ERROR`, 404 `ORDER_NOT_FOUND`, 409 `INVALID_TRANSITION`. An unexpected error is a plain 500 with a generic message; stack traces and internal details go to the server log only.

## Overview

The Acceptance and Tests cells give counts; every check and test case is listed in full under [Task details](#task-details). Minutes are ceilings.

| ID | Task | Summary | Minutes | Covers | Acceptance | Tests |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | Monorepo scaffold, docker-compose and root scripts | One repository with npm workspaces, the §9.3 docker-compose, the API package with its dependencies and a config that defaults to the compose values | 10 | REQ-34, 35, 40, 41, 53, 69, 71 | 5 checks | none |
| T02 | Schema: migrations and models | Three migrations and three models for menu_items, orders and order_items, with the database constraints that mirror §4 | 15 | REQ-01, 02, 03, 04, 05, 36, 63, 64 | 6 checks | none |
| T03 | Priority module (pure, TDD) | computePriority(order, now) and compareQueue(a, b) as pure functions driven by one declarative PRIORITY_RULES object | 25 | REQ-08, 09, 10, 11, 12, 13, 14, 15, 38, 44, 45, 47, 66, 67 | 4 checks | Jest, `priority.test.js`, 15 cases |
| T04 | Transitions module (rules table, TDD) | The state machine as data in status.rules.js (transition table and active-queue statuses) and behavior in transitions.js: transition(order, action) and allowedActions(status) | 10 | REQ-04, 16, 17, 46, 66, 67 | 4 checks | Jest, `transitions.test.js`, 12 cases |
| T05 | Orders module: queue assembly and applyAction | createOrdersModule({ repository, clock }) returns getQueue and applyAction, which orchestrate repository, clock, priority and transitions; tested with an in-memory fake repository and a fixed clock | 15 | REQ-06, 07, 18, 44, 46, 60, 61, 65, 67 | 4 checks | Jest, `orders.module.test.js`, 13 cases |
| T06 | Repository | Three Sequelize functions returning plain objects: the eager-loaded queue read, a find by id and the conditional status update | 10 | REQ-37, 63, 65, 67 | 5 checks | none |
| T07 | Endpoints, error middleware and composition root | Thin Express 5 routes for the queue and the four transitions, one middleware that maps domain errors to the three stable codes, and app.js wiring repository, clock, module and endpoint | 15 | REQ-18, 19, 20, 21, 22, 23, 24, 25, 37, 62, 67 | 9 checks | none |
| T08 | Seed with relative dates | One re-runnable seeder with menu items and orders that demonstrate every §9.5 scenario, all dates computed from the seed-run time; first full db:setup validation | 15 | REQ-01, 06, 19, 20, 42, 43 | 8 checks | none |
| T09 | Web scaffold and API client | Vite + React 19 + TypeScript + MUI 7 app with a dev proxy to the API, the QueueItem type and a small typed fetch client | 10 | REQ-34, 39, 41, 67, 69 | 5 checks | none |
| T10 | Kitchen Display page | The single page: dense MUI table in API order, status filter, action buttons from allowed_actions, empty state and on-screen API errors | 25 | REQ-26, 27, 28, 29, 30, 31, 32, 33, 60, 67, 68 | 7 checks | none |
| T11 | README, DECISIONS.md and ai-logs/README.md | The written deliverables: how to run and where to change rules (README), why (DECISIONS.md drafts for the author) and export instructions for the AI logs | 10 | REQ-25, 48, 49, 50, 51, 52, 54, 66, 70 | 7 checks | none |
| T12 | Panel rehearsal: clean clone and two change drills | Prove the §13 conditions: both apps boot from a clean clone with the 4 commands, and a ranking tweak and a status tweak are each a change to one rules file and its matching test | 15 | REQ-41, 53, 55, 56 | 4 checks | none |
| T13 | Extra: POST /orders (API only) | Optional §11.1: create an order through the API with module-level validation and a Jest test for validation errors; no UI form | 20 | REQ-57 | 3 checks | Jest, `orders.module.test.js`, 4 cases |
| T14 | Extra: Vitest component test | Optional §11.2: a component test of QueueTable for the empty state and for buttons that follow allowed_actions, with its own fixtures | 15 | REQ-58 | 2 checks | Vitest, `QueueTable.test.tsx`, 3 cases |
| T15 | Extra: Playwright end-to-end happy path | Optional §11.3: one browser test that starts preparation on a seeded order, with webServer booting the API and the web app | 20 | REQ-59 | 2 checks | Playwright, `queue.spec.ts`, 1 case |

## Task details

### T01: Monorepo scaffold, docker-compose and root scripts

Depends on: nothing. 10 min.

Acceptance:

- `node --version` prints v22.x, `docker compose version` and `git --version` each print a version
- `docker compose up -d` then `docker compose ps` shows exactly one service, postgres, mapped 5433->5432
- `npm install` at the root exits 0 and creates one root package-lock.json
- `npm ls express sequelize -w api` shows express 5.x and sequelize 6.x
- `npm test -w api -- --passWithNoTests` exits 0

Tests: none.

### T02: Schema: migrations and models

Depends on: T01. 15 min. The `db:setup` script is defined here but not validated until the seed exists (T08).

Acceptance:

- `npm run db:migrate -w api` exits 0, and a second run exits 0 with nothing to migrate
- `docker compose exec -T postgres psql -U kitchen_queue -d kitchen_queue -c '\dt'` lists menu_items, orders and order_items
- psql `\d menu_items`, `\d orders` and `\d order_items` show: UNIQUE on menu_items.name; CHECK (prep_time_minutes > 0); CHECK on the four category values; CHECK (quantity > 0); FK order_items.order_id -> orders.id ON DELETE CASCADE; FK order_items.menu_item_id -> menu_items.id ON DELETE RESTRICT; the index on orders.status; NOT NULL on every column except orders.promised_at
- Via psql, each INSERT fails with the named violation and the tables stay empty: order_items with quantity 0 (check); menu_items with prep_time_minutes 0 (check); menu_items with category 'banana' (check); a second menu_items row with the same name (unique); order_items with an unknown order_id (foreign key); order_items with an unknown menu_item_id (foreign key); orders with customer_name NULL (not null)
- A `node -e` one-liner shows `MenuItem.build({ ..., category: 'banana' }).validate()` rejects and each of starter, main_course, dessert, drink passes
- `grep -rn 'sync(' api/src` prints nothing

Status and type values are not database constraints (D-06): the Schema/model validation reuses domain constants owned by the Module. That validation is checked in T06, where the model receives the constants. Category is not a panel rule, so it is enforced by the database and by the model.

Tests: none.

### T03: Priority module (pure, TDD)

Depends on: T01. 25 min.

Acceptance:

- `npm test -w api -- priority` passes with PostgreSQL stopped (`docker compose stop`)
- `grep -nE 'Date\.now|new Date\(\s*\)' api/src/module/priority.js api/src/module/priority.test.js` prints nothing (ambient clock reads only; `new Date(value)` is allowed)
- `grep -rn '@rule-change RANKING' api/src` lists priority.rules.js and priority.test.js
- `grep -nE 'require\(.*(express|sequelize|repository)' api/src/module/priority.js api/src/module/priority.rules.js` prints nothing

Tests (Jest, `api/src/module/priority.test.js`):

1. §5.3 example A as a literal fixture with now = 2026-06-15T12:00:00Z scores 60
2. §5.3 example B as a literal fixture scores 60
3. compareQueue puts example B above A (tie on 60; promised_at beats null)
4. type weights (test.each): dine_in 30, takeout 20, delivery 10
5. VIP adds 20; non-VIP adds 0
6. wait (test.each): 9 min 50 s -> 0; 10 min 00 s -> 5; 35 min -> 15; 80 min -> 40; 200 min -> 40 (cap)
7. promised (test.each): +20 min -> 25; +30:00 -> 25; +30:30 -> 15; +45 min -> 15; +60:00 -> 15
8. promised (test.each): +60:01 -> 0; +90 min -> 0; null -> 0; overdue by 10 min -> 25 (D-01)
9. dine_in with promised_at +20 min gets the 25 promise points (D-03)
10. complexity (test.each): 14 min -> 0; 15 min -> 5; 50 min -> 15; 60 min -> 20; 84 min -> 20 (cap)
11. total prep minutes = sum of prep_time_minutes * quantity across items
12. tie-break: earlier promised_at first; null promised_at last
13. tie-break: same promised_at -> earlier placed_at first; same placed_at -> smaller id first
14. a higher score sorts first regardless of the tie-break fields
15. delivery VIP promised in 20 min (55) ranks above a dine_in non-VIP with nothing else (30)

### T04: Transitions module (rules table, TDD)

Depends on: T01. 10 min.

Files: `errors.js`, `status.rules.js` (frozen TRANSITIONS table and ACTIVE_QUEUE_STATUSES, data only), `transitions.js` (transition, allowedActions, and the derived ORDER_STATUSES and ACTIONS), `transitions.test.js`.

Acceptance:

- `npm test -w api -- transitions` passes with PostgreSQL stopped
- `grep -rl '@rule-change STATUS' api/src` lists exactly status.rules.js and transitions.test.js
- `grep -nE 'function|=>' api/src/module/status.rules.js` prints nothing (the rules file is data only)
- `grep -nE 'switch|else if' api/src/module/status.rules.js api/src/module/transitions.js` prints nothing (the rules are a table, not branches)

Tests (Jest, `api/src/module/transitions.test.js`). This is the matching test of status.rules.js and it states the state-machine contract directly: every expectation is a literal written in the test, and none is computed from status.rules.js.

1. legal (test.each): received + start -> preparing; received + cancel -> cancelled
2. legal (test.each): preparing + ready -> ready; ready + pickup -> picked_up
3. skip a step: received + ready, received + pickup and preparing + pickup throw INVALID_TRANSITION
4. repeat: start on an order that is already preparing throws INVALID_TRANSITION (the §12.1 case)
5. repeat: ready on an order that is already ready throws INVALID_TRANSITION
6. terminal (test.each): every action on picked_up and on cancelled throws INVALID_TRANSITION
7. cancel is rejected from preparing and from ready
8. allowedActions: received -> [start, cancel]; preparing -> [ready]; ready -> [pickup]
9. allowedActions: picked_up -> []; cancelled -> [] (terminal statuses have no actions)
10. ACTIVE_QUEUE_STATUSES is exactly [received, preparing]
11. ready, picked_up and cancelled are not in ACTIVE_QUEUE_STATUSES (outside the default queue)
12. ORDER_STATUSES has exactly the 5 statuses of §4.2

### T05: Orders module: queue assembly and applyAction

Depends on: T03, T04. 15 min.

`createOrdersModule({ repository, clock })` returns `{ getQueue({ status }), applyAction(id, action) }`. This test file is not a rule-change point: its expectations about which statuses are active and which actions are allowed are derived from the rules, so a status-rule change edits only status.rules.js and transitions.test.js.

Acceptance:

- `npm test -w api` passes with PostgreSQL stopped (priority, transitions and orders.module test files)
- `grep -nE 'require\(.*(express|sequelize|repository)' api/src/module/orders.module.js` prints nothing
- `grep -rn 'jest.mock' api/src` prints nothing
- `grep -c '@rule-change' api/src/module/orders.module.test.js` prints 0

Tests (Jest, `api/src/module/orders.module.test.js`):

1. default queue with one order per status returns exactly the orders whose status is in ACTIVE_QUEUE_STATUSES (received and preparing today)
2. a picked_up order and a cancelled order are never in the default queue (literal, §10)
3. status=received returns only received; status=preparing returns only preparing
4. every status outside ACTIVE_QUEUE_STATUSES (ready, picked_up and cancelled today) and status=banana throw VALIDATION_ERROR
5. result order equals the fixtures sorted with compareQueue; score = computePriority(order, now)
6. each item has exactly the fields of context.queue_item_dto
7. minutes_waiting uses the same frozen now as the score; clock.now() is called exactly once
8. allowed_actions of each item equals allowedActions(item.status)
9. applyAction: ids 'abc', 0, -1 and 1.5 throw VALIDATION_ERROR
10. applyAction: an unknown id throws ORDER_NOT_FOUND
11. applyAction: start on a preparing order throws INVALID_TRANSITION and updates nothing
12. applyAction: start on a received order returns { id, status: 'preparing' } and updates the fake
13. applyAction: a conditional update that affects 0 rows throws INVALID_TRANSITION

### T06: Repository

Depends on: T02, T05. 10 min.

Acceptance:

- With Postgres up, a `node -e` one-liner calling findByStatuses(['received']) prints an array and exits 0
- With DB_LOG=true the same call logs exactly one SELECT statement
- `grep -nE 'computePriority|compareQueue|TRANSITIONS|ACTIVE_QUEUE' api/src/repository/orders.repository.js` prints nothing
- A `node -e` one-liner shows `Order.build(...).validate()` rejects status 'banana' and type 'banana' and accepts a valid order; the model validation reuses the domain constants owned by the Module, with no literal status or type list under api/src/schema/models
- `npm test -w api` still passes

Tests: none.

### T07: Endpoints, error middleware and composition root

Depends on: T05, T06. 15 min.

`createOrdersEndpoint(ordersModule)` returns the router; `app.js` is the composition root shown under [Structure](#structure). The error middleware maps the three DomainError codes to 400, 404 and 409 with the body `{ error: { code, message } }`. Any other error is logged on the server and answered as 500 `{ error: { message: 'Internal server error' } }`: no error code, no stack trace, no internal detail. The middleware answers it itself because Express's default handler prints the stack trace in the response outside production.

Acceptance:

- `npm run dev -w api` starts and `curl -s -o /dev/null -w '%{http_code}' localhost:4000/orders/queue` prints 200
- `curl -s 'localhost:4000/orders/queue?status=ready'` returns 400 with error.code VALIDATION_ERROR
- `curl -s -X POST localhost:4000/orders/999999/start` returns 404 with error.code ORDER_NOT_FOUND
- `curl -s -X POST localhost:4000/orders/abc/start` returns 400 with error.code VALIDATION_ERROR
- `grep -rnE 'computePriority|compareQueue|findAll' api/src/endpoint` and `grep -rnE 'require\(.*(sequelize|repository|schema)' api/src/endpoint` both print nothing
- `grep -rlE 'require\(.*repository' api/src` lists only api/src/app.js (the real repository is wired in one place)
- `grep -rnE 'Date\.now|new Date\(\s*\)' api/src/module` prints nothing: the whole Module layer and its Jest tests get now as an argument or from the injected clock. The pattern matches ambient reads only, so `new Date(value)` is allowed. clock.js and, from T08, the seeder read the real clock
- `grep -rn 'INTERNAL_ERROR' api/src` prints nothing
- With Postgres stopped (`docker compose stop`), `curl -s -i localhost:4000/orders/queue` returns 500 with exactly the generic body: no code, no stack trace, no SQL or driver text; the detail appears only in the server log. `docker compose start` afterwards

Tests: none.

### T08: Seed with relative dates

Depends on: T02, T07. 15 min. The seeder reads the real UTC time once with `new Date()` and derives every date from it.

Acceptance:

- `npm run db:setup` at the root (migrations + seed, validated here for the first time) run twice exits 0 both times and `SELECT count(*) FROM orders` is the same after each run
- `curl -s localhost:4000/orders/queue` returns only received and preparing items, with scores in non-increasing order
- `curl -s 'localhost:4000/orders/queue?status=received'` returns only received items
- `curl -s 'localhost:4000/orders/queue?status=preparing'` returns only preparing items
- The tie pair is adjacent with equal scores and the item with a promised_at comes first; the ready order's id is absent
- One item has minutes_waiting >= 80 (wait cap) and the complexity-cap order is present with all 3 types and both VIP values in the queue
- `curl -s -X POST localhost:4000/orders/{id of the preparing order}/start` returns 409 with error.code INVALID_TRANSITION
- `grep -nE '20[0-9]{2}-[0-9]{2}' api/src/schema/seeders/01-demo-data.js` prints nothing

Tests: none.

### T09: Web scaffold and API client

Depends on: T07. 10 min. A failed response without an error code (the 500 above, or a proxy failure) raises an ApiError with no code, and the page shows its own generic user-facing message, never server text.

Acceptance:

- `npm install` exits 0 and `npm ls react @mui/material -w web` shows react 19.x and @mui/material 7.x
- `npm run dev` starts both apps: the API on 4000 and the web app on 5173
- `curl -s localhost:5173/orders/queue` returns the same JSON as `curl -s localhost:4000/orders/queue`
- `npm run build -w web` exits 0 (type-check passes)
- `grep -nE 'redux|tanstack|react-query|swr|axios' web/package.json` prints nothing

Tests: none.

### T10: Kitchen Display page

Depends on: T08, T09. 25 min. Visible checks are run with a browser tool.

Acceptance:

- http://localhost:5173 shows the 9 columns and the rows are in the same id order as `curl -s localhost:4000/orders/queue`
- Each filter sends the right request and shows the matching rows: Active -> GET /orders/queue with no param; Received -> GET /orders/queue?status=received, only received rows; Preparing -> GET /orders/queue?status=preparing, only preparing rows
- A received row shows exactly the Start and Cancel buttons; a preparing row shows exactly the Mark ready button
- Clicking Start changes that row's status to preparing after the refetch; clicking Mark ready removes the row
- After `curl -X POST localhost:4000/orders/{id}/start` on a received row, clicking Start on the stale row shows an Alert with INVALID_TRANSITION
- With no rows for the selected filter, the table shows 'No orders in the queue'
- `grep -rnE '\.sort\(|Math\.floor|Math\.min' web/src` prints nothing and `npm run build -w web` exits 0

Tests: none.

### T11: README, DECISIONS.md and ai-logs/README.md

Depends on: T10. 10 min.

Acceptance:

- `grep -c '^## ' DECISIONS.md` prints 6 and the headings are Scope, Layers, Priority, Transitions, AI, Next in that order
- The AI section body is exactly '<!-- AUTHOR: fill in -->' and `grep -c 'AUTHOR: review and rewrite' DECISIONS.md` prints 5
- DECISIONS.md Transitions states that start on a preparing order returns 409 INVALID_TRANSITION; Layers names one rule kept out of the UI
- README contains `docker compose up -d`, `npm install`, `npm run db:setup`, `npm run dev` and the ports 4000, 5173 and 5433
- README documents exactly three error codes: VALIDATION_ERROR (400), ORDER_NOT_FOUND (404), INVALID_TRANSITION (409); `grep -c 'INTERNAL_ERROR' README.md` prints 0
- `grep -rl '@rule-change' api/src` prints exactly the four files of the rule-change table, and each appears in the README table 'Where to change the rules'
- `git status --short ai-logs` shows ai-logs/README.md as the only file this task added under ai-logs/

Tests: none.

### T12: Panel rehearsal: clean clone and two change drills

Depends on: T11. 15 min. Precondition: everything is committed (`git status --short` is empty).

Acceptance:

- Clean clone: in a temp clone the 4 commands of §9.4 succeed and both localhost:4000/orders/queue and localhost:5173 respond within a few minutes; the clone is then stopped and deleted
- Ranking drill: one value of PRIORITY_RULES is changed (for example the wait-time cap 40 -> 50) and its expectation updated; `npm test -w api` passes; `git diff --name-only` prints exactly api/src/module/priority.rules.js and api/src/module/priority.test.js; `git restore .` discards it
- Status drill: cancel is allowed from preparing in TRANSITIONS and its expectation updated; `npm test -w api` passes; `git diff --name-only` prints exactly api/src/module/status.rules.js and api/src/module/transitions.test.js; in the browser a preparing row shows Cancel and clicking it removes the row; `git restore .` discards it
- After both drills `git status --short` is empty, `npm test -w api` passes and `npm run db:setup` restores the demo data

Tests: none.

### T13 (optional): Extra: POST /orders (API only)

Depends on: T12. 20 min.

Acceptance:

- `npm test -w api` passes with PostgreSQL stopped
- A curl POST /orders with body `{"customer_name":"X","type":"takeout","items":[]}` returns 400 with error.code VALIDATION_ERROR
- A valid POST /orders returns 201 and the new order appears in GET /orders/queue with status received

Tests (Jest, `api/src/module/orders.module.test.js`):

1. createOrder: empty or missing items throws VALIDATION_ERROR
2. createOrder: an unknown menu_item_id throws VALIDATION_ERROR
3. createOrder: quantity 0, -1, 1.5 or '2' throws VALIDATION_ERROR
4. createOrder: a valid payload is stored with status received and placed_at = clock.now()

### T14 (optional): Extra: Vitest component test

Depends on: T12. 15 min. The test protects the architecture: buttons come from `allowed_actions`, and web/src holds no status-to-action map and no check such as `status === 'received'` that decides a button.

Acceptance:

- `npm test -w web` passes
- `npm run build -w web` still exits 0

Tests (Vitest, `web/src/components/QueueTable.test.tsx`):

1. items = [] renders 'No orders in the queue'
2. with API-shaped fixtures (received: [start, cancel]; preparing: [ready]) Cancel is rendered on the received row only (§11.2)
3. buttons follow allowed_actions, not status: a received row with allowed_actions [start] has no Cancel button, and a preparing row with allowed_actions [ready, cancel] has one

### T15 (optional): Extra: Playwright end-to-end happy path

Depends on: T12. 20 min. Attempted only if Chromium is already available or if adding what Playwright needs clearly fits in the remaining time. Otherwise it is skipped and recorded in DECISIONS.md Scope as an extra intentionally not attempted because the required core had priority.

Acceptance:

- With the dev servers stopped and Postgres up, `npm run test:e2e` exits 0 (Playwright boots both apps)
- `npm run db:setup` afterwards restores the demo data

Tests (Playwright, `e2e/queue.spec.ts`):

1. the queue renders a seeded received order; Start is clicked; that row's status becomes preparing

## Author amendments

Requested by the author on 2026-10-04 in two review rounds after the first render. Each one overrides the named part of the JSON.

| ID | Amendment | Overrides in the JSON |
| --- | --- | --- |
| A-01 | T02 validates migrations only; `db:setup` is first validated in T08, once the seed exists | T02 acceptance |
| A-02 | Continuous execution: run checks and tests, report, continue; stop only on the four conditions of the gate policy | `gate_policy`, the "stop after each task" principle |
| A-03 | Layer folders use the §9.1 names: `endpoint/`, `module/`, `repository/`, `schema/`; the Module is flat | `architecture.folder_tree`, every path under `endpoints/`, `modules/orders/`, `repositories/` |
| A-04 | `status.rules.js` holds the transition table and ACTIVE_QUEUE_STATUSES; `transitions.js` holds transition() and allowedActions() | `state_machine.table_file`, T04 files and steps |
| A-05 | `orders.module.test.js` carries no `@rule-change STATUS`; its active-status and allowed-action expectations are derived from the rules. `transitions.test.js` stays literal and explicit about the state-machine contract and is the one test that changes with `status.rules.js` | third entry of `rule_change_points`, T05 acceptance and cases 1, 2, 4, 8, T04 cases 10-12 |
| A-06 | T12 runs a ranking drill and a status drill separately, each with its own `git diff --name-only` check | T12 steps and acceptance |
| A-07 | No INTERNAL_ERROR code. The contract is the three 4xx codes; an unexpected error is a 500 with a generic message, no code and no stack trace or internal detail in the response | D-12, T07 step 4 and acceptance, T11 acceptance |
| A-08 | T10 verifies the Active, Received and Preparing filters explicitly | T10 acceptance |
| A-09 | Time budget reworded: core maximum 180, extras estimated separately; T01 15 -> 10 (prerequisites already verified), T03 stays at 25, so the core ceilings total 175 | `meta.core_budget_minutes` presentation, T01 minutes |
| A-10 | The real-clock check no longer covers the seeder. It is scoped to the whole Module layer (`api/src/module`, code and tests) and matches ambient reads only (`Date.now()`, argument-less `new Date()`) | T03 and T07 acceptance, wording of `do_not` item 4 |
| A-11 | `app.js` is an explicit composition root: ordersRepository, clock, createOrdersModule, createOrdersEndpoint | D-17 (deps as first argument becomes a factory) |
| A-12 | T02 inspects the CHECKs, both foreign keys, NOT NULL and UNIQUE; category gains a database CHECK. Status and type stay VARCHAR: the Schema/model validation reuses domain constants owned by the Module, checked in T06 | T02 and T06 acceptance, `entities` MenuItem.category (model validation only), REQ-64 |
| A-13 | The Vitest test proves buttons are rendered from allowed_actions, not from status, with deliberately mismatched fixtures | T14 cases |
| A-14 | T15 is attempted only if Chromium is already available or its setup clearly fits the remaining time; otherwise it is skipped and recorded in DECISIONS.md Scope | T15 step 1 (ask before the browser download) |
| A-15 | At the author's request the executor exports this planning session to `ai-logs/02-planning-session-plan-review.md`, generated from the session transcript file | `executor_must_not` item 1 and REQ-70, for that file only |

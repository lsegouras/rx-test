# Kitchen Display Queue

An internal tool for a restaurant kitchen. The expeditor sees every active order ranked by a priority score and moves each order through its preparation stages.

- `api/`: Express 5 + Sequelize 6 + PostgreSQL 16, in JavaScript
- `web/`: Vite + React 19 + TypeScript + MUI 7

The reasons behind the design are in [DECISIONS.md](DECISIONS.md).

## Prerequisites

- Docker with the `docker compose` plugin, running
- Node.js 22 (`.nvmrc` is provided)

Host port 5433 must be free for PostgreSQL, 4000 for the API and 5173 for the web app.

## Getting started

```bash
docker compose up -d     # PostgreSQL 16 on host port 5433
npm install              # installs both apps (npm workspaces)
npm run db:setup         # runs the migrations and the seed
npm run dev              # API on http://localhost:4000, web on http://localhost:5173
```

Open http://localhost:5173.

No `.env` file is needed: the defaults in `api/src/config.js` match `docker-compose.yml`. `.env.example` lists the variables you can override.

Seed dates are relative to the moment the seed runs. Run `npm run db:setup` again to reset the demo data and refresh its dates.

## Tests

```bash
npm test
```

The Jest tests cover the business rules in `api/src/module`. They use their own fixtures and a frozen clock, and they run without PostgreSQL.

```bash
npm test -w web
```

One Vitest component test of the queue table (extra): the empty state, and buttons that follow `allowed_actions`.

```bash
npx playwright install chromium   # once
npm run test:e2e
```

One Playwright end-to-end test (extra): the queue shows a seeded order, the expeditor starts it, and the status changes on screen. PostgreSQL must be up. The command reseeds the database, then starts the API and the web app itself, or reuses them if they are already running. Run `npm run db:setup` afterwards to restore the demo data.

## API

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/orders/queue` | Orders in `received` or `preparing`, highest score first. Each order includes its `score`, `minutes_waiting` and `allowed_actions`. |
| GET | `/orders/queue?status=received` | Same, only `received` orders. `status=preparing` works the same way. |
| POST | `/orders/:id/start` | `received` -> `preparing` |
| POST | `/orders/:id/ready` | `preparing` -> `ready` |
| POST | `/orders/:id/pickup` | `ready` -> `picked_up` |
| POST | `/orders/:id/cancel` | `received` -> `cancelled` |
| POST | `/orders` | Creates an order in `received` (extra, API only). Answers `201 { "id", "status", "placed_at" }`. |

A successful transition answers `200 { "id": 1, "status": "preparing" }`.

Body of `POST /orders`; `is_vip` and `promised_at` are optional:

```json
{
  "customer_name": "Lia Torres",
  "type": "delivery",
  "is_vip": true,
  "promised_at": "2030-01-01T12:30:00Z",
  "items": [{ "menu_item_id": 2, "quantity": 1 }]
}
```

### Error codes

Every error from the routes above has the body `{ "error": { "code": "...", "message": "..." } }`. The codes are stable. A path that matches no route gets the default Express 404 page.

| HTTP status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | `:id` is not a positive integer; `?status` is not `received` or `preparing`; or the body of `POST /orders` is invalid (not valid JSON or too large, empty `items`, unknown `menu_item_id`, `quantity` not a positive integer, invalid field); or the URL is malformed |
| 404 | `ORDER_NOT_FOUND` | No order has this id |
| 409 | `INVALID_TRANSITION` | The order's current status does not allow the action: a skipped step, a repeated action, a terminal order, or a status that changed during the request |

An unexpected failure answers HTTP 500 with a generic message and no code. The detail is written to the server log only.

## Where to change the rules

Business rules live only in `api/src/module`. Each rule has one rules file (data only) and one matching test. The files carry a `@rule-change` marker, so `grep -rn "@rule-change" api/src` finds them.

| Change | Rules file | Test to update |
| --- | --- | --- |
| Ranking: a type weight, the VIP bonus, a cap or step of wait time or complexity, a promised-time bucket, the tie-break order | `api/src/module/priority.rules.js` | `api/src/module/priority.test.js` |
| Status: add, remove or redirect a transition; change which statuses are in the active queue; change the status a new order starts in | `api/src/module/status.rules.js` | `api/src/module/transitions.test.js` |

For these changes nothing else needs to change. The routes are generated from the transition table, and the web app renders the buttons listed in each order's `allowed_actions`, so a new transition gets its route and its button with no edit in the endpoint or in `web/`.

Two limits. A rule that needs logic the tables do not describe yet (for example a bonus for one menu category) also changes `priority.js` or `transitions.js`, still inside the Module. And `web/src/format.ts` holds display labels only: a new action, status or type works without it and shows its API name until a label is added.

## Project layout

```
api/src/
  app.js            composition root: wires repository + clock -> module -> endpoint
  endpoint/         HTTP only
  module/           business rules: priority, transitions, queue assembly
  repository/       Sequelize queries
  schema/           models, migrations, seed
web/src/            one page: fetch the queue, render it in API order, post actions
e2e/                Playwright end-to-end test; playwright.config.ts is at the root
ai-logs/            AI conversation history and planning artifacts
docs/               the take-home brief
```

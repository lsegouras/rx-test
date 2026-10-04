Based on the attached technical test PDF, follow exactly what is specified in the prompt below:
<task_context>

  <role>

You are a Staff Full-Stack Engineer and a Prompt Architect for coding agents. You have shipped production Node.js/Express/Sequelize/PostgreSQL APIs and React/MUI internal tools. You write prompts that an agent can execute end to end with minimal back-and-forth.

  </role>

  <mission>

Your only deliverable in this session is ONE file: `ai-logs/00-planning/kitchen-queue.prompt.json`. It is a JSON prompt that a fresh Claude Code session will later execute to build the "Kitchen Display Queue" take-home project, task by task.

You are NOT building the project now. Do not create application code, `package.json` files, migrations or any folders other than `ai-logs/00-planning/`. In this session you only read, research, plan and write the JSON.

  </mission>

<product_goal>

An internal tool for a restaurant kitchen. The expeditor, the person who decides what the kitchen prepares next, must be able to:

- see every active order;
- see them sorted by priority;
- follow each order's preparation stage;
- move each order to its next status.

</product_goal>

<evaluation_context>

- 4-hour time box. The PDF says to stop when the time is up (§1).
- The reviewers prefer a smaller, organized, well-explained solution over a large one the author cannot justify.
- What weighs most in the evaluation:
  1. project organization;
  2. which layer the business rules live in;
  3. how easy it is to change ranking and status rules;
  4. the ability to explain every decision, including AI-generated code (§2).
- Any AI tool (Cursor, Claude, etc.) may be used throughout development, as long as its use is transparent (see `<ai_transparency_rules>`).
- In the interview (§13) there will be a live change to a ranking or status rule. These rules must therefore be isolated, commented and easy to find. Changing a weight or a transition must mean editing 1 rules file + its matching test.

</evaluation_context>

<success_criteria>

The JSON is good if someone who has never seen the PDF can hand it to Claude Code and get a submission that:

1. meets every mandatory requirement in the PDF, traceable by section;
2. fits the time box, with slack for the author's review;
3. keeps ranking and status rules in single, marked and tested places;
4. can be explained by the author file by file and function by function.

</success_criteria>

</task_context>

<background_data>

<source_of_truth priority="1" name="exercise_pdf">

The exercise PDF is at `./docs/take-home-kitchen-queue.pdf`. If the path is different, use Glob to find it. If there is no PDF, STOP and ask for it.

It is the ONLY source of requirements. Cite the PDF's own section numbers (§5.1, §6, §9.1…) on every requirement.

Sections that weigh most:

- §1–2: what is evaluated and the AI usage rules;
- §5–6: ranking and state machine;
- §7: API;
- §8: UI;
- §9: stack and layers;
- §10: required tests;
- §12: deliverables;
- §13: interview;
- §14: out of scope.

</source_of_truth>

<source_of_truth priority="2" name="context7_mcp">

Library documentation comes from the Context7 MCP (`resolve-library-id` → `query-docs`). Use it only to confirm APIs of the version the PDF requires, never to add features.

Budget: at most 2 `query-docs` calls per library and 8 in total, each with a narrow question. If Context7 is not connected, proceed from your own knowledge and list the unverified points in `open_questions`.

Query only these, because they are the ones that change between versions and where models tend to get things wrong:

| Library                                         | Why it is worth the tokens                                                                                                                                     | What to ask                                                                                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| MUI Material **7**                              | The PDF requires MUI 7. Confirm the v7 APIs (use the v7 ID/version in Context7) and install a v7-compatible version, regardless of the latest available major. | v7 imports for `Table size="small"`, `Chip`, `ToggleButtonGroup`, `Alert`/`Snackbar`; peer deps (Emotion)                                           |
| Sequelize **6** + sequelize-cli                 | The PDF requires Sequelize 6. Confirm the v6 APIs, regardless of the latest available major; the migrations/seeders setup is easy to get wrong.                | `.sequelizerc` + migrations/seeders in CommonJS; `belongsToMany` through a join model with `quantity`; conditional `update` returning affected rows |
| Express                                         | The PDF does not pin a version, and async error handling and route syntax change between majors.                                                               | Which major to use; error middleware with async handlers in that major                                                                              |
| Playwright (only if extra §11.3 is in the plan) | `webServer` config with two servers                                                                                                                            | `webServer` array booting API + web                                                                                                                 |

Do NOT query React 19, Vite, TypeScript, Jest, Vitest, Node 22 or PostgreSQL 16. The part of them we use is stable and well known, and querying them only inflates the context.

Summarize what you learned in `context.doc_facts` (max 3 facts per library, ≤ 160 characters each), so the executor does not need to query again.

</source_of_truth>

<source_of_truth priority="3" name="author_answers">

These are the author's answers to the questions in step 4 of the workflow. They go into `decisions` with `decided_by: "author"`.

</source_of_truth>

<conflict_rule>

Priority order: PDF > author's answers > Context7 > your prior knowledge. Documentation never overrides the PDF. Example: if the docs show a newer MUI major, MUI 7 from §9.2 still wins.

</conflict_rule>

<origin_rule>

Every JSON object that has `origin` also has `section`, and the two go together:

- `"origin": "spec"` → comes from the PDF, and `section` is required (e.g. `"§7"`);
- `"origin": "engineering"` → not in the PDF; it must be listed in `<allowed_additions>` or come from this prompt's architecture, documentation, testability and process rules, and `section` is `null`.

The `decided_by` field (`"author" | "default"`) is something else: it says who made a decision, not where it came from.

</origin_rule>

</background_data>

<task_rules>

  <workflow>

Before writing anything, think through the steps below. Execute them in order, without merging steps.

1. **READ** the whole PDF and build a requirement inventory. Each item is an atomic, testable requirement with:
   - an ID `REQ-NN`;
   - the PDF section;
   - a category;
   - a one-line statement in English.

   Include all of these:
   - data model rules;
   - score components and caps;
   - tie-break;
   - transitions;
   - routes and errors;
   - UI elements;
   - technical constraints;
   - seed coverage;
   - required tests;
   - deliverables (README, the 6 sections of DECISIONS.md, `ai-logs/`);
   - extras, with `optional: true`.

2. **MAP** the evaluation criteria (§1, §2, §13) to the architecture. Define where the rules live, which files are the change points for ranking and status, and which quality attributes matter here, each with how it is verified (e.g. performance → queue in a single query, no N+1).
3. **DETECT** ambiguities. For each one, write the options and a recommended default. Check and include these, which have already been identified, and add any others you find:
   - **Overdue `promised_at` (in the past):** which bucket does it get? Recommended: 25 pts, because it is ≤ 30 min from now.
   - **Bucket boundaries:** by the wording of §5.1, exactly +30 min is still "within 30" (25 pts) and exactly +60 min is still "31–60" (15 pts). The gap lies between 30 and 31 min (e.g. +30 min 30 s). Recommended: compare the difference in ms (≤ 30 min → 25; > 30 and ≤ 60 → 15; otherwise 0).
   - **`promised_at` on a `dine_in` order:** scored or ignored? §4.2 says the field is relevant for delivery and takeout, but the §5.1 formula does not condition on type. Recommended: apply the formula as written and record the decision.
   - **Which Express major:** §9.1 only says "Express". Recommended: the stable major that Context7 reports.
   - **Error codes and HTTP statuses**, including `GET /orders/queue?status=ready` or an invalid value. Recommended:
     - 400 `VALIDATION_ERROR` for an invalid `:id` or `?status`;
     - 404 `ORDER_NOT_FOUND`;
     - 409 `INVALID_TRANSITION`.
   - **`status` and `type` in the database:** Postgres ENUM or VARCHAR validated by the domain constants. Recommended: VARCHAR validated by the same constants the module uses. Adding a value to an ENUM requires a migration, and §13 will ask for a live change.
   - **`pickup` action in the UI:** `ready` orders leave the queue (§5), and the §7 filter only accepts `received` or `preparing`. So the screen never shows an order for which `pickup` is valid. Recommended: follow the PDF literally (`pickup` via API only, covered by a test) and note the point in DECISIONS.md › Next.
   - **Where to test "cancelled/picked-up not in the default queue" (§10):** (a) a pure test of the queue module with an in-memory fake repository (no Sequelize mocks); (b) an integration test against Postgres. Recommended: (a). §9.1 only requires DB-free tests for the priority function, but the same approach keeps this test fast and simple. The Repository filters using the same `ACTIVE_QUEUE_STATUSES` constant.
4. **ASK.** If any ambiguity changes a score result, an API contract or a test expectation, ask the author ONCE:
   - use AskUserQuestion, if available;
   - ask at most 4 questions;
   - each question has 2–4 options, recommended first;
   - do not ask anything the PDF already answers.

   For the other ambiguities, apply the recommended default and record it in `decisions`, with its rationale.

5. **RESEARCH** in Context7 within the budget.
6. **PLAN** the tasks following `<task_planning_rules>`.
7. **WRITE** the JSON following `<output_format>` exactly.
8. **VALIDATE** with `<self_check>`. Fix and re-validate until everything passes. Only then reply.

  </workflow>

<architecture_rules>

The JSON must require the following of the final code, wherever it applies.

**Layers named as in the PDF (§9.1).** Use these names for the folders too, because it is the reviewers' vocabulary:

- **Endpoint** (the controller): thin HTTP. Reads the request, calls the module, writes the response.
- **Module** (services and domain rules): score, sorting, transitions.
- **Repository:** Sequelize queries, includes and filters.
- **Schema:** models and migrations.

**Principles, applied to the size of the problem:**

- **Clean Architecture:** dependencies point toward the Module, and the Module does not import Express or Sequelize.
- **SOLID:** only where it reduces real coupling.
- **Light DDD:** use the PDF's ubiquitous language (`expeditor`, `received`, `promised_at`…) and keep order lifecycle rules in the Order module. Do not create domain classes, aggregates, value objects or interfaces unless they directly simplify the required behavior.
- **TDD in the Module:** test before implementation.

Do not create any abstraction the author cannot justify in one sentence. No DI container, generic base repository class, factories or event bus. Plain functions and objects are enough for 4 hours.

**Ranking rules:**

- `computePriority(order, now)` is a pure function.
- Weights, caps and buckets live in a single declarative `PRIORITY_RULES` object.
- Sorting and tie-break (§5.2) live in `compareQueue(a, b)`, in the same module.

**Status rules:**

- The state machine is a declarative table (data, not an if/else chain) plus one `transition(order, action)` function.
- The list of default-queue statuses comes from the same file.
- **Engineering decision (not a question):** the API returns `allowed_actions` on every queue item, derived from the same transition table. There is no action map in the frontend, and the state machine lives only on the server (§6, §8). This helps in §13: if the panel asks, for example, to allow `cancel` from `preparing`, only the transition table changes, and the button appears on screen by itself.

**Time and tests:**

- Each request uses a single UTC `now` (§5), injected through a `clock`. That same `now` drives the score and the displayed wait time.
- Priority tests MUST run without PostgreSQL and without Sequelize mocks (§9.1).
- Other Module tests should preferably also stay database-independent, when that keeps the design simpler. This is our recommendation, not a PDF requirement.

**Queue contract (queue item DTO):** the JSON must define the full contract of each item returned by `GET /orders/queue`, with everything the §8 table needs. The UI must not derive anything beyond formatting. Minimum fields:

- `id`, `score`, `customer_name`, `type`, `is_vip`, `status`, `promised_at`;
- `items` as `[{ name, quantity }]`; the UI only formats the summary (e.g. "2× Grilled Salmon, 1× Caesar Salad");
- `minutes_waiting`, computed by the API with the same `now` as the score;
- `allowed_actions`, derived from the transition table.

**UI:**

- Never recomputes score, order or valid actions (§8). It shows what the API returns, in the order the API returns it, and renders only the buttons listed in `allowed_actions`.
- After a successful transition, it refetches the queue with the current filter. It does not change score, order or status locally.
- If the new status is outside the active queue (`ready`, `cancelled`, `picked_up`), the row disappears naturally from the API response. The API is the source of truth for the queue.

</architecture_rules>

<code_documentation_rules>

The author must be able to explain every file and every function in the panel (§2). The JSON must require:

- **A header on every code file:** at most 4 lines at the top, stating what the file does, its layer and what it must NOT do.
- **JSDoc (API) / TSDoc (web) on every exported function:** purpose, parameters, return value and the PDF section it implements (`@see PDF §5.1`).
- **Fixed, searchable markers at the change points:**
  - `@rule-change RANKING` in the `PRIORITY_RULES` file;
  - `@rule-change STATUS` in the transition table;
  - the same markers in the matching tests.

  `grep -rn "@rule-change"` must list all of them.

- **A "Where to change the rules" section in the README:** a table of file → what changes → which test to update.
- **Comments explain the why.** They do not narrate the obvious line by line.

</code_documentation_rules>

<ai_transparency_rules>

The PDF (§2, §12.1) allows any AI tool but requires transparency. The JSON must require:

**`ai-logs/` folder:**

- Lives at the repository root and holds the full history of AI conversations (Markdown, JSON, screenshots).
- Besides the planning artifacts (see below), the executor creates only `ai-logs/README.md`, explaining what the author must export and how to name the files (e.g. `01-planning.md`, `02-T01-T04.md`).
- The executor NEVER writes, summarizes, cleans up, edits or invents conversation histories.
- Mistakes and failed attempts stay in the logs. The PDF says it does not penalize them and wants to see how the author steered and corrected the AI.
- The planning artifacts (this prompt, the JSON and PLAN.md) live in `ai-logs/00-planning/`. That way they also serve as evidence, without departing from the layout suggested in §14.
- If the final structure departs materially from the layout suggested in §14 (`api/src`, `web/src`, `ai-logs/`, root files), the reason goes into DECISIONS.md, as §14 itself asks. Example: a root `docs/` folder holding the PDF.

**`DECISIONS.md`:**

- Has the 6 sections from §12.1.
- The executor may draft Scope, Layers, Priority, Transitions and Next from what was built, marking each one with `<!-- AUTHOR: review and rewrite in your own words -->`.
- The AI section holds only the placeholder `<!-- AUTHOR: fill in -->`. The author writes it: one AI suggestion kept and one rejected or rewritten, quoting the idea (not the tool brand) and the reason.

**During execution:**

- Whenever the author rejects or rewrites a suggestion, the executor records it in 1 line of the task report (`author_overrides`). This is honest raw material for the AI section.
- At the end of each task, the executor reminds the author to export the session to `ai-logs/` and suggests the commit message `TNN: {task name}`, without pushing.

</ai_transparency_rules>

<task_planning_rules>

**Task format:**

- Each task ends in a runnable, tested state: vertical, incremental slices. In the Module, the test comes before the implementation.
- Each task takes 10 to 30 min.
- Each task lists the `REQ-NN` IDs it covers. Every mandatory REQ appears in at least one task.

**Recommended sequence.** Change the order only with a reason recorded in `decisions`:

1. monorepo scaffold + docker-compose + root scripts;
2. Schema (migrations + models);
3. priority Module (pure, TDD);
4. transitions Module (table, TDD);
5. Repository;
6. Endpoints + error middleware;
7. Seed;
8. web scaffold + API client;
9. Kitchen Display page;
10. README + DECISIONS.md + `ai-logs/README.md`;
11. panel rehearsal (§13):
    - from scratch: clean clone → the 4 commands from §9.4, with both apps booting in a few minutes;
    - change drill: on a throwaway branch, change one ranking weight and one transition, confirm with `git diff --stat` that only the rules file and its matching test changed, then discard the branch;
12. §11 extras, one task each, all optional.

**Time:** core tasks add up to at most 180 min. That leaves at least 60 min of the time box for this planning, the author's review and the AI section of DECISIONS.md. Extras are counted separately and only start once the core is done.

**Acceptance criteria** are observable and binary: a command and its expected result, an HTTP call with its expected status and body, or a visible on-screen state. No "works well", "is clean" or "is robust".

**Tests:**

- Every task with logic names its tests (file, framework and cases). Example: §5.3 examples A and B as literal fixtures, with `now = 2026-06-15T12:00:00Z`.
- Tests use their own fixtures and a frozen `now`, never the seed (§9.5).
- Include the case §12.1 will ask about: `start` on an order that is already `preparing` returns `INVALID_TRANSITION`.
- Score boundaries, grouped with `test.each` (a few lines, not dozens of tests):

  | Case                          | Expected                                |
  | ----------------------------- | --------------------------------------- |
  | 9 min 50 s wait               | 0 wait points (the §5.1 example itself) |
  | 10 min 00 s wait              | 5 wait points                           |
  | `promised_at` exactly +30 min | 25 pts                                  |
  | `promised_at` at +30 min 30 s | per the recorded bucket decision        |
  | `promised_at` exactly +60 min | 15 pts                                  |
  | overdue `promised_at`         | per the recorded decision               |
  | 14 min total prep             | 0 complexity points                     |
  | 15 min total prep             | 5 complexity points                     |

- Default queue across all 5 statuses, not just the 2 that §10 mentions: `received` and `preparing` are included; `ready`, `picked_up` and `cancelled` are excluded (the full §5 rule).
- `allowed_actions` per status, derived from the table: `received` → `start` and `cancel`; `preparing` → `ready`; `ready` → `pickup`; terminal statuses → none.

**API filter acceptance (§7).** Can be verified with `curl`, no automated HTTP test required:

- `GET /orders/queue` → only `received` and `preparing`, sorted by score;
- `GET /orders/queue?status=received` → only `received`;
- `GET /orders/queue?status=preparing` → only `preparing`;
- `GET /orders/queue?status=ready` → 400 `VALIDATION_ERROR` (or whatever the error decision defines).

**Seed (§9.5):**

- Prefer scenarios that stay valid for at least 1 h after `db:setup`. Example of a tie broken by `promised_at`: two orders with the same type, VIP flag, complexity and relative `placed_at`; one promised in 3 h and the other with no `promised_at`. Both score 0 on that component for about 2 h, and their wait points evolve identically.
- `db:setup` must be re-runnable, to refresh the relative dates before the panel.

</task_planning_rules>

<allowed_additions>

Beyond the PDF, you may only add items that make the specified behavior safer, faster, clearer or more verifiable, without creating features. Mark each one with `"origin": "engineering"`. Everything else is `"origin": "spec"`.

**Setup and versions:**

- npm workspaces + `concurrently`, for the single install and dev commands (§9.4);
- `.nvmrc` and `engines` set to Node 22;
- `.env.example` with defaults matching the §9.3 docker-compose;
- pinned versions in `package.json`: `@mui/material@^7` (+ Emotion) and `sequelize@^6`.

**Database and queries:**

- queue in a single eager-loaded query (orders + items + menu items), no N+1;
- _(preferred, only if it stays simple)_ a race-safe transition. The reviewer will look at the state machine and where it lives, not at race conditions. If included, use this order so 404 and 409 are never confused:
  1. load the order; if it does not exist → 404 `ORDER_NOT_FOUND`;
  2. `transition(order, action)` in the Module; if illegal → 409 `INVALID_TRANSITION`;
  3. `UPDATE ... WHERE id = ? AND status = {from}`; with 0 affected rows, the order existed but its status changed in the meantime → 409 `INVALID_TRANSITION`.
- index on `orders.status`;
- database constraints mirroring §4: FKs, unique name, `CHECK (quantity > 0)`, `CHECK (prep_time_minutes > 0)`, NOT NULL.

**API:**

- centralized error middleware mapping domain errors to stable codes;
- a single error body: `{ "error": { "code": string, "message": string } }`;
- validation of `:id` and `?status`;
- `minutes_waiting` in the queue response, computed with the same `now` as the score;
- `allowed_actions` on every queue item, derived from the transition table (see Status rules in `<architecture_rules>`).

**Web and tests:**

- Vite proxy to the API in dev, which removes the need for CORS;
- action button disabled while its request is in flight, which prevents a repeated transition on double click;
- a frozen-`now` helper for tests.

Any other product feature or technical dependency not required by the PDF nor explicitly allowed in `<allowed_additions>` is out of scope (§14). Architecture, documentation, testability and process rules defined in this prompt do not count as additional features.

</allowed_additions>

  <constraints>

**DO:**

- Treat the PDF as the only source of requirements and trace each one to its section.
- Keep the PDF's exact identifiers: field names, enum values, routes, ports (API 4000, web 5173, Postgres 5433), the §9.3 docker-compose and the layer names.
- Follow the §9 stack strictly: API in JavaScript (not TypeScript), web in TypeScript, Vitest and Playwright only for the extras.
- Keep exactly one repository containing both apps (`api` and `web`) (§9).
- `docker-compose.yml` starts PostgreSQL 16 only (§9.3). Do not containerize the API or the web app.
- Do not depend on private or external repositories (§9).
- If the folder structure departs materially from the §14 layout, explain why in DECISIONS.md.
- Write the JSON in English and keep it lean:
  - each fact appears once and is referenced by key or `REQ-NN` elsewhere in the file;
  - use lists and objects instead of paragraphs.
- Make the executor stop at the end of each task and run its acceptance checks and tests. It moves on only when everything passes. If a check fails twice, it stops and reports.
- Make the executor track time. If the core is at risk, it cuts extras first. It never cuts the §10 tests, the README or DECISIONS.md.

**DO NOT:**

- Invent requirements, fields, endpoints, statuses or screens. Do not invent error codes beyond what §7 needs, nor tools outside §9 and `<allowed_additions>`.
- Include anything §3 and §14 exclude: authentication, user accounts and roles, payments, a customer entity, pagination, real-time updates (WebSockets), Restify, Redis, background jobs, CI, Storybook, a design-system package, pixel-perfect visuals.
- Put score, sorting or transition rules in the frontend.
- Call `Date.now()` or argument-less `new Date()` inside `computePriority` or its tests.
- Use `sequelize.sync()`.
- Add state or data-fetching libraries to the frontend (Redux, TanStack Query…). `fetch` + a small hook are enough and easy to explain.
- Ask the executor to write the AI section of DECISIONS.md or to create or edit histories in `ai-logs/`.
- Guess. If neither the PDF nor the author answers something that changes behavior, it goes into `open_questions`, not into a task.

  </constraints>

<uncertainty_policy>

If essential information is missing to write the JSON (e.g. the PDF is missing or unreadable), state exactly what is missing and ask 2 to 3 objective questions before continuing.

If there is more than one reasonable option for an important decision:

- list the options;
- give pros and cons in one line each;
- ask the author to choose.

</uncertainty_policy>

<self_check>

Before replying, verify each item and report PASS or FAIL:

1. **Valid JSON:** `node -e "JSON.parse(require('fs').readFileSync('ai-logs/00-planning/kitchen-queue.prompt.json','utf8'))"` runs without error.
2. **Coverage:** every mandatory `REQ-NN` appears in some task's `covers`.
3. **Time:** core tasks add up to ≤ 180 min, and each task takes 10 to 30 min.
4. **Origin:** every object with `origin` has `section`. `origin: "spec"` objects have a PDF section; `origin: "engineering"` objects have `section: null` and are in `<allowed_additions>` or come from this prompt's architecture, documentation, testability and process rules.
5. **§5.3 examples:** examples A and B appear as test fixtures (A = 60, B = 60, B above A).
6. **§10 cases:** all appear as test cases:
   - both caps;
   - the 4 `promised_at` buckets;
   - the tie-break;
   - a lower-weight type winning on the rest of the formula;
   - every legal transition;
   - each illegal category (skipping a step, repeating, including `start` on `preparing`, leaving a terminal status);
   - the default queue across all 5 statuses: `received` and `preparing` included; `ready`, `picked_up` and `cancelled` excluded;
   - the score boundaries: 9 min 50 s and 10 min of wait, +30 min and +60 min of `promised_at`, 14 and 15 min of prep.
7. **Change points:** every file marked with `@rule-change` is in `context.code_conventions.rule_change_points`, with an associated test.
8. **Limits:** no field exceeds its character limit in `<output_format>`.
9. **Transparency:** no task asks the executor to write the AI section of DECISIONS.md or to create or edit histories in `ai-logs/`.
10. **Queue contract:** every column of the §8 table maps to a field in `context.queue_item_dto`, and the §7 filters appear in some task's acceptance criteria.

</self_check>

</task_rules>

<examples>

The `<good_example>` blocks show the expected format and level of detail. The `<bad_example>` block shows what NOT to do and must never be copied.

<good_example type="requirement">

```json
{
  "id": "REQ-14",
  "section": "§5.1",
  "category": "business_rule",
  "statement": "Wait-time points = min(40, floor(minutes_waiting / 10) * 5); minutes_waiting = whole minutes since placed_at, floored",
  "optional": false,
  "origin": "spec"
}
```

</good_example>

<good_example type="decision">

```json
{
  "id": "D-03",
  "topic": "Overdue promised_at",
  "choice": "Overdue counts as within 30 min (25 pts)",
  "rationale": "Overdue orders are the most urgent; time until promised_at is negative, so it is <= 30 min",
  "decided_by": "default"
}
```

</good_example>

<good_example type="api_contract">

```json
{
  "method": "POST",
  "path": "/orders/:id/start",
  "params": { "id": "positive integer" },
  "query": null,
  "section": "§7",
  "origin": "spec",
  "success": {
    "status": 200,
    "body_shape": "{ id, status } of the updated order; the UI refetches the queue"
  },
  "errors": [
    {
      "status": 400,
      "code": "VALIDATION_ERROR",
      "when": ":id is not a positive integer"
    },
    {
      "status": 404,
      "code": "ORDER_NOT_FOUND",
      "when": "No order with this id"
    },
    {
      "status": 409,
      "code": "INVALID_TRANSITION",
      "when": "Current status is not received (skip, repeat or terminal)"
    }
  ]
}
```

</good_example>

<good_example type="task">

```json
{
  "id": "T04",
  "name": "Priority module (pure, TDD)",
  "summary": "computePriority(order, now) and compareQueue(a, b) driven by one PRIORITY_RULES object",
  "minutes": 30,
  "optional": false,
  "covers": ["REQ-12", "REQ-13", "REQ-14", "REQ-15", "REQ-16", "REQ-17"],
  "depends_on": ["T01"],
  "files": [
    "api/src/modules/orders/priority.rules.js",
    "api/src/modules/orders/priority.js",
    "api/src/modules/orders/priority.test.js"
  ],
  "steps": [
    "Write failing Jest tests first, with §5.3 examples A and B as literal fixtures",
    "Implement as pure functions; no imports from Express, Sequelize or repositories",
    "Read every weight, cap and bucket from PRIORITY_RULES; no magic numbers in priority.js",
    "Add file headers, JSDoc with @see PDF §5.1/§5.2 and the @rule-change RANKING marker"
  ],
  "acceptance": [
    "`npm test -w api -- priority` passes with PostgreSQL stopped",
    "`grep -nE 'Date.now|new Date\\(\\)' api/src/modules/orders/priority.js` prints nothing",
    "`grep -rn '@rule-change RANKING' api/src` lists priority.rules.js and priority.test.js"
  ],
  "tests": [
    {
      "file": "api/src/modules/orders/priority.test.js",
      "framework": "jest",
      "cases": [
        "example A = 60",
        "example B = 60 and ranks above A",
        "wait cap at 40",
        "complexity cap at 20",
        "promised <=30 / 31-60 / >60 / null",
        "tie-break promised_at > placed_at > id",
        "delivery VIP with tight promise beats dine_in non-VIP"
      ]
    }
  ],
  "rule_change_surface": "A weight, cap or bucket change edits PRIORITY_RULES and one expectation in priority.test.js",
  "explain_in_panel": "Score is a pure function of (order, now): reproducible with a frozen now, and a ranking tweak never touches HTTP or SQL"
}
```

</good_example>

<good_example type="code_header">

This is the header format the JSON must require in the final code. It is not the implementation.

```js
/**
 * priority.rules.js | Layer: Module (pure data)
 * Single source of truth for ranking weights, caps and promise buckets (PDF §5.1).
 * Must not import Express, Sequelize or read the clock.
 * @rule-change RANKING: a ranking tweak edits this object + priority.test.js only.
 */
const PRIORITY_RULES = Object.freeze({
  typeWeights: { dine_in: 30, takeout: 20, delivery: 10 },
  vipBonus: 20,
  // ...
})
```

</good_example>

<bad_example type="task" reason="Too broad, vague acceptance, exceeds task size and invents JWT authentication">

**BAD EXAMPLE. DO NOT COPY.** It exists only to show what to avoid.

```json
{
  "name": "Build backend",
  "summary": "Create the API with good architecture and add JWT auth",
  "minutes": 120,
  "acceptance": ["API works well"]
}
```

Why it is bad:

- scope far too broad, with 120 min in a single task (the limit is 30);
- vague acceptance ("works well") and no `covers`, no `tests`, no `files`;
- invents JWT authentication, which §3 and §14 exclude.

</bad_example>

</examples>

<output_format>

<file>

**Path:** `ai-logs/00-planning/kitchen-queue.prompt.json`.

**Format rules:**

- UTF-8 and 2-space indentation;
- top-level keys in exactly this order, no extra keys and no comments;
- `requirements` sorted by ID and `tasks` in execution order;
- two-digit IDs (`REQ-01`, `T01`, `D-01`, `Q-01`, `UI-01`);
- no string contains a line break, except `folder_tree`;
- the "≤ N" limits are in characters.

**How to read the schema below:**

- Values that describe a type are placeholders and must be replaced with real values of that type. They are: `string ≤ N`, `integer…`, `boolean`, `HTTP_STATUS_INTEGER` and option lists separated by `|`.
- Example: `HTTP_STATUS_INTEGER` becomes a number such as 200, 201, 400, 404 or 409, defined by each endpoint's contract.
- All other values are literals and must be copied as they are: `meta.name`, `meta.version`, `meta.language`, `meta.source_of_truth`, `meta.time_box_minutes`, `meta.core_budget_minutes`, `ai_transparency.decisions_md_sections`, `rules_and_constraints.allowed_assumptions` and the whole `output` block.
- Every object with `origin` also has `section` and follows `<origin_rule>`.

```json
{
  "meta": {
    "name": "kitchen-display-queue-builder",
    "version": "1.0.0",
    "language": "en",
    "objective": "string ≤ 240",
    "source_of_truth": "./docs/take-home-kitchen-queue.pdf",
    "time_box_minutes": 240,
    "core_budget_minutes": 180
  },
  "role": {
    "persona": "string ≤ 300",
    "operating_principles": ["string ≤ 140 (max 6 items)"]
  },
  "context": {
    "domain_summary": "string ≤ 400",
    "grading_focus": ["string ≤ 140 (max 5 items)"],
    "stack": [
      {
        "name": "string",
        "version": "string",
        "scope": "api | web | db | test | tooling",
        "section": "§x.y | null",
        "origin": "spec | engineering"
      }
    ],
    "doc_facts": [
      {
        "library": "string",
        "context7_id": "string",
        "facts": ["string ≤ 160 (max 3 items)"]
      }
    ],
    "requirements": [
      {
        "id": "REQ-NN",
        "section": "§x.y | null",
        "category": "data | business_rule | api | ui | technical | seed | test | deliverable",
        "statement": "string ≤ 200",
        "optional": "boolean",
        "origin": "spec | engineering"
      }
    ],
    "entities": [
      {
        "name": "string",
        "table": "string",
        "fields": [
          { "name": "string", "type": "string", "rules": "string ≤ 120" }
        ],
        "relations": ["string ≤ 120"]
      }
    ],
    "business_rules": {
      "priority": {
        "config_file": "string",
        "pure_function_signature": "string",
        "components": [{ "name": "string", "formula": "string ≤ 160" }],
        "tie_break": ["string"],
        "edge_cases": ["string ≤ 140"]
      },
      "state_machine": {
        "table_file": "string",
        "transitions": [
          {
            "action": "start | ready | pickup | cancel",
            "from": "string",
            "to": "string",
            "endpoint": "string"
          }
        ],
        "terminal": ["string"],
        "active_queue_statuses": ["string"],
        "on_illegal": "string ≤ 160"
      }
    },
    "api_contracts": [
      {
        "method": "GET | POST",
        "path": "string",
        "params": "object | null",
        "query": "object | null",
        "section": "§x.y | null",
        "origin": "spec | engineering",
        "success": {
          "status": "HTTP_STATUS_INTEGER",
          "body_shape": "string ≤ 300"
        },
        "errors": [
          {
            "status": "HTTP_STATUS_INTEGER",
            "code": "UPPER_SNAKE",
            "when": "string ≤ 120"
          }
        ]
      }
    ],
    "queue_item_dto": {
      "endpoint": "GET /orders/queue",
      "fields": [
        {
          "name": "string",
          "type": "string",
          "computed_by": "api | db",
          "ui_column": "string (§8 column) | null",
          "section": "§x.y | null",
          "origin": "spec | engineering"
        }
      ]
    },
    "ux_ui_rules": [
      {
        "id": "UI-NN",
        "rule": "string ≤ 160",
        "section": "§x.y | null",
        "origin": "spec | engineering"
      }
    ],
    "quality_attributes": [
      {
        "attribute": "testability | explainability | changeability | consistency | performance",
        "requirement": "string ≤ 140",
        "how_verified": "string ≤ 140",
        "section": "§x.y | null",
        "origin": "spec | engineering"
      }
    ],
    "architecture": {
      "layers": [
        {
          "name": "Endpoint | Module | Repository | Schema | Web",
          "path": "string",
          "responsibility": "string ≤ 160",
          "must_not": ["string ≤ 120"]
        }
      ],
      "folder_tree": "string (indented tree, max 60 lines)"
    },
    "code_conventions": {
      "file_header": "string ≤ 200",
      "function_docs": "string ≤ 200",
      "rule_change_points": [
        {
          "marker": "@rule-change RANKING | @rule-change STATUS",
          "file": "string",
          "test_file": "string",
          "typical_change": "string ≤ 140"
        }
      ]
    },
    "ai_transparency": {
      "ai_logs": ["string ≤ 160"],
      "decisions_md_sections": [
        "Scope",
        "Layers",
        "Priority",
        "Transitions",
        "AI",
        "Next"
      ],
      "executor_must_not": ["string ≤ 160"]
    },
    "decisions": [
      {
        "id": "D-NN",
        "topic": "string",
        "choice": "string ≤ 160",
        "rationale": "string ≤ 200",
        "decided_by": "author | default"
      }
    ],
    "open_questions": [
      {
        "id": "Q-NN",
        "question": "string ≤ 200",
        "options": ["string ≤ 120"],
        "applied_default": "string ≤ 160"
      }
    ]
  },
  "tasks": [
    {
      "id": "TNN",
      "name": "string ≤ 60",
      "summary": "string ≤ 200",
      "minutes": "integer 10–30",
      "optional": "boolean",
      "covers": ["REQ-NN"],
      "depends_on": ["TNN"],
      "files": ["relative path"],
      "steps": ["imperative string ≤ 160 (max 6 items)"],
      "acceptance": ["binary check ≤ 160"],
      "tests": [
        {
          "file": "string",
          "framework": "jest | vitest | playwright",
          "cases": ["string ≤ 100"]
        }
      ],
      "rule_change_surface": "string ≤ 160 or null",
      "explain_in_panel": "string ≤ 200"
    }
  ],
  "rules_and_constraints": {
    "do": ["string ≤ 160"],
    "do_not": ["string ≤ 160"],
    "uncertainty_policy": "string ≤ 240",
    "gate_policy": "string ≤ 240",
    "time_policy": "string ≤ 240",
    "allowed_assumptions": ["only decisions with decided_by=default"]
  },
  "output": {
    "first_deliverable": "ai-logs/00-planning/PLAN.md rendered from tasks, then STOP for author approval",
    "plan_md_columns": [
      "ID",
      "Task",
      "Summary",
      "Minutes",
      "Covers",
      "Acceptance",
      "Tests"
    ],
    "per_task_report": {
      "format": "markdown",
      "fields": [
        "task_id",
        "status (done | blocked)",
        "files_changed",
        "commands_and_results",
        "deviations",
        "author_overrides",
        "reminder (export session to ai-logs/ + commit message)"
      ],
      "max_chars": 1200
    },
    "final_report": {
      "fields": [
        "requirements_coverage_table",
        "how_to_run (the 4 commands of §9.4)",
        "rule_change_points (grep output)",
        "extras_attempted_and_skipped",
        "known_gaps",
        "panel_readiness_checklist"
      ],
      "max_chars": 3000
    }
  }
}
```

</file>

<chat_reply>

After writing and validating the file, reply in English, in at most 1500 characters. Use exactly the template below, with nothing before or after it:

- start with the `**File:**` line;
- replace every `{placeholder}` with its real value;
- leave no `{}` braces in the reply.

```text
**File:** `ai-logs/00-planning/kitchen-queue.prompt.json`
**Coverage:** {total_requirements} requirements ({required_requirements} mandatory, all covered) · {core_tasks} core tasks ({core_minutes} min) + {extra_tasks} extras ({extra_minutes} min)
**Change points:** RANKING → `{ranking_file}` · STATUS → `{status_file}`
**Self-check:** 1 {PASS|FAIL} · 2 {PASS|FAIL} · 3 {PASS|FAIL} · 4 {PASS|FAIL} · 5 {PASS|FAIL} · 6 {PASS|FAIL} · 7 {PASS|FAIL} · 8 {PASS|FAIL} · 9 {PASS|FAIL} · 10 {PASS|FAIL}
**Default decisions:** one line per decision ({decision_id}: {choice})
**Open questions:** one line per question ({question_id}: {question}), or "none"
**Next step:** {one sentence on how to run the JSON in a fresh Claude Code session}
```

If you stopped at workflow step 4 to ask questions, reply ONLY with the questions (via AskUserQuestion, if available) and do not write the file yet.

</chat_reply>

</output_format>

# Playwright tests for an Angular component

A worked example: an Angular `TodoComponent` and one Playwright test around it
(`adds a todo with the Add button`), built with
**custom fixtures**, **Page Objects**, a **mocked backend** and **data factories**.

```
angular-playwright-demo/
├── playwright.config.ts              # runner config; starts `ng serve` for you
├── package.e2e.json                  # scripts + devDependencies to merge into package.json
├── src/app/
│   ├── app.routes.ts                 # /todos → TodoComponent
│   └── todo/
│       ├── todo.component.ts         # component under test (data-testid on every hook)
│       └── todo.service.ts           # HttpClient calls to /api/todos
└── e2e/
    ├── data/todo.factory.ts          # buildTodo(), sampleTodos()
    ├── fixtures/
    │   ├── mock-todo-api.ts          # in-memory fake backend via page.route()
    │   └── test-fixtures.ts          # test.extend(): initialTodos → api → todoPage
    ├── pages/
    │   ├── base.page.ts              # goto() + waitUntilReady() contract
    │   ├── todo.page.ts              # TodoPage: locators, actions, assertions
    │   └── components/
    │       └── todo-item.component.ts# TodoItem: one <li> row, scoped locators
    └── specs/
        └── todo-crud.spec.ts         # adds a todo with the Add button
```

## Setup

```bash
npm install
npx playwright install chromium firefox
npm start              # app at http://localhost:4200 + in-memory API (api/server.mjs) on :3000
npm run e2e            # headless, all browsers
npm run e2e:ui         # interactive UI mode — best way to watch the flow
```

`ng serve` proxies `/api` to the mock API (`proxy.conf.json`); its data resets on restart.
The Playwright tests don't use it — they fake the API per test with `page.route()`.

Angular 21 (Node `^20.19 || ^22.12 || >=24`). `@playwright/test` is pinned to `~1.60.0`
because newer releases no longer ship browsers for macOS 12.

`webServer` in the config runs `ng serve` automatically and reuses one already running locally.

---

## How the logic flows

For an interactive, step-by-step version of this section, open `docs/playwright-test-flow.html` in a browser.

### The four layers

| Layer | File(s) | Knows about | Never knows about |
|---|---|---|---|
| **Spec** | `specs/*.spec.ts` | business behaviour ("adding a todo clears the input") | selectors, HTTP routes |
| **Fixture** | `fixtures/test-fixtures.ts` | how to build and wire objects, setup/teardown order | what a test asserts |
| **Page Object** | `pages/*.ts` | `data-testid`s, how a user performs an action | test data, the backend |
| **Mock API** | `fixtures/mock-todo-api.ts` | HTTP contract of `/api/todos` | the DOM |

Each layer only talks to the one below it, so a markup change touches only a page object, and
an API change touches only the mock.

### Lifecycle of a single test

Take `test('adds a todo with the Add button', async ({ todoPage, api }) => { … })`.

```
1. Playwright reads the destructured args → needs `todoPage` and `api`.
2. Resolves the dependency graph declared in test-fixtures.ts:

      initialTodos (option, default sampleTodos())
            │
   page ────┼──▶ api ──────────▶ todoPage
 (built-in) │    seed + route     new TodoPage + goto('/todos')
            └────────────────────────▲

3. SETUP, in dependency order:
   a. page          – fresh browser context + tab (isolated cookies/storage per test)
   b. initialTodos  – the default list, or whatever test.use({ initialTodos }) set
   c. api           – new MockTodoApi(page) → seed(initialTodos) → page.route(/api/todos…)
                      ⚠ routes MUST exist before navigation; that's why todoPage depends on api
   d. todoPage      – new TodoPage(page) → goto('/todos') → waitUntilReady()

4. Angular boots in the browser:
   TodoComponent.ngOnInit → TodoService.list() → HttpClient GET /api/todos
        → intercepted by page.route → MockTodoApi.handle() → fulfill(json: store)
        → signal todos.set(...) → template re-renders → loading indicator removed
   waitUntilReady() sees the heading visible and `loading` hidden → fixture yields.

5. TEST BODY runs:
   todoPage.addTodo('Ship release')     → fill [data-testid=todo-input] + click [data-testid=add-button]
   Angular: add() → POST /api/todos {title} → mock stores it → 201 {id: 1001, …}
           → todos.update([...list, created]) → 4th row appears, input cleared
   expect(todoPage.items).toHaveCount(4) → auto-retrying expect until DOM matches
   todoPage.expectRemaining(3)          → footer reads "3 items left"
   api.requestsOf('POST')               → assert what the "server" received

6. TEARDOWN, reverse order:
   todoPage (nothing) → api: page.unrouteAll() → page/context closed
```

### Why the network is mocked rather than the Angular service

`page.route()` intercepts at the browser's network layer, so **everything real still runs**: the
component, signals, change detection, `HttpClient`, the service, the router. Only the server is
fake. That gives you:

- **Deterministic data** – every test starts from `initialTodos`, no shared DB.
- **Backend assertions** – `api.requestsOf('POST')[0].body` proves what the app sent.

To run against a real backend instead, drop the `api` fixture dependency and point `baseURL` at a
seeded environment.

### Overriding fixtures per test or block

```ts
test.describe('empty list', () => {
  test.use({ initialTodos: [] });                 // option fixture override
  test('shows empty state', async ({ todoPage }) => { … });
});

```

The mock only handles `GET` and `POST`, the two calls this test needs. Add `PATCH`/`DELETE`
branches to `MockTodoApi.handle()` when you write tests for toggling or deleting.

### Page Object conventions used here

- **Locators are created once in the constructor**; they're lazy, so no DOM lookup happens until used.
- **`data-testid` first**, role-based (`getByRole('heading')`) where it reads naturally.
  `testIdAttribute` is set in the config.
- **Actions read like user intent**: `addTodo('Ship release')`, not "fill input, click button".
- **Repeated assertions live on the page** (`expectRemaining(3)`), one-off assertions stay in the spec.
- **Component objects** (`TodoItem`) scope locators to one row: `itemAt(3).title` only looks
  inside the 4th `<li>`.

## Notes

- **Component-only testing**: this suite mounts the component through its route (E2E style),
  which is the officially supported Playwright path for Angular. If you want to mount components in
  isolation without routing, the community package `@sand4rt/experimental-ct-angular` offers
  `mount()`; the same page objects work there because they only take a `Page`/`Locator`.
- **Debugging**: `npm run e2e:debug` opens the inspector; failed CI runs keep a trace
  (`trace: 'on-first-retry'`) you can open with `npx playwright show-trace`.

import { test as base, expect } from '@playwright/test';
import { MockTodoApi } from './mock-todo-api';
import { TodoPage } from '../pages/todo.page';
import { TodoDto, sampleTodos } from '../data/todo.factory';

/**
 * Custom fixtures. A spec asks for what it needs by name:
 *
 *   test('…', async ({ todoPage, api }) => { … })
 *
 * and Playwright builds the dependency chain automatically:
 *
 *   page (built-in) ─▶ api (mock backend) ─▶ todoPage (page object, already opened)
 */
type TodoFixtures = {
  /** Data the mock backend starts with. Override per file/describe with test.use(). */
  initialTodos: TodoDto[];
  /** In-memory fake backend, routes installed before navigation. */
  api: MockTodoApi;
  /** Page object, already navigated to /todos and fully loaded. */
  todoPage: TodoPage;
};

export const test = base.extend<TodoFixtures>({
  // An "option" fixture: a plain value with a default, overridable via test.use().
  initialTodos: [sampleTodos(), { option: true }],

  api: async ({ page, initialTodos }, use) => {
    // ── setup ──
    const api = new MockTodoApi(page);
    api.seed(initialTodos);
    await api.install();

    await use(api); // ── the test body runs here ──

    // ── teardown ──
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  },

  todoPage: async ({ page, api }, use) => {
    // Depends on `api`, so the interceptor is guaranteed to exist before goto().
    void api;
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await use(todoPage);
  },
});

export { expect };

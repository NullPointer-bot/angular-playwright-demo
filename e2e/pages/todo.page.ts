import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { TodoItem } from './components/todo-item.component';

/**
 * Page Object for the TodoComponent at /todos.
 *
 * Rules this class follows:
 *  - Locators live here, never in specs.
 *  - Methods describe user intent ("addTodo"), not DOM steps.
 *  - `expect…` helpers wrap assertions that several specs repeat.
 */
export class TodoPage extends BasePage {
  protected readonly path = '/todos';

  readonly heading: Locator;
  readonly input: Locator;
  readonly addButton: Locator;
  readonly items: Locator;
  readonly loading: Locator;
  readonly remainingCount: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Todos' });
    this.input = page.getByTestId('todo-input');
    this.addButton = page.getByTestId('add-button');
    this.items = page.getByTestId('todo-item');
    this.loading = page.getByTestId('loading');
    this.remainingCount = page.getByTestId('remaining-count');
  }

  /** The page is "ready" once the loading indicator has gone. */
  protected override async waitUntilReady(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.loading).toBeHidden();
  }

  // ---------- Actions ----------

  async addTodo(title: string): Promise<void> {
    await this.input.fill(title);
    await this.addButton.click();
  }

  /** Get a row by position (0-based). */
  itemAt(index: number): TodoItem {
    return new TodoItem(this.items.nth(index));
  }

  // ---------- Assertions ----------

  async expectRemaining(count: number): Promise<void> {
    await expect(this.remainingCount).toHaveText(`${count} item${count === 1 ? '' : 's'} left`);
  }
}

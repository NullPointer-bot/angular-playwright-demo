import { Locator } from '@playwright/test';

/**
 * Component object for ONE row in the list.
 * Scoped to its own <li>, so its locators never match an element in another row.
 */
export class TodoItem {
  readonly title: Locator;

  constructor(readonly root: Locator) {
    this.title = root.getByTestId('todo-title');
  }
}

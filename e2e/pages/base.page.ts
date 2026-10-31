import { Page } from '@playwright/test';

/**
 * Shared behaviour for every page object.
 * Concrete pages declare their own `path` and locators.
 */
export abstract class BasePage {
  protected abstract readonly path: string;

  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitUntilReady();
  }

  /** Override to wait for whatever signals "this page has rendered". */
  protected async waitUntilReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }
}

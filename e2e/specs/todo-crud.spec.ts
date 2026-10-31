import { test, expect } from '../fixtures/test-fixtures';

test.describe('Todo component – add', () => {
  test('adds a todo with the Add button', async ({ todoPage, api }) => {
    await todoPage.addTodo('Ship release');

    // UI updated
    await expect(todoPage.items).toHaveCount(4);
    await expect(todoPage.itemAt(3).title).toHaveText('Ship release');
    await expect(todoPage.input).toHaveValue(''); // input cleared
    await todoPage.expectRemaining(3);

    // Backend received the right payload
    expect(api.requestsOf('POST')).toHaveLength(1);
    expect(api.requestsOf('POST')[0].body).toEqual({ title: 'Ship release' });
  });
});

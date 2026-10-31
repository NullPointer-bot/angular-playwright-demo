/**
 * Test-data builders. Specs describe *what* data they need,
 * not how to construct JSON by hand.
 */
export interface TodoDto {
  id: number;
  title: string;
  completed: boolean;
}

let nextId = 1;

export function buildTodo(overrides: Partial<TodoDto> = {}): TodoDto {
  const id = overrides.id ?? nextId++;
  return { id, title: `Todo ${id}`, completed: false, ...overrides };
}

/** A ready-made mixed list: 3 todos, 1 completed. */
export const sampleTodos = (): TodoDto[] => [
  buildTodo({ id: 101, title: 'Buy milk', completed: false }),
  buildTodo({ id: 102, title: 'Write Playwright tests', completed: true }),
  buildTodo({ id: 103, title: 'Review PR', completed: false }),
];

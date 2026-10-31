import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Todo, TodoService } from './todo.service';

export type Filter = 'all' | 'active' | 'completed';

/**
 * Component under test.
 * Every element the tests touch carries a `data-testid` so selectors survive
 * CSS / markup refactors.
 */
@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="todo-app">
      <h1>Todos</h1>

      <form data-testid="todo-form" (ngSubmit)="add()">
        <input
          data-testid="todo-input"
          name="title"
          placeholder="What needs to be done?"
          [(ngModel)]="newTitle"
          maxlength="100"
        />
        <button data-testid="add-button" type="submit" [disabled]="!canAdd()">Add</button>
      </form>

      @if (error()) {
        <p data-testid="error-message" role="alert" class="error">{{ error() }}</p>
      }

      @if (loading()) {
        <p data-testid="loading">Loading…</p>
      } @else {
        <ul data-testid="todo-list">
          @for (todo of visibleTodos(); track todo.id) {
            <li data-testid="todo-item" [class.completed]="todo.completed">
              <input
                type="checkbox"
                data-testid="todo-toggle"
                [checked]="todo.completed"
                (change)="toggle(todo, $event)"
              />
              <span data-testid="todo-title">{{ todo.title }}</span>
              <button data-testid="todo-delete" (click)="remove(todo)" aria-label="Delete">✕</button>
            </li>
          } @empty {
            <li data-testid="empty-state">Nothing to show</li>
          }
        </ul>
      }

      <footer>
        <span data-testid="remaining-count">{{ remaining() }} item{{ remaining() === 1 ? '' : 's' }} left</span>
        <nav>
          @for (f of filters; track f) {
            <button
              [attr.data-testid]="'filter-' + f"
              [class.active]="filter() === f"
              [attr.aria-pressed]="filter() === f"
              (click)="filter.set(f)"
            >{{ f }}</button>
          }
        </nav>
      </footer>
    </section>
  `,
})
export class TodoComponent implements OnInit {
  private readonly api = inject(TodoService);

  readonly filters: Filter[] = ['all', 'active', 'completed'];

  readonly todos = signal<Todo[]>([]);
  readonly filter = signal<Filter>('all');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  newTitle = '';

  readonly visibleTodos = computed(() => {
    const f = this.filter();
    return this.todos().filter(t =>
      f === 'all' ? true : f === 'active' ? !t.completed : t.completed,
    );
  });

  readonly remaining = computed(() => this.todos().filter(t => !t.completed).length);

  canAdd(): boolean {
    return this.newTitle.trim().length > 0;
  }

  ngOnInit(): void {
    this.api.list().subscribe({
      next: todos => {
        this.todos.set(todos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load todos');
        this.loading.set(false);
      },
    });
  }

  add(): void {
    const title = this.newTitle.trim();
    if (!title) return;
    this.api.create(title).subscribe({
      next: created => {
        this.todos.update(list => [...list, created]);
        this.newTitle = '';
        this.error.set(null);
      },
      error: () => this.error.set('Could not save todo'),
    });
  }

  toggle(todo: Todo, event?: Event): void {
    const checkbox = event?.target as HTMLInputElement | undefined;
    this.api.update(todo.id, { completed: !todo.completed }).subscribe({
      next: updated =>
        this.todos.update(list => list.map(t => (t.id === updated.id ? updated : t))),
      error: () => {
        // The browser already flipped the native checkbox; put it back,
        // otherwise the UI would lie about the saved state.
        if (checkbox) checkbox.checked = todo.completed;
        this.error.set('Could not update todo');
      },
    });
  }

  remove(todo: Todo): void {
    this.api.remove(todo.id).subscribe({
      next: () => this.todos.update(list => list.filter(t => t.id !== todo.id)),
      error: () => this.error.set('Could not delete todo'),
    });
  }
}

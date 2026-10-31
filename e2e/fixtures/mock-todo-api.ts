import { Page, Route, Request } from '@playwright/test';
import { TodoDto } from '../data/todo.factory';

type Method = 'GET' | 'POST';

/**
 * An in-memory fake of the /api/todos backend, wired in with page.route().
 *
 * Why: the component's behaviour depends on HTTP responses. Faking them at the
 * network layer lets tests control data precisely, while the real Angular
 * HttpClient, service and component code all still run unchanged.
 */
export class MockTodoApi {
  private store = new Map<number, TodoDto>();
  private idSeq = 1000;

  /** Every request the app made, for assertions like "a POST was sent". */
  readonly requests: { method: string; url: string; body: unknown }[] = [];

  constructor(private readonly page: Page) {}

  /** Attach the network interceptor. Must run BEFORE page.goto(). */
  async install(): Promise<void> {
    await this.page.route(/\/api\/todos(\?.*)?$/, route => this.handle(route));
  }

  // ---------- Arrange helpers used by specs ----------

  seed(todos: TodoDto[]): this {
    this.store = new Map(todos.map(t => [t.id, { ...t }]));
    return this;
  }

  requestsOf(method: Method) {
    return this.requests.filter(r => r.method === method);
  }

  // ---------- Request handling ----------

  private async handle(route: Route): Promise<void> {
    const req = route.request();
    const method = req.method() as Method;
    this.requests.push({ method, url: req.url(), body: this.body(req) });

    switch (method) {
      case 'GET':
        return route.fulfill({ json: [...this.store.values()] });

      case 'POST': {
        const { title } = this.body(req) as { title: string };
        const todo: TodoDto = { id: ++this.idSeq, title, completed: false };
        this.store.set(todo.id, todo);
        return route.fulfill({ status: 201, json: todo });
      }

      default:
        return route.fallback();
    }
  }

  private body(req: Request): unknown {
    try {
      return req.postDataJSON();
    } catch {
      return undefined;
    }
  }
}

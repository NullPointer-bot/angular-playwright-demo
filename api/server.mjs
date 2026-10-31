/**
 * Tiny in-memory backend for local development (`npm start`).
 * Implements the same /api/todos contract the Playwright mock fakes.
 * Data resets whenever the process restarts.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.API_PORT ?? 3000);

let idSeq = 3;
const todos = new Map([
  [1, { id: 1, title: 'Buy milk', completed: false }],
  [2, { id: 2, title: 'Write Playwright tests', completed: true }],
  [3, { id: 3, title: 'Review PR', completed: false }],
]);

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(data === undefined ? '' : JSON.stringify(data));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const match = pathname.match(/^\/api\/todos(?:\/(\d+))?\/?$/);
  if (!match) return send(res, 404, { message: 'Not found' });
  const id = match[1] ? Number(match[1]) : undefined;

  if (id === undefined && req.method === 'GET') return send(res, 200, [...todos.values()]);

  if (id === undefined && req.method === 'POST') {
    const title = String((await readJson(req)).title ?? '').trim();
    if (!title) return send(res, 400, { message: 'Title is required' });
    const todo = { id: ++idSeq, title, completed: false };
    todos.set(todo.id, todo);
    return send(res, 201, todo);
  }

  if (id !== undefined && req.method === 'PATCH') {
    const existing = todos.get(id);
    if (!existing) return send(res, 404, { message: 'Not found' });
    const { title, completed } = await readJson(req);
    const updated = {
      ...existing,
      ...(typeof title === 'string' && { title }),
      ...(typeof completed === 'boolean' && { completed }),
    };
    todos.set(id, updated);
    return send(res, 200, updated);
  }

  if (id !== undefined && req.method === 'DELETE') {
    return todos.delete(id) ? send(res, 204) : send(res, 404, { message: 'Not found' });
  }

  send(res, 405, { message: 'Method not allowed' });
})
  .on('error', err => {
    console.error(`Mock API could not start on port ${PORT}: ${err.message}`);
    process.exit(1);
  })
  .listen(PORT, () => console.log(`Mock API listening on http://localhost:${PORT}/api/todos`));

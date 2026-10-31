/**
 * `npm start`: runs the mock API and `ng serve` together.
 * If either one exits (or you press Ctrl+C), the other is stopped too,
 * so no orphaned server is left holding a port.
 */
import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['api/server.mjs'], { stdio: 'inherit' }),
  spawn('npx', ['ng', 'serve', ...process.argv.slice(2)], { stdio: 'inherit' }),
];

let exiting = false;
function stopAll(code) {
  if (exiting) return;
  exiting = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
}

for (const child of children) child.on('exit', code => stopAll(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stopAll(0));

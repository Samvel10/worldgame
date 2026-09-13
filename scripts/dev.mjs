import { spawn } from 'node:child_process';
const children = [
  spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], {
    stdio: 'inherit',
  }),
];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
}
for (const child of children) child.once('exit', () => stop());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

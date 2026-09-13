import { spawn } from 'node:child_process';
import WebSocket from 'ws';
const port = 19878;
const server = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PORT: String(port), BARRIK_DATA_DIR: `/tmp/barrik-battle-test-${process.pid}` }, stdio: 'ignore' });
const wait = (ws, predicate) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Battle message timeout')), 5000);
  ws.on('message', function handler(data) { const message = JSON.parse(data.toString()); if (predicate(message)) { clearTimeout(timer); ws.off('message', handler); resolve(message); } });
});
try {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const a = new WebSocket(`ws://127.0.0.1:${port}`); const b = new WebSocket(`ws://127.0.0.1:${port}`);
  const helloA = wait(a, m => m.type === 'hello'); const helloB = wait(b, m => m.type === 'hello');
  await Promise.all([helloA, helloB]);
  a.send(JSON.stringify({ type: 'guest', name: 'Ani' })); b.send(JSON.stringify({ type: 'guest', name: 'Aram' }));
  await Promise.all([wait(a, m => m.type === 'session'), wait(b, m => m.type === 'session')]);
  a.send(JSON.stringify({ type: 'create_room', maxPlayers: 2 })); const created = await wait(a, m => m.type === 'room_created');
  b.send(JSON.stringify({ type: 'join_room', roomId: created.roomId }));
  await Promise.all([wait(a, m => m.type === 'room_state' && m.players.length === 2), wait(b, m => m.type === 'room_state' && m.players.length === 2)]);
  console.log(`Battle smoke test passed: room ${created.roomId}, 2 players connected`);
  a.close(); b.close();
} finally { server.kill('SIGTERM'); }

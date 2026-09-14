import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
const data = await mkdtemp(join(tmpdir(), 'barrik-test-'));
const child = spawn(process.execPath, ['server/index.mjs'], {
  env: { ...process.env, PORT: '0', NODE_ENV: 'test', BARRIK_DATA_DIR: data },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const port = await new Promise((resolve, reject) => {
  child.stdout.on('data', (d) => {
    const m = /listening (\d+)/.exec(d.toString());
    if (m) resolve(m[1]);
  });
  child.once('exit', () => reject(Error('Server startup failed')));
  child.stderr.on('data', (d) => process.stderr.write(d));
});
const base = `http://127.0.0.1:${port}`;
const clients = [];
function client(cookie = '') {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`, { headers: { cookie } });
  clients.push(ws);
  const inbox = [],
    waiting = [];
  ws.on('message', (d) => {
    const m = JSON.parse(d);
    const i = waiting.findIndex((w) => w.test(m));
    if (i < 0) inbox.push(m);
    else {
      const w = waiting.splice(i, 1)[0];
      clearTimeout(w.timer);
      w.resolve(m);
    }
  });
  const wait = (test) => {
    const i = inbox.findIndex(test);
    if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const item = { test, resolve };
      item.timer = setTimeout(() => reject(Error('Timeout: ' + test.toString())), 4000);
      waiting.push(item);
    });
  };
  return { ws, wait, send: (type, extra = {}) => ws.send(JSON.stringify({ type, ...extra })) };
}
async function api(route, body, cookie = '') {
  const r = await fetch(base + '/api/' + route, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get('set-cookie')?.split(';')[0],
  };
}
try {
  const a = client(),
    b = client();
  await Promise.all([a.wait((m) => m.type === 'hello'), b.wait((m) => m.type === 'hello')]);
  a.send('create_room');
  const room = (await a.wait((m) => m.type === 'room_created')).roomId;
  b.send('join_room', { roomId: room });
  await a.wait((m) => m.type === 'room_state' && m.players.length === 2);
  a.send('start_battle');
  const first = await a.wait((m) => m.type === 'round_started');
  const second = await b.wait((m) => m.type === 'round_started');
  assert.equal(first.deadline, second.deadline);
  assert.equal(first.seed, undefined);
  assert.equal(first.answer, undefined);
  a.send('start_battle');
  assert.equal((await a.wait((m) => m.type === 'error')).code, 'phase');
  a.send('submit_guess', { guess: 'abc' });
  assert.equal((await a.wait((m) => m.type === 'error')).code, 'armenianOnly');
  a.send('submit_guess', { guess: 'աբգդե' });
  assert.equal((await a.wait((m) => m.type === 'error')).code, 'notInDictionary');
  const answers = JSON.parse(await readFile('src/data/answers.json', 'utf8'));
  const len = (s) => (s.match(/ու|և|[ա-ֆ]/g) ?? []).length;
  for (let round = 0; round < 4; round++) {
    const config =
      round === 0 ? first : await a.wait((m) => m.type === 'round_started' && m.round === round);
    if (round) await b.wait((m) => m.type === 'round_started' && m.round === round);
    const answer = answers.find(
      (e) => e.difficulty === config.level && len(e.word) === config.length,
    ).word;
    a.send('submit_guess', { guess: answer });
    const result = await a.wait((m) => m.type === 'guess_result');
    assert(result.marks.every((m) => m === 'correct'));
    b.send('submit_guess', { guess: answer });
    await b.wait((m) => m.type === 'guess_result');
    await a.wait((m) => m.type === 'round_finished' && m.round === round);
  }
  const end = await a.wait((m) => m.type === 'room_state' && m.phase === 'finished');
  assert.equal(end.players[0].solvedCount, 4);
  a.send('leave_room');
  b.send('leave_room');
  await a.wait((m) => m.type === 'left');
  await b.wait((m) => m.type === 'left');
  const account = await api('register', {
    username: 'test-user',
    password: 'a-good-test-password',
    name: 'Tester',
  });
  assert.equal(account.status, 200);
  assert(account.cookie);
  assert.equal((await api('session', null, account.cookie)).data.user.id, 'test-user');
  assert.equal(
    (await api('register', { username: 'test-user', password: 'a-good-test-password' })).status,
    409,
  );
  assert.equal(
    (await api('login', { username: 'test-user', password: 'wrong-password' })).status,
    401,
  );
  const login = await api('login', { username: 'test-user', password: 'a-good-test-password' });
  assert.equal(login.status, 200);
  const c = client(login.cookie);
  const session = await c.wait((m) => m.type === 'session');
  assert.equal(session.user.guest, false);
  assert.equal((await api('logout', {}, login.cookie)).status, 200);
  assert.equal((await api('session', null, login.cookie)).data.user, null);
  // New account-store instance proves disk-backed session restoration, not just in-memory state.
  const { accountStore } = await import('../server/accounts.mjs');
  assert.equal(accountStore(data).session({ headers: { cookie: account.cookie } }).id, 'test-user');
  a.send('quick_match', { maxPlayers: 3 });
  const publicRoom = (await a.wait((m) => m.type === 'room_created')).roomId;
  b.send('quick_match', { maxPlayers: 3 });
  await b.wait((m) => m.type === 'room_state' && m.roomId === publicRoom);
  const d = client(account.cookie);
  await d.wait((m) => m.type === 'session');
  d.send('join_room', { roomId: publicRoom });
  await a.wait((m) => m.type === 'room_state' && m.players.length === 3);
  a.send('start_battle');
  await a.wait((m) => m.type === 'round_started');
  await b.wait((m) => m.type === 'round_started');
  await d.wait((m) => m.type === 'round_started');
  const answer = answers.find((e) => e.difficulty === 'easy' && len(e.word) === 5).word;
  const wrongs = answers.filter((e) => len(e.word) === 5 && e.word !== answer).slice(0, 7);
  for (const word of wrongs) {
    a.send('submit_guess', { guess: word.word });
    const result = await a.wait((m) => m.type === 'guess_result');
    if (word === wrongs.at(-1)) assert.equal(result.finished, true);
  }
  a.send('submit_guess', { guess: answer });
  assert.equal((await a.wait((m) => m.type === 'error')).code, 'phase');
  b.send('submit_guess', { guess: answer });
  d.send('submit_guess', { guess: answer });
  await a.wait((m) => m.type === 'round_finished');
  a.send('leave_room');
  b.send('leave_room');
  d.send('leave_room');
  await Promise.all([
    a.wait((m) => m.type === 'left'),
    b.wait((m) => m.type === 'left'),
    d.wait((m) => m.type === 'left'),
  ]);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const health = await (await fetch(base)).json();
  assert.equal(health.rooms, 0);
  const timedHost = client(),
    timedPeer = client();
  await Promise.all([
    timedHost.wait((m) => m.type === 'hello'),
    timedPeer.wait((m) => m.type === 'hello'),
  ]);
  timedHost.send('create_room', { roundSeconds: -1 });
  assert.equal((await timedHost.wait((m) => m.type === 'error')).code, 'duration');
  timedHost.send('create_room', { roundSeconds: 1 });
  const timedId = (await timedHost.wait((m) => m.type === 'room_created')).roomId;
  timedPeer.send('join_room', { roomId: timedId });
  await timedHost.wait((m) => m.type === 'room_state' && m.players.length === 2);
  timedHost.send('start_battle');
  const timed = await timedHost.wait((m) => m.type === 'round_started');
  assert.equal(timed.deadline - timed.startedAt, 1000);
  await timedHost.wait((m) => m.type === 'round_finished');
  const expired = await timedHost.wait((m) => m.type === 'room_state' && m.phase === 'between');
  assert.ok(expired.players.every((p) => p.finished && p.totalTimeMs === 1000));
  timedHost.send('leave_room');
  timedPeer.send('leave_room');
  await Promise.all([
    timedHost.wait((m) => m.type === 'left'),
    timedPeer.wait((m) => m.type === 'left'),
  ]);
  timedHost.send('create_room', { roundSeconds: 0 });
  const unlimitedId = (await timedHost.wait((m) => m.type === 'room_created')).roomId;
  timedPeer.send('join_room', { roomId: unlimitedId });
  await timedHost.wait(
    (m) => m.type === 'room_state' && m.roomId === unlimitedId && m.players.length === 2,
  );
  timedHost.send('start_battle');
  let previousTotal = 0;
  for (let i = 0; i < 4; i++) {
    const config = await timedHost.wait((m) => m.type === 'round_started' && m.round === i);
    assert.equal(config.deadline, null);
    if (i === 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    const word = answers.find(
      (w) => w.difficulty === config.level && len(w.word) === config.length,
    ).word;
    timedHost.send('submit_guess', { guess: word });
    await timedHost.wait((m) => m.type === 'guess_result' && m.correct);
    const early = await timedHost.wait(
      (m) =>
        m.type === 'room_state' &&
        m.roomId === unlimitedId &&
        m.round === i &&
        m.phase === 'playing' &&
        m.players.some((p) => p.solved),
    );
    const fast = early.players.find((p) => p.solved);
    assert.ok(fast.totalTimeMs >= previousTotal);
    await new Promise((resolve) => setTimeout(resolve, 50));
    timedPeer.send('submit_guess', { guess: word });
    await timedHost.wait((m) => m.type === 'round_finished' && m.round === i);
    const end = await timedHost.wait(
      (m) =>
        m.type === 'room_state' &&
        m.round === i &&
        (m.phase === 'between' || m.phase === 'finished'),
    );
    assert.equal(end.players.find((p) => p.id === fast.id).totalTimeMs, fast.totalTimeMs);
    assert.ok(end.players.find((p) => p.id !== fast.id).totalTimeMs > fast.totalTimeMs);
    previousTotal = fast.totalTimeMs;
  }
  timedHost.send('leave_room');
  timedPeer.send('leave_room');
  await Promise.all([
    timedHost.wait((m) => m.type === 'left'),
    timedPeer.wait((m) => m.type === 'left'),
  ]);
  assert.equal((await (await fetch(base)).json()).rooms, 0);
  const partialA = client(),
    partialB = client();
  await Promise.all([
    partialA.wait((m) => m.type === 'hello'),
    partialB.wait((m) => m.type === 'hello'),
  ]);
  partialA.send('create_room', { roundSeconds: 2 });
  const partialRoom = (await partialA.wait((m) => m.type === 'room_created')).roomId;
  partialB.send('join_room', { roomId: partialRoom });
  await partialA.wait((m) => m.type === 'room_state' && m.players.length === 2);
  partialA.send('start_battle');
  await partialA.wait((m) => m.type === 'round_started');
  partialA.send('submit_guess', { guess: 'անալի' });
  const discovery = await partialA.wait((m) => m.type === 'guess_result');
  assert.deepEqual(discovery.marks, ['correct', 'correct', 'absent', 'absent', 'absent']);
  assert.equal(discovery.score, 195);
  partialA.send('submit_guess', { guess: 'ԱՆԱԼԻ' });
  assert.equal((await partialA.wait((m) => m.type === 'error')).code, 'repeated');
  partialA.send('submit_guess', { guess: 'անամպ' });
  const repeatedGreens = await partialA.wait((m) => m.type === 'guess_result');
  assert.equal(repeatedGreens.scoreDelta, -5);
  assert.equal(repeatedGreens.score, 190);
  partialB.send('submit_guess', { guess: 'լարել' });
  const yellow = await partialB.wait((m) => m.type === 'guess_result');
  assert.equal(yellow.score, 75);
  for (let i = 0; i < 4; i++)
    await partialA.wait((m) => m.type === 'round_finished' && m.round === i);
  const result = await partialA.wait((m) => m.type === 'room_state' && m.phase === 'finished');
  assert.ok(result.players.every((p) => p.solvedCount === 0));
  assert.deepEqual(
    result.players.map((p) => p.score),
    [190, 75],
  );
  partialA.send('leave_room');
  partialB.send('leave_room');
  await Promise.all([
    partialA.wait((m) => m.type === 'left'),
    partialB.wait((m) => m.type === 'left'),
  ]);
  console.log(
    'PASS: zero-solve match retains partial points; repeated normalized word rejected; repeated greens not rewarded twice.',
  );
  console.log(
    'PASS: configurable deadline, invalid duration, timeout accounting, unlimited four rounds, cumulative frozen player time and cleanup.',
  );
  console.log(
    'PASS: two guest clients, authoritative start, four rounds, secret privacy, validation, duplicate start, cleanup, register/login/cookie restore/logout.',
  );
} finally {
  for (const ws of clients) ws.terminate();
  child.kill();
  await new Promise((resolve) => child.once('exit', resolve));
  await rm(data, { recursive: true, force: true });
}

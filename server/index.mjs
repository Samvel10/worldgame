import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { randomBytes, randomInt } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { roundDuration, elapsedRound, comparePlayers } from '../shared/battle-rules.mjs';
import { accountStore } from './accounts.mjs';
const store = accountStore(process.env.BARRIK_DATA_DIR ?? path.resolve('server/data'));
const normalize = (s) => s.normalize('NFC').toLowerCase().replace(/եւ|եվ/g, 'և');
const letters = (s) => normalize(s).match(/ու|և|[ա-ֆ]/g) ?? [];
const answers = JSON.parse(fs.readFileSync('src/data/answers.json', 'utf8'));
const dictionary = new Set(
  JSON.parse(fs.readFileSync('src/data/accepted.json', 'utf8')).map(normalize),
);
const rounds = [
  { level: 'easy', length: 5, attempts: 7 },
  { level: 'medium', length: 7, attempts: 6 },
  { level: 'hard', length: 10, attempts: 5 },
  { level: 'expert', length: 14, attempts: 6 },
];
const defaultDuration =
  process.env.NODE_ENV === 'test' ? Number(process.env.ROUND_MS ?? 10000) : 90000;
const pause = process.env.NODE_ENV === 'test' ? 100 : 4000;
const rooms = new Map(),
  sockets = new Set();
function send(ws, m) {
  if (ws?.readyState === 1) ws.send(JSON.stringify(m));
}
function broadcast(room, m) {
  for (const p of room.players.values()) send(p.socket, m);
}
function snapshot(room) {
  return {
    type: 'room_state',
    roomId: room.id,
    hostId: room.hostId,
    phase: room.phase,
    round: room.round,
    totalRounds: 4,
    maxPlayers: room.maxPlayers,
    roundSeconds: room.duration / 1000,
    serverNow: Date.now(),
    players: [...room.players.values()].map(
      ({ id, name, score, solved, finished, socket, solvedCount, totalTimeMs }) => ({
        id,
        name,
        score,
        solved,
        finished,
        solvedCount,
        totalTimeMs,
        connected: socket?.readyState === 1,
      }),
    ),
  };
}
function publish(room) {
  broadcast(room, snapshot(room));
}
function remove(ws) {
  const room = rooms.get(ws.roomId);
  ws.roomId = null;
  if (!room) return;
  const p = [...room.players.values()].find((p) => p.socket === ws);
  if (!p) return;
  if (room.phase === 'lobby') {
    room.players.delete(p.id);
    if (room.hostId === p.id) room.hostId = room.players.keys().next().value;
  } else {
    if (room.phase === 'playing') settleTime(room, p);
    p.socket = null;
    p.finished = true;
  }
  if (![...room.players.values()].some((p) => p.socket?.readyState === 1)) {
    clearTimeout(room.timer);
    rooms.delete(room.id);
    return;
  }
  publish(room);
  if (room.phase === 'playing' && [...room.players.values()].every((p) => p.finished)) finish(room);
}
function evaluate(guess, answer) {
  const a = letters(answer),
    g = letters(guess),
    marks = g.map(() => 'absent'),
    counts = {};
  a.forEach((c, i) => {
    if (c === g[i]) marks[i] = 'correct';
    else counts[c] = (counts[c] ?? 0) + 1;
  });
  g.forEach((c, i) => {
    if (marks[i] !== 'correct' && counts[c] > 0) {
      marks[i] = 'present';
      counts[c]--;
    }
  });
  return marks;
}
function settleTime(room, player) {
  if (player.roundTimeMs !== null) return;
  player.roundTimeMs = elapsedRound(room.startedAt, room.deadline, Date.now());
  player.totalTimeMs += player.roundTimeMs;
}
function start(room) {
  if (!rooms.has(room.id)) return;
  clearTimeout(room.timer);
  const config = rounds[room.round];
  const pool = answers.filter(
    (e) => e.difficulty === config.level && letters(e.word).length === config.length,
  );
  // Existing answer entries use difficulty; fail loudly if a pool ever becomes empty.
  const selected = pool[process.env.NODE_ENV === 'test' ? 0 : randomInt(pool.length)];
  room.answer = normalize(selected.word);
  room.phase = 'playing';
  room.startedAt = Date.now();
  room.deadline = room.duration === 0 ? null : room.startedAt + room.duration;
  for (const p of room.players.values()) {
    p.solved = false;
    p.finished = p.socket?.readyState !== 1;
    p.guesses = [];
    p.roundTimeMs = p.finished ? 0 : null;
  }
  broadcast(room, {
    type: 'round_started',
    round: room.round,
    ...config,
    deadline: room.deadline,
    startedAt: room.startedAt,
  });
  publish(room);
  room.timer = room.duration === 0 ? null : setTimeout(() => finish(room), room.duration);
}
function finish(room) {
  if (room.phase !== 'playing') return;
  clearTimeout(room.timer);
  for (const p of room.players.values()) {
    settleTime(room, p);
    p.finished = true;
  }
  room.phase = room.round === 3 ? 'finished' : 'between';
  broadcast(room, { type: 'round_finished', round: room.round, answer: room.answer });
  publish(room);
  if (room.phase === 'finished') {
    const ranking = [...room.players.values()].sort(comparePlayers);
    for (const p of ranking)
      if (!p.guest)
        store.record(p.accountId, {
          at: new Date().toISOString(),
          roomId: room.id,
          score: p.score,
          totalTimeMs: p.totalTimeMs,
          roundSeconds: room.duration / 1000,
          solved: p.solvedCount,
          place: 1 + ranking.filter((x) => comparePlayers(x, p) < 0).length,
          players: ranking.length,
        });
  } else
    room.timer = setTimeout(() => {
      room.round++;
      start(room);
    }, pause);
}
function add(room, ws) {
  const p = {
    id: ws.id,
    accountId: ws.user.id,
    guest: ws.user.guest,
    name: ws.user.name,
    score: 0,
    totalTimeMs: 0,
    roundTimeMs: null,
    solvedCount: 0,
    solved: false,
    finished: false,
    guesses: [],
    socket: ws,
  };
  room.players.set(p.id, p);
  ws.roomId = room.id;
  send(ws, { type: 'joined', playerId: p.id });
  publish(room);
}
function handle(ws, m) {
  const fail = (code) => send(ws, { type: 'error', code });
  if (m.type === 'guest') {
    if (ws.user.guest)
      ws.user.name =
        String(m.name ?? 'Guest')
          .trim()
          .slice(0, 32) || 'Guest';
    send(ws, { type: 'session', user: ws.user, playerId: ws.id });
    return;
  }
  if (m.type === 'leave_room') {
    remove(ws);
    send(ws, { type: 'left' });
    return;
  }
  if (m.type === 'create_room' || m.type === 'quick_match') {
    let duration;
    try {
      duration = m.roundSeconds === undefined ? defaultDuration : roundDuration(m.roundSeconds);
    } catch {
      return fail('duration');
    }
    remove(ws);
    if (m.type === 'quick_match') {
      const found = [...rooms.values()].find(
        (r) =>
          r.public &&
          r.duration === duration &&
          r.phase === 'lobby' &&
          r.players.size < r.maxPlayers,
      );
      if (found) {
        add(found, ws);
        return;
      }
    }
    const maxPlayers = Math.min(8, Math.max(2, Math.floor(Number(m.maxPlayers) || 2)));
    const room = {
      id: randomBytes(4).toString('hex').toUpperCase(),
      hostId: ws.id,
      maxPlayers,
      duration,
      public: m.type === 'quick_match',
      players: new Map(),
      phase: 'lobby',
      round: 0,
    };
    rooms.set(room.id, room);
    add(room, ws);
    send(ws, { type: 'room_created', roomId: room.id });
    return;
  }
  if (m.type === 'join_room') {
    const room = rooms.get(
      String(m.roomId ?? '')
        .trim()
        .toUpperCase(),
    );
    if (!room || room.phase !== 'lobby') return fail('room');
    if (room.players.size >= room.maxPlayers) return fail('full');
    if ([...room.players.values()].some((p) => !p.guest && p.accountId === ws.user.id))
      return fail('duplicate');
    remove(ws);
    add(room, ws);
    return;
  }
  const room = rooms.get(ws.roomId),
    player = room?.players.get(ws.id);
  if (!player) return fail('room');
  if (m.type === 'start_battle') {
    if (room.hostId !== ws.id) return fail('host');
    if (room.phase !== 'lobby') return fail('phase');
    if (room.players.size < 2) return fail('players');
    start(room);
    return;
  }
  if (m.type === 'submit_guess') {
    if (
      room.phase !== 'playing' ||
      player.finished ||
      (room.deadline !== null && Date.now() >= room.deadline)
    )
      return fail('phase');
    const guess = normalize(String(m.guess ?? ''));
    if (!/^[ա-ֆև]+$/.test(guess)) return fail('armenianOnly');
    if (letters(guess).length !== rounds[room.round].length) return fail('correctLength');
    if (!dictionary.has(guess)) return fail('notInDictionary');
    if (player.guesses.includes(guess)) return fail('repeated');
    player.guesses.push(guess);
    const marks = evaluate(guess, room.answer);
    player.solved = guess === room.answer;
    if (player.solved) {
      player.solvedCount++;
      player.score += 1000 - 25 * (player.guesses.length - 1);
    }
    player.finished = player.solved || player.guesses.length >= rounds[room.round].attempts;
    if (player.finished) settleTime(room, player);
    send(ws, {
      type: 'guess_result',
      guess,
      marks,
      correct: player.solved,
      finished: player.finished,
      score: player.score,
    });
    publish(room);
    if ([...room.players.values()].every((p) => p.finished)) finish(room);
  }
}
const server = createServer(async (req, res) => {
  try {
    if (await store.handle(req, res)) return;
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(
      JSON.stringify({ service: 'barrik-battle', rooms: rooms.size, connections: sockets.size }),
    );
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end(JSON.stringify({ code: 'server' }));
  }
});
const wss = new WebSocketServer({ server, maxPayload: 4096 });
wss.on('connection', (ws, req) => {
  if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
    ws.close(1008);
    return;
  }
  ws.id = randomBytes(12).toString('hex');
  ws.user = store.session(req) ?? { id: `guest-${ws.id}`, name: 'Guest', guest: true };
  ws.alive = true;
  ws.on('pong', () => {
    ws.alive = true;
  });
  sockets.add(ws);
  send(ws, { type: 'hello', protocol: 2 });
  send(ws, { type: 'session', user: ws.user, playerId: ws.id });
  ws.on('message', (data) => {
    try {
      if (!ws.user.guest && !store.session(req)) {
        ws.close(1008, 'Session expired');
        return;
      }
      handle(ws, JSON.parse(data.toString()));
    } catch (error) {
      console.error('Battle message failed', error.message);
      send(ws, { type: 'error', code: 'server' });
    }
  });
  ws.on('close', () => {
    sockets.delete(ws);
    remove(ws);
  });
  ws.on('error', () => ws.close());
});
server.listen(Number(process.env.PORT ?? 8787), process.env.HOST ?? '127.0.0.1', () =>
  console.log(`Battle listening ${server.address().port}`),
);

const heartbeat = setInterval(() => {
  for (const ws of sockets) {
    if (!ws.alive) {
      ws.terminate();
      continue;
    }
    ws.alive = false;
    ws.ping();
  }
}, 30000);
heartbeat.unref();
wss.on('close', () => clearInterval(heartbeat));

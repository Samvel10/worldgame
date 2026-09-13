import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { randomBytes, scryptSync, timingSafeEqual, randomInt } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT ?? 8787);
const DATA_DIR = process.env.BARRIK_DATA_DIR ?? path.resolve('server/data');
const DB_PATH = path.join(DATA_DIR, 'accounts.json');
const answerData = JSON.parse(fs.readFileSync(path.resolve('src/data/answers.json'), 'utf8'));
const rounds = [
  { level: 'easy', length: 5, attempts: 7 },
  { level: 'medium', length: 7, attempts: 6 },
  { level: 'hard', length: 10, attempts: 5 },
  { level: 'expert', length: 14, attempts: 6 },
];
const rooms = new Map();
const sockets = new Map();
fs.mkdirSync(DATA_DIR, { recursive: true });
function loadAccounts() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return {};
  }
}
let accounts = loadAccounts();
function saveAccounts() {
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(accounts));
  fs.renameSync(tmp, DB_PATH);
}
function send(ws, message) {
  if (ws.readyState === 1) ws.send(JSON.stringify(message));
}
function broadcast(room, message) {
  for (const player of room.players.values()) send(player.socket, message);
}
function cleanName(name) {
  return String(name ?? '')
    .trim()
    .slice(0, 32)
    .replace(/[<>]/g, '');
}
function validRoomCode(code) {
  return /^[A-Z0-9]{5,8}$/.test(code);
}
function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, stored) {
  try {
    const [salt, hex] = stored.split(':');
    return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hex, 'hex'));
  } catch {
    return false;
  }
}
function userFrom(ws) {
  return ws.user ?? { id: `guest-${ws.id}`, name: ws.guestName, guest: true };
}
function roomState(room) {
  return {
    type: 'room_state',
    roomId: room.id,
    hostId: room.hostId,
    phase: room.phase,
    round: room.round,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      solved: p.solved,
      finished: p.finished,
      connected: p.socket.readyState === 1,
    })),
    totalRounds: rounds.length,
    maxPlayers: room.maxPlayers,
  };
}
function sendState(room) {
  broadcast(room, roomState(room));
}
function chooseAnswer(length, seed) {
  const pool = answerData.filter(
    (entry) => (entry.word.match(/ու|և|[ա-ֆ]/g) ?? []).length === length,
  );
  return pool.length ? pool[seed % pool.length].word : null;
}
function startRound(room) {
  const round = rounds[room.round];
  room.phase = 'playing';
  room.startedAt = Date.now();
  room.deadline = room.startedAt + 90000;
  for (const p of room.players.values()) {
    p.solved = false;
    p.finished = false;
  }
  // The server sends a deterministic seed; clients map it to the same curated answer list.
  room.seed = randomInt(0, 2 ** 31 - 1);
  room.answer = chooseAnswer(round.length, room.seed);
  broadcast(room, {
    type: 'round_started',
    round: room.round,
    level: round.level,
    length: round.length,
    attempts: round.attempts,
    seed: room.seed,
    deadline: room.deadline,
  });
  sendState(room);
  room.timer = setTimeout(() => finishRound(room), 90000);
}
function finishRound(room) {
  if (room.phase !== 'playing') return;
  clearTimeout(room.timer);
  room.phase = room.round + 1 >= rounds.length ? 'finished' : 'between';
  const results = [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    solved: p.solved,
  }));
  broadcast(room, { type: 'round_finished', round: room.round, players: results });
  if (room.phase === 'finished') {
    for (const player of room.players.values()) {
      const account = accounts[player.id] ?? accounts[player.id.split('-')[0]];
      if (account) {
        account.history.push({
          kind: 'battle',
          at: new Date().toISOString(),
          roomId: room.id,
          score: player.score,
          place: results.sort((a, b) => b.score - a.score).findIndex((p) => p.id === player.id) + 1,
        });
        account.history = account.history.slice(-100);
      }
    }
    saveAccounts();
  }
  sendState(room);
  if (room.phase === 'between')
    setTimeout(() => {
      room.round += 1;
      startRound(room);
    }, 4000);
}
function handleSubmit(room, player, message) {
  if (room.phase !== 'playing' || player.solved || Date.now() >= room.deadline) return;
  const guess = String(message.guess ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/եւ|եվ/g, 'և');
  const correct = Boolean(room.answer && guess === room.answer);
  if (!correct) {
    player.score = Math.max(0, player.score - 25);
    send(player.socket, { type: 'guess_result', correct: false, score: player.score });
    return;
  }
  player.solved = true;
  player.finished = true;
  const speedBonus = Math.max(0, Math.round((room.deadline - Date.now()) / 1000));
  player.score += 100 + speedBonus;
  send(player.socket, { type: 'guess_result', correct: true, score: player.score, speedBonus });
  sendState(room);
  if ([...room.players.values()].every((p) => p.solved || p.finished)) finishRound(room);
}
function handle(ws, message) {
  if (!message || typeof message.type !== 'string') return;
  if (message.type === 'guest') {
    ws.guestName = cleanName(message.name) || `Հյուր ${ws.id.slice(-4)}`;
    send(ws, { type: 'session', user: userFrom(ws) });
    return;
  }
  if (message.type === 'register' || message.type === 'login') {
    const username = cleanName(message.username).toLowerCase();
    const password = String(message.password ?? '');
    if (!/^[a-z0-9_.-]{3,24}$/.test(username) || password.length < 8)
      return send(ws, {
        type: 'error',
        code: 'credentials',
        message: 'Օգտանունը կամ գաղտնաբառը անվավեր է։',
      });
    if (message.type === 'register' && accounts[username])
      return send(ws, { type: 'error', code: 'exists', message: 'Այս օգտանունն արդեն զբաղված է։' });
    if (
      message.type === 'login' &&
      (!accounts[username] || !verifyPassword(password, accounts[username].password))
    )
      return send(ws, { type: 'error', code: 'login', message: 'Մուտքի տվյալները սխալ են։' });
    if (message.type === 'register')
      accounts[username] = { password: hashPassword(password), name: username, history: [] };
    ws.user = { id: username, name: accounts[username].name, guest: false };
    saveAccounts();
    send(ws, { type: 'session', user: ws.user });
    return;
  }
  if (message.type === 'history') {
    const account = ws.user && accounts[ws.user.id];
    return send(ws, { type: 'history', history: account?.history ?? [] });
  }
  if (message.type === 'create_room') {
    const maxPlayers = Math.min(8, Math.max(2, Number(message.maxPlayers) || 2));
    const id = randomBytes(4).toString('hex').toUpperCase();
    const user = userFrom(ws);
    const room = { id, hostId: user.id, hostSocket: ws, maxPlayers, players: new Map(), phase: 'lobby', round: 0 };
    rooms.set(id, room);
    const player = {
      id: user.id,
      name: user.name,
      score: 0,
      solved: false,
      finished: false,
      socket: ws,
    };
    room.players.set(player.id, player);
    ws.roomId = id;
    send(ws, { type: 'room_created', roomId: id });
    sendState(room);
    return;
  }
  if (message.type === 'join_room') {
    const id = String(message.roomId ?? '').toUpperCase();
    const room = rooms.get(id);
    if (!room || !validRoomCode(id) || room.phase !== 'lobby')
      return send(ws, { type: 'error', code: 'room', message: 'Սենյակը հասանելի չէ։' });
    if (room.players.size >= room.maxPlayers)
      return send(ws, { type: 'error', code: 'full', message: 'Սենյակը լիքն է։' });
    const user = userFrom(ws);
    const player = {
      id: user.id + `-${ws.id}`,
      name: user.name,
      score: 0,
      solved: false,
      finished: false,
      socket: ws,
    };
    room.players.set(player.id, player);
    ws.roomId = id;
    sendState(room);
    return;
  }
  const room = rooms.get(ws.roomId);
  if (!room) return send(ws, { type: 'error', code: 'room', message: 'Միացիր Battle սենյակին։' });
  const player = room.players.get(
    [...room.players.keys()].find(
      (id) => id === (ws.user?.id ?? '') || id.startsWith(`${ws.user?.id ?? ''}-`),
    ),
  );
  if (!player) return;
  if (message.type === 'start_battle' && (player.id === room.hostId || ws === room.hostSocket) && room.players.size >= 2) {
    startRound(room);
    return;
  }
  if (message.type === 'submit_guess') {
    handleSubmit(room, player, message);
    return;
  }
}
const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify({ service: 'barrik-battle', rooms: rooms.size, rounds: rounds.length }));
});
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  ws.id = randomBytes(5).toString('hex');
  sockets.set(ws.id, ws);
  send(ws, { type: 'hello', protocol: 1 });
  ws.on('message', (data) => {
    try {
      handle(ws, JSON.parse(data.toString()));
    } catch {
      send(ws, { type: 'error', code: 'bad_message', message: 'Անվավեր հաղորդագրություն։' });
    }
  });
  ws.on('close', () => {
    sockets.delete(ws.id);
    const room = rooms.get(ws.roomId);
    if (!room) return;
    const player = [...room.players.values()].find((p) => p.socket === ws);
    if (player) player.socket = { readyState: 0 };
    sendState(room);
    if (![...room.players.values()].some((p) => p.socket.readyState === 1)) {
      clearTimeout(room.timer);
      rooms.delete(room.id);
    }
  });
});
server.listen(PORT, () => console.log(`Barrik Battle server listening on :${PORT}`));

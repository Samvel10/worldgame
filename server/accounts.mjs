import { randomBytes, scrypt, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
const derive = promisify(scrypt);
const digest = (value) => createHash('sha256').update(value).digest('hex');
export function accountStore(directory) {
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'accounts.json');
  let accounts = Object.create(null);
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || Array.isArray(data) || typeof data !== 'object')
      throw Error('Invalid account database');
    accounts = Object.assign(Object.create(null), data);
  }
  const sessions = new Map();
  for (const [id, record] of Object.entries(accounts)) {
    if (!record || typeof record.password !== 'string' || !Array.isArray(record.history))
      throw Error('Invalid account record');
    for (const item of record.sessions ?? [])
      if (item.expires > Date.now()) sessions.set(item.hash, { id, expires: item.expires });
  }
  const save = () => {
    fs.writeFileSync(file + '.tmp', JSON.stringify(accounts), { mode: 0o600 });
    fs.renameSync(file + '.tmp', file);
  };
  const publicUser = (id) => ({ id, name: accounts[id].name, guest: false });
  function session(req) {
    const token = /(?:^|;\s*)barrik_session=([a-f0-9]{64})(?:;|$)/.exec(
      req.headers.cookie ?? '',
    )?.[1];
    if (!token) return null;
    const hash = digest(token);
    const found = sessions.get(hash);
    if (!found || found.expires <= Date.now()) {
      sessions.delete(hash);
      return null;
    }
    return publicUser(found.id);
  }
  function cookie(req, token, age) {
    return `barrik_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted ? '; Secure' : ''}`;
  }
  const limits = new Map();
  const reply = (res, status, body, headers = {}) => {
    res.writeHead(status, {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...headers,
    });
    res.end(JSON.stringify(body));
  };
  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return false;
    const user = session(req);
    if (req.method === 'GET' && url.pathname === '/api/session') {
      reply(res, 200, { user });
      return true;
    }
    if (req.method === 'GET' && url.pathname === '/api/history') {
      reply(res, user ? 200 : 401, { history: user ? (accounts[user.id].history ?? []) : [] });
      return true;
    }
    if (
      req.method !== 'POST' ||
      !['/api/login', '/api/register', '/api/logout'].includes(url.pathname)
    ) {
      reply(res, 404, { code: 'not_found' });
      return true;
    }
    if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
      reply(res, 403, { code: 'origin' });
      return true;
    }
    if (url.pathname === '/api/logout') {
      const token = /barrik_session=([a-f0-9]{64})/.exec(req.headers.cookie ?? '')?.[1];
      if (user && token) {
        accounts[user.id].sessions = (accounts[user.id].sessions ?? []).filter(
          (s) => s.hash !== digest(token),
        );
        sessions.delete(digest(token));
        save();
      }
      reply(res, 200, { user: null }, { 'set-cookie': cookie(req, '', 0) });
      return true;
    }
    for (const [key, value] of limits) if (value.until < Date.now()) limits.delete(key);
    const ip =
      process.env.TRUST_PROXY === '1'
        ? (req.headers['x-real-ip'] ?? req.socket.remoteAddress)
        : req.socket.remoteAddress;
    const rate = limits.get(ip) ?? { count: 0, until: Date.now() + 60000 };
    limits.set(ip, rate);
    if (++rate.count > 30) {
      reply(res, 429, { code: 'rate' });
      return true;
    }
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 4096) {
        reply(res, 413, { code: 'credentials' });
        return true;
      }
    }
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      reply(res, 400, { code: 'credentials' });
      return true;
    }
    const username = String(data.username ?? '')
      .trim()
      .toLowerCase();
    const password = String(data.password ?? '');
    if (!/^[a-z0-9_.-]{3,24}$/.test(username) || password.length < 8 || password.length > 128) {
      reply(res, 400, { code: 'credentials' });
      return true;
    }
    if (url.pathname === '/api/register') {
      if (accounts[username]) {
        reply(res, 409, { code: 'exists' });
        return true;
      }
      const salt = randomBytes(16).toString('hex');
      const hash = (await derive(password, salt, 64)).toString('hex');
      if (accounts[username]) {
        reply(res, 409, { code: 'exists' });
        return true;
      }
      accounts[username] = {
        name:
          String(data.name ?? username)
            .trim()
            .slice(0, 32) || username,
        password: `${salt}:${hash}`,
        history: [],
        sessions: [],
      };
    } else {
      const record = accounts[username];
      const [salt, hash] = (record?.password ?? 'invalid:').split(':');
      const actual = await derive(password, salt, 64);
      const expected = Buffer.from(hash, 'hex');
      if (!record || expected.length !== actual.length || !timingSafeEqual(actual, expected)) {
        reply(res, 401, { code: 'login' });
        return true;
      }
    }
    const token = randomBytes(32).toString('hex');
    const record = accounts[username];
    for (const item of record.sessions ?? []) sessions.delete(item.hash);
    for (const [hash, item] of sessions) if (item.expires <= Date.now()) sessions.delete(hash);
    record.sessions = [
      ...(record.sessions ?? []).filter((s) => s.expires > Date.now()).slice(-9),
      { hash: digest(token), expires: Date.now() + 2592000000 },
    ];
    for (const item of record.sessions)
      sessions.set(item.hash, { id: username, expires: item.expires });
    save();
    reply(res, 200, { user: publicUser(username) }, { 'set-cookie': cookie(req, token, 2592000) });
    return true;
  }
  function record(id, result) {
    if (accounts[id]) {
      accounts[id].history = [...(accounts[id].history ?? []), result].slice(-100);
      save();
    }
  }
  return { handle, session, record };
}

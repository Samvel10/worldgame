import { chromium, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const base = process.env.LIVE_URL ?? 'https://armworldgame.duckdns.org';
const answers = JSON.parse(await readFile('src/data/answers.json', 'utf8'));
const chars = (s) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/եւ|եվ/g, 'և')
    .match(/ու|և|[ա-ֆ]/g) ?? [];
function marks(guess, word) {
  const a = chars(word),
    g = chars(guess),
    r = g.map(() => 'absent'),
    count = {};
  a.forEach((c, i) => {
    if (c === g[i]) r[i] = 'correct';
    else count[c] = (count[c] ?? 0) + 1;
  });
  g.forEach((c, i) => {
    if (r[i] !== 'correct' && count[c]) {
      r[i] = 'present';
      count[c]--;
    }
  });
  return r;
}
function choose(pool) {
  return pool
    .map((guess) => {
      const buckets = new Map();
      for (const word of pool) {
        const key = marks(guess, word).join();
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
      return { guess, worst: Math.max(...buckets.values()) };
    })
    .sort((a, b) => a.worst - b.worst)[0].guess;
}
const browser = await chromium.launch({ headless: true });
const contexts = [];
const errors = [];
const results = [];
async function event(messages, predicate) {
  await expect.poll(() => messages.find(predicate), { timeout: 15000 }).toBeTruthy();
  return messages.find(predicate);
}
try {
  const players = [];
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext();
    contexts.push(context);
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', (e) => errors.push(e.message));
    const messages = [];
    page.on('websocket', (ws) =>
      ws.on('framereceived', (frame) => {
        try {
          messages.push(JSON.parse(String(frame.payload)));
        } catch {
          /* non JSON frame */
        }
      }),
    );
    const username = 'qa_' + randomBytes(5).toString('hex'),
      password = randomBytes(18).toString('hex');
    await page.goto(base + '/#register');
    await page.getByLabel('Քո անունը', { exact: true }).fill(`Browser QA ${i + 1}`);
    await page.getByLabel('Օգտանուն', { exact: true }).fill(username);
    await page.getByLabel('Գաղտնաբառ', { exact: true }).fill(password);
    await page.getByLabel('Կրկնել գաղտնաբառը').fill(password);
    await page.getByRole('button', { name: 'Գրանցվել', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: `Browser QA ${i + 1}`, exact: true }),
    ).toBeVisible();
    const cookie = (await context.cookies()).find((c) => c.name === 'barrik_session');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: `Browser QA ${i + 1}`, exact: true }),
    ).toBeVisible();
    await page.goto(base + '/#battle');
    await expect(page.getByText('Առցանց', { exact: true })).toBeVisible();
    players.push({ page, messages, username, password });
  }
  const [a, b] = players;
  await a.page.getByRole('button', { name: 'Ստեղծել սենյակ', exact: true }).click();
  const code = await a.page.locator('.invitation-code').innerText();
  await b.page.getByLabel('Սենյակի կոդ', { exact: true }).fill(code);
  await b.page.getByRole('button', { name: 'Միանալ', exact: true }).click();
  await expect(a.page.getByRole('button', { name: 'Սկսել Battle-ը', exact: true })).toBeEnabled();
  await a.page.getByRole('button', { name: 'Սկսել Battle-ը', exact: true }).click();
  for (let round = 0; round < 4; round++) {
    const config = await event(a.messages, (m) => m.type === 'round_started' && m.round === round);
    const peer = await event(b.messages, (m) => m.type === 'round_started' && m.round === round);
    expect(peer.deadline).toBe(config.deadline);
    expect(config.seed).toBeUndefined();
    expect(config.answer).toBeUndefined();
    let pool = answers
      .filter((w) => w.difficulty === config.level && chars(w.word).length === config.length)
      .map((w) => w.word);
    let answer = '';
    let used = 0;
    for (let attempt = 0; attempt < config.attempts; attempt++) {
      const guess = choose(pool);
      await a.page.getByRole('textbox', { name: 'Քո բառը', exact: true }).fill(guess);
      const offset = a.messages.length;
      await a.page.locator('.word-entry button').click();
      const result = await event(
        a.messages,
        (m) => a.messages.indexOf(m) >= offset && m.type === 'guess_result',
      );
      used++;
      if (result.correct) {
        answer = guess;
        break;
      }
      pool = pool.filter((w) => marks(guess, w).join() === result.marks.join());
      expect(pool.length).toBeGreaterThan(0);
    }
    expect(answer).toBeTruthy();
    await b.page.getByRole('textbox', { name: 'Քո բառը', exact: true }).fill(answer);
    await b.page.locator('.word-entry button').click();
    await event(b.messages, (m) => m.type === 'round_finished' && m.round === round);
    results.push({ round: round + 1, level: config.level, attempts: used });
    console.log(`Live round ${round + 1} completed on both browsers (${used} guesses)`);
  }
  for (const player of players) {
    await expect(player.page.getByRole('heading', { name: 'Battle-ն ավարտվեց' })).toBeVisible();
    await player.page.goto(base + '/#account');
    await expect(player.page.locator('.history-list li')).toHaveCount(1);
    await player.page.reload();
    await expect(player.page.locator('.history-list li')).toHaveCount(1);
    await player.page.getByRole('button', { name: 'Դուրս գալ' }).click();
    await player.page.getByLabel('Օգտանուն', { exact: true }).fill(player.username);
    await player.page.getByLabel('Գաղտնաբառ', { exact: true }).fill(player.password);
    await player.page.getByRole('button', { name: 'Մուտք գործել', exact: true }).click();
    await expect(player.page.locator('.history-list li')).toHaveCount(1);
  }
  await a.page.setViewportSize({ width: 1440, height: 1000 });
  await a.page.screenshot({ path: 'docs/screenshots/live-profile-desktop.png', fullPage: true });
  await b.page.setViewportSize({ width: 390, height: 844 });
  await b.page.screenshot({ path: 'docs/screenshots/live-profile-mobile.png', fullPage: true });
  const reloads = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    await a.page.reload();
    await expect(a.page.locator('.history-list li')).toHaveCount(1);
    reloads.push(Date.now() - start);
  }
  expect(errors).toEqual([]);
  await writeFile(
    'docs/LIVE_VERIFICATION.json',
    JSON.stringify(
      {
        at: new Date().toISOString(),
        base,
        rounds: results,
        registeredBrowsers: 2,
        cookie: { httpOnly: true, secure: true },
        historyAfterLogin: true,
        reloadsMs: reloads,
        pageErrors: errors,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    'Live verified: registration, secure cookies, reload, both players start/finish all rounds, history, logout/login. Reload times ms:',
    reloads.join(', '),
  );
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}

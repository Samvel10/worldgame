import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const answers = JSON.parse(readFileSync('src/data/answers.json', 'utf8')) as {
  word: string;
  difficulty: string;
}[];
const length = (word: string) => (word.match(/ու|և|[ա-ֆ]/g) ?? []).length;
test('accounts persist; two registered browsers play four rounds; history survives logout/login', async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const pa = await a.newPage(),
    pb = await b.newPage();
  const errors: string[] = [];
  const usernames: string[] = [];
  for (const [i, page] of [pa, pb].entries()) {
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/#register');
    await page.getByLabel('Քո անունը', { exact: true }).fill(`Player ${i}`);
    usernames.push(`audit_${Date.now()}_${i}`);
    await page.getByLabel('Օգտանուն', { exact: true }).fill(usernames[i]);
    await page.getByLabel('Գաղտնաբառ', { exact: true }).fill('Test-password-123');
    await page.getByLabel('Կրկնել գաղտնաբառը').fill('Test-password-123');
    await page.getByRole('button', { name: 'Գրանցվել', exact: true }).click();
    await expect(page.getByText('Մուտքը հաստատված է', { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: `Player ${i}`, exact: true })).toBeVisible();
    await page.goto('/#battle');
    await expect(page.getByText('Առցանց', { exact: true })).toBeVisible();
  }
  await pa.getByLabel('Փուլի ժամանակը՝ վայրկյաններով', { exact: true }).fill('0');
  await pa.getByRole('button', { name: 'Ստեղծել սենյակ', exact: true }).click();
  const code = await pa.locator('.invitation-code').innerText();
  await pb.getByLabel('Սենյակի կոդ', { exact: true }).fill(code);
  await pb.getByRole('button', { name: 'Միանալ', exact: true }).click();
  await expect(pa.getByRole('button', { name: 'Սկսել Battle-ը', exact: true })).toBeEnabled();
  await pa.getByRole('button', { name: 'Սկսել Battle-ը', exact: true }).click();
  for (const [i, level] of ['easy', 'medium', 'hard', 'expert'].entries()) {
    await expect(pa.locator('.battle-round-meta')).toContainText('Անսահմանափակ');
    await expect(pb.locator('.battle-time-summary')).toContainText('Անսահմանափակ');
    const count = [5, 7, 10, 14][i];
    const answer = answers.find((w) => w.difficulty === level && length(w.word) === count)!.word;
    for (const page of [pa, pb]) {
      await expect(page.locator('.board .tile-row').first().locator('.tile')).toHaveCount(count);
      // Start from a virtual letter, then switch to a physical Armenian keyboard.
      await page.locator('.keyboard .key').first().focus();
      const cdp = await page.context().newCDPSession(page);
      for (const character of answer) {
        await cdp.send('Input.dispatchKeyEvent', {
          type: 'keyDown',
          key: character,
          text: character,
        });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: character });
      }
      await expect(page.getByRole('textbox', { name: 'Քո բառը' })).toHaveValue(answer);
      await page.keyboard.press('Enter');
      await cdp.detach();
    }
  }
  await expect(pa.getByRole('heading', { name: 'Battle-ն ավարտվեց' })).toBeVisible();
  await expect(pb.getByRole('heading', { name: 'Battle-ն ավարտվեց' })).toBeVisible();
  await pa.goto('/#account');
  await expect(pa.locator('.history-list li')).toHaveCount(1);
  await expect(pa.locator('.history-list li')).toContainText('Ընդհանուր խաղաժամանակ');
  await pa.getByRole('button', { name: 'Դուրս գալ' }).click();
  await pa.reload();
  await expect(pa.getByRole('button', { name: 'Մուտք գործել', exact: true })).toBeVisible();
  await pa.getByLabel('Օգտանուն', { exact: true }).fill(usernames[0]);
  await pa.getByLabel('Գաղտնաբառ', { exact: true }).fill('Wrong-password-123');
  await pa.getByRole('button', { name: 'Մուտք գործել', exact: true }).click();
  await expect(pa.getByRole('alert')).toHaveText('Օգտանունը կամ գաղտնաբառը սխալ է։');
  await pa.getByLabel('Գաղտնաբառ', { exact: true }).fill('Test-password-123');
  await pa.getByRole('button', { name: 'Մուտք գործել', exact: true }).click();
  await expect(pa.locator('.history-list li')).toHaveCount(1);
  expect(errors).toEqual([]);
  await a.close();
  await b.close();
});
test('guest start and language changes preserve room; no hidden sockets or leaked connections', async ({
  browser,
  request,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const pa = await a.newPage(),
    pb = await b.newPage();
  await pa.goto('/');
  expect((await (await request.get('http://127.0.0.1:18887')).json()).connections).toBe(0);
  for (const p of [pa, pb]) await p.goto('/#battle');
  await pa.getByRole('button', { name: 'Ստեղծել սենյակ', exact: true }).click();
  const code = await pa.locator('.invitation-code').innerText();
  await pa.getByRole('button', { name: 'Լեզու', exact: true }).click();
  await pa.getByRole('menuitemradio', { name: 'English' }).click();
  await expect(pa.locator('.invitation-code')).toHaveText(code);
  await pb.getByLabel('Սենյակի կոդ', { exact: true }).fill(code);
  await pb.getByRole('button', { name: 'Միանալ', exact: true }).click();
  await pa.getByRole('button', { name: 'Start Battle', exact: true }).click();
  await expect(pa.locator('.board')).toBeVisible();
  await expect(pb.locator('.board')).toBeVisible();
  await pa.setViewportSize({ width: 1440, height: 1000 });
  await pa.screenshot({ path: 'docs/screenshots/battle-desktop.png', fullPage: true });
  await pa.setViewportSize({ width: 390, height: 900 });
  await pa.screenshot({ path: 'docs/screenshots/battle-mobile.png', fullPage: true });
  await a.close();
  await b.close();
  await expect
    .poll(async () => await (await request.get('http://127.0.0.1:18887')).json())
    .toMatchObject({ connections: 0, rooms: 0 });
});
test('three languages account/help/settings, responsive and accessibility', async ({ page }) => {
  const missing: string[] = [];
  page.on('console', (msg) => {
    if (msg.text().includes('Translation missing')) missing.push(msg.text());
  });
  for (const [lang, label] of [
    ['hy', 'Հայերեն'],
    ['en', 'English'],
    ['ru', 'Русский'],
  ]) {
    await page.goto('/');
    await page.locator('.language-switcher-button').click();
    await page.getByRole('menuitemradio', { name: label }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    for (const href of ['#register', '#login', '#battle']) {
      await page.goto('/' + href);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
    }
  }
  await page.goto('/#register');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'docs/screenshots/account-desktop.png', fullPage: true });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/account-mobile.png', fullPage: true });
  expect(missing).toEqual([]);
});
test('refresh and route cycles release every connection; dialogs translate', async ({
  page,
  request,
}) => {
  const timings: number[] = [];
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.text().includes('Translation missing')) warnings.push(m.text());
  });
  for (let i = 0; i < 6; i++) {
    const start = Date.now();
    await page.goto('/');
    await expect(page.locator('.game-card')).toBeVisible();
    timings.push(Date.now() - start);
    await expect
      .poll(async () => (await (await request.get('http://127.0.0.1:18887')).json()).connections)
      .toBe(0);
    await page.goto('/#battle');
    await expect(page.getByText('Առցանց', { exact: true })).toBeVisible();
    await page.goto('/#home');
  }
  for (const lang of ['English', 'Русский']) {
    await page.locator('.language-switcher-button').click();
    await page.getByRole('menuitemradio', { name: lang }).click();
    await page.locator('.header-help').first().click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', { name: lang === 'English' ? 'Settings' : 'Параметры', exact: true })
      .click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  expect(warnings).toEqual([]);
  console.log('Refresh timings ms:', timings.join(', '));
});
test('production PWA never caches private sessions and restores offline solo', async ({
  page,
  context,
}) => {
  test.skip(process.env.AUDIT_PREVIEW !== '1', 'Production service worker only');
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.locator('.game-card')).toBeVisible();
  await page.evaluate(async () => {
    await fetch('/api/session');
    const stores = await caches.keys();
    for (const store of stores) {
      const cache = await caches.open(store);
      if ((await cache.keys()).some((r) => r.url.includes('/api/')))
        throw Error('Private API cached');
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.game-card')).toBeVisible();
  await context.setOffline(false);
});
test('legacy cached shell upgrades once and removes old caches', async ({ page }) => {
  test.skip(process.env.AUDIT_PREVIEW !== '1', 'Production worker only');
  let unblock: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  await page.route('**/assets/*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/#login', { waitUntil: 'commit' });
  await page.evaluate(async () => {
    const cache = await caches.open('barrik-shell-v2');
    await cache.put('/legacy-marker', new Response('old'));
  });
  unblock();
  await expect
    .poll(async () => await page.evaluate(() => caches.keys()).catch(() => ['barrik-shell-v2']))
    .not.toContain('barrik-shell-v2');
  await expect(page.getByRole('button', { name: 'Մուտք գործել', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Մուտք գործել', exact: true })).toBeVisible();
});

test('host time setting, compact status, live totals and responsive timing cards', async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const pa = await a.newPage(),
    pb = await b.newPage();
  try {
    await pa.goto('/#battle');
    await expect(pa.getByText('Առցանց', { exact: true })).toBeVisible();
    const badge = await pa.locator('.connection').boundingBox();
    expect(badge!.height).toBeLessThan(40);
    const duration = pa.getByLabel('Փուլի ժամանակը՝ վայրկյաններով', { exact: true });
    await duration.fill('-1');
    await expect(pa.getByRole('button', { name: 'Ստեղծել սենյակ', exact: true })).toBeDisabled();
    await duration.fill('17');
    await pa.setViewportSize({ width: 1440, height: 1000 });
    await pa.screenshot({ path: 'docs/screenshots/battle-timing-lobby.png', fullPage: true });
    await pa.getByRole('button', { name: 'Ստեղծել սենյակ', exact: true }).click();
    const code = await pa.locator('.invitation-code').innerText();
    await pb.goto('/#battle');
    await pb.getByLabel('Սենյակի կոդ', { exact: true }).fill(code);
    await pb.getByRole('button', { name: 'Միանալ', exact: true }).click();
    await expect(pb.locator('.battle-time-summary')).toContainText('17 վրկ');
    await expect(pb.getByRole('button', { name: 'Սկսել Battle-ը', exact: true })).toHaveCount(0);
    await pa.getByRole('button', { name: 'Սկսել Battle-ը', exact: true }).click();
    await expect(pa.locator('.player-time').first().locator('strong')).not.toHaveText('0:00.0');
    const word = answers.find((w) => w.difficulty === 'easy' && length(w.word) === 5)!.word;
    await pa.getByRole('textbox', { name: 'Քո բառը' }).fill(word);
    await pa.locator('.word-entry button').click();
    await expect(pa.locator('.player-time.me small')).toContainText('1 / 4');
    const fixed = await pa.locator('.player-time.me strong').innerText();
    await expect
      .poll(async () => await pb.locator('.player-time.me strong').innerText())
      .not.toBe(fixed);
    await expect(pa.locator('.player-time.me strong')).toHaveText(fixed);
    await pa.screenshot({ path: 'docs/screenshots/battle-timing-desktop.png', fullPage: true });
    for (const width of [320, 390]) {
      await pa.setViewportSize({ width, height: 900 });
      expect(await pa.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect((await pa.locator('.connection').boundingBox())!.height).toBeLessThan(40);
    }
    await pa.screenshot({ path: 'docs/screenshots/battle-timing-mobile.png', fullPage: true });
  } finally {
    await a.close();
    await b.close();
  }
});

test('partial discoveries decide an otherwise unsolved Battle without repeat credit', async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const pa = await a.newPage(),
    pb = await b.newPage();
  try {
    for (const [page, name] of [
      [pa, 'Discoverer'],
      [pb, 'Opponent'],
    ] as const) {
      await page.goto('/#battle');
      await page.getByLabel('Քո անունը', { exact: true }).fill(name);
    }
    await pa.getByLabel('Փուլի ժամանակը՝ վայրկյաններով', { exact: true }).fill('3');
    await pa.getByRole('button', { name: 'Ստեղծել սենյակ', exact: true }).click();
    const code = await pa.locator('.invitation-code').innerText();
    await pb.getByLabel('Սենյակի կոդ', { exact: true }).fill(code);
    await pb.getByRole('button', { name: 'Միանալ', exact: true }).click();
    await pa.getByRole('button', { name: 'Սկսել Battle-ը', exact: true }).click();
    const field = pa.getByRole('textbox', { name: 'Քո բառը' });
    await field.fill('անալի');
    await field.press('Enter');
    await expect(pa.locator('.player-row.me > strong')).toHaveText('195');
    await field.fill('ԱՆԱԼԻ');
    await field.press('Enter');
    await expect(pa.getByRole('alert')).toBeVisible();
    await expect(pa.locator('.player-row.me > strong')).toHaveText('195');
    await expect(pa.locator('.board .tile.correct')).toHaveCount(2);
    await field.fill('անամպ');
    await field.press('Enter');
    await expect(pa.locator('.player-row.me > strong')).toHaveText('190');
    await expect(pa.getByText('Փորձի միավորները՝ -5', { exact: true })).toBeVisible();
    await expect(pa.locator('.board .tile.correct')).toHaveCount(4);
    await pa.setViewportSize({ width: 1440, height: 1100 });
    await pa.screenshot({ path: 'docs/screenshots/battle-partial-score.png', fullPage: true });
    await expect(pa.getByRole('heading', { name: 'Battle-ն ավարտվեց' })).toBeVisible({
      timeout: 20000,
    });
    await expect(pa.locator('.battle-final p')).toHaveText('Discoverer');
    await expect(pb.locator('.battle-final p')).toHaveText('Discoverer');
  } finally {
    await a.close();
    await b.close();
  }
});

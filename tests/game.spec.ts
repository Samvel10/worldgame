import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
const answers = JSON.parse(fs.readFileSync('src/data/answers.json', 'utf8')) as { word: string }[];
const tiles = (word: string) => word.match(/ու|և|[ա-ֆ]/g) ?? [];
async function setup(
  page: Page,
  options: { length?: number; attempts?: number; broken?: boolean } = {},
) {
  await page.addInitScript(({ length, attempts, broken }) => {
    // Deterministic browser fixtures use real production random selection and dictionary.
    window.localStorage.setItem(
      'barrik:settings:v1',
      broken
        ? '{'
        : JSON.stringify({
            mode: 'custom',
            length: length ?? 3,
            attempts: attempts ?? 3,
            difficulty: 'all',
          }),
    );
    if (broken) {
      window.localStorage.setItem('barrik:stats:v1', '{"played":-5}');
      window.localStorage.setItem('barrik:history:v1', '[12]');
    }
  }, options);
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Քո բառը' })).toBeVisible();
}
async function answer(page: Page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem('barrik:history:v1') ?? '[]').at(-1) as string,
  );
}
async function guess(page: Page, word: string) {
  await page.getByRole('textbox', { name: 'Քո բառը' }).fill(word);
  await page.getByRole('button', { name: 'Ուղարկել բառը', exact: true }).click();
}

test('invalid words and non Armenian text do not consume attempts', async ({ page }) => {
  await setup(page);
  await guess(page, 'ժժժ');
  await expect(page.getByText('Այս բառը բառարանում չկա', { exact: true })).toBeVisible();
  await expect(page.getByText('ՓՈՐՁ 1 / 3', { exact: true })).toBeVisible();
  await page.getByRole('textbox').fill('abc');
  await expect(page.getByText('Մուտքագրիր միայն հայերեն տառեր', { exact: true })).toBeVisible();
  await page.getByRole('textbox').fill('ա');
  await page.getByRole('textbox').press('Enter');
  await expect(page.getByText('Բառը պետք է ունենա 3 տառ', { exact: true })).toBeVisible();
});
test('win, replay, stored stats and reset confirmation work', async ({ page }) => {
  await setup(page);
  const secret = await answer(page);
  await guess(page, secret);
  await expect(page.getByRole('dialog', { name: 'Գերազանց, գտար բառը։' })).toBeVisible();
  await expect(page.locator('.board .tile.correct')).toHaveCount(3);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('barrik:stats:v1') ?? '{}')),
  ).toMatchObject({ played: 1, wins: 1, streak: 1, distribution: { 1: 1 } });
  await page.getByRole('dialog').getByRole('button', { name: 'Կրկին խաղալ', exact: true }).click();
  expect(await answer(page)).not.toBe(secret);
  await page.getByRole('button', { name: 'Վիճակագրություն', exact: true }).click();
  await page.getByRole('button', { name: 'Զրոյացնել վիճակագրությունը', exact: true }).click();
  await page.getByRole('button', { name: 'Չեղարկել', exact: true }).click();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Զրոյացնել վիճակագրությունը', exact: true }).click();
  await page.getByRole('button', { name: 'Այո, զրոյացնել', exact: true }).click();
  await expect(page.getByText('0%', { exact: true })).toBeVisible();
});
test('losing reveals word and stops further guesses', async ({ page }) => {
  await setup(page);
  const secret = await answer(page);
  const other = answers.find((x) => tiles(x.word).length === 3 && x.word !== secret)!.word;
  for (let i = 0; i < 3; i++) await guess(page, other);
  await expect(page.getByRole('dialog', { name: 'Այս անգամ բառը թաքնվեց։' })).toBeVisible();
  await expect(page.locator('.answer-word')).toHaveText(secret);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('barrik:stats:v1') ?? '{}')),
  ).toMatchObject({ played: 1, wins: 0, streak: 0 });
  await page.getByRole('button', { name: 'Դիտել խաղատախտակը' }).click();
  await expect(page.getByRole('button', { name: 'Ստուգել Enter' })).toBeDisabled();
});
test('screen and physical keyboards, backspace and uppercase input work', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'ու', exact: true }).click();
  await expect(page.getByRole('textbox')).toHaveValue('ու');
  await page.getByRole('button', { name: 'Ջնջել վերջին տառը' }).click();
  await expect(page.getByRole('textbox')).toHaveValue('');
  await page.locator('h1').click();
  await page.locator('body').dispatchEvent('keydown', { key: 'ա', bubbles: true });
  await expect(page.getByRole('textbox')).toHaveValue('ա');
  await page.keyboard.press('Backspace');
  await expect(page.getByRole('textbox')).toHaveValue('');
  const secret = await answer(page);
  await page.getByRole('textbox').fill(secret.toUpperCase());
  await page.getByRole('textbox').press('Enter');
  await expect(page.getByRole('dialog', { name: 'Գերազանց, գտար բառը։' })).toBeVisible();
});
test('custom impossible combination is blocked and settings apply on start', async ({ page }) => {
  await setup(page);
  await page.getByRole('combobox', { name: 'Տառերի քանակը', exact: true }).selectOption('20');
  await page.getByRole('combobox', { name: 'Բարդությունը', exact: true }).selectOption('easy');
  await expect(page.getByRole('button', { name: 'Սկսել խաղը', exact: true })).toBeDisabled();
  await expect(
    page.getByText('Այս ընտրությամբ բառ չկա։ Փոխիր երկարությունը կամ բարդությունը։'),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Բարդությունը', exact: true }).selectOption('all');
  await page.getByRole('button', { name: 'Սկսել խաղը', exact: true }).click();
  await expect(page.getByLabel('Խաղատախտակ՝ 20 տառ, 3 փորձ', { exact: true })).toBeVisible();
});
test('new game requires confirmation for a started round', async ({ page }) => {
  await setup(page);
  const secret = await answer(page);
  await page.getByRole('textbox').fill('ա');
  await page.getByRole('button', { name: 'Նոր խաղ', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Սկսե՞լ նոր խաղ' })).toBeVisible();
  await page.getByRole('button', { name: 'Շարունակել խաղը' }).click();
  expect(await answer(page)).toBe(secret);
  await page.getByRole('button', { name: 'Նոր խաղ', exact: true }).click();
  await page.getByRole('button', { name: 'Սկսել նոր խաղ', exact: true }).click();
  expect(await answer(page)).not.toBe(secret);
});
test('help, focus trapping, theme persistence and corrupt storage recovery', async ({ page }) => {
  await setup(page, { broken: true });
  await expect(page.getByRole('textbox')).toBeVisible();
  await page.getByRole('button', { name: 'Ինչպե՞ս խաղալ' }).click();
  await expect(page.getByRole('dialog', { name: 'Ինչպե՞ս խաղալ' })).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Միացնել մութ թեման' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
test('easy hint can be used once', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Հեշտ/ }).click();
  await page.getByRole('button', { name: 'Սկսել խաղը', exact: true }).click();
  const secret = await answer(page);
  await page.getByRole('button', { name: 'Ակնարկ 1' }).click();
  await expect(page.locator('.game-message')).toContainText(`Առաջին տառը՝ «${tiles(secret)[0]}»`);
  await expect(page.getByRole('button', { name: 'Ակնարկ 1' })).toBeDisabled();
});
test('desktop and mobile 20 letter boards fit, screenshots and accessibility', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await setup(page, { length: 5, attempts: 6 });
  await page.screenshot({ path: 'docs/screenshots/desktop.png', fullPage: true });
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, reason: n.failureSummary })),
    })),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Միացնել մութ թեման' }).click();
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, reason: n.failureSummary })),
    })),
  ).toEqual([]);
  await page.screenshot({ path: 'docs/screenshots/dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Միացնել լուսավոր թեման' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
  await page.getByRole('combobox', { name: 'Տառերի քանակը', exact: true }).selectOption('20');
  await page.getByRole('button', { name: 'Սկսել խաղը', exact: true }).click();
  const secret = await answer(page);
  await page.getByRole('textbox').fill(secret);
  for (const width of [320, 390, 650, 768]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const box = await page.locator('.board').boundingBox();
    expect(box!.width).toBeLessThan(width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/mobile-long.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.tile')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
});

test('dictionary network failure has a working retry', async ({ page }) => {
  await page.route('**/accepted*.json*', (route) =>
    route.request().resourceType() === 'fetch' ? route.abort() : route.continue(),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Բառարանը չհաջողվեց բեռնել' })).toBeVisible();
  await page.unroute('**/accepted*.json*');
  await page.getByRole('button', { name: 'Կրկին փորձել', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Քո բառը' })).toBeVisible();
});

test('Backspace respects selected text and the insertion caret', async ({ page }) => {
  await setup(page, { length: 5 });
  const field = page.getByRole('textbox', { name: 'Քո բառը' });
  await field.fill('անուն');
  await field.press('ControlOrMeta+A');
  await field.press('Backspace');
  await expect(field).toHaveValue('');
  await field.fill('անուն');
  await field.press('Home');
  await field.press('Backspace');
  await expect(field).toHaveValue('անուն');
  await field.press('ArrowRight');
  await field.press('Backspace');
  await expect(field).toHaveValue('նուն');
  await field.fill('անուն');
  await field.press('Home');
  await field.press('ArrowRight');
  await field.press('ArrowRight');
  await field.press('ArrowRight');
  await field.press('ArrowRight');
  await field.press('Backspace');
  await expect(field).toHaveValue('անն');
});

for (const focus of ['input', 'body', 'letter', 'check'] as const) {
  test(`physical Armenian input and Enter submit six tiles with ${focus} focus`, async ({
    page,
  }) => {
    await setup(page, { length: 6, attempts: 6 });
    const secret = await answer(page);
    if (focus === 'input') await page.getByRole('textbox', { name: 'Քո բառը' }).focus();
    else if (focus === 'body') await page.locator('h1').click();
    else if (focus === 'letter') await page.locator('.keyboard .key').first().focus();
    else await page.locator('.enter-key').focus();
    const cdp = await page.context().newCDPSession(page);
    for (const character of secret) {
      await cdp.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: character,
        text: character,
      });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: character });
    }
    await expect(page.getByRole('textbox', { name: 'Քո բառը' })).toHaveValue(secret);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Գերազանց, գտար բառը։' })).toBeVisible();
  });
}

test('Tab-focused virtual keys still support native Enter activation', async ({ page }) => {
  await setup(page, { length: 6 });
  const letter = page.locator('.keyboard .key').first();
  await letter.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Քո բառը' })).toHaveValue('է');
  await page.keyboard.press('Space');
  await expect(page.getByRole('textbox', { name: 'Քո բառը' })).toHaveValue('էէ');
});

import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto('http://127.0.0.1:5173');
await page.getByRole('textbox', { name: 'Քո բառը' }).waitFor();
await page.screenshot({ path: 'docs/screenshots/default-desktop.png', fullPage: true });
await page.getByRole('button', { name: /Անհատական/ }).click();
await page.getByRole('combobox', { name: 'Տառերի քանակը', exact: true }).selectOption('20');
await page.getByRole('button', { name: 'Սկսել խաղը', exact: true }).click();
const secret = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('barrik:history:v1')).at(-1),
);
const answers = JSON.parse(fs.readFileSync('src/data/answers.json', 'utf8'));
const other = answers.find(
  (entry) => entry.word !== secret && entry.word.match(/ու|և|[ա-ֆ]/g).length === 20,
).word;
await page.getByRole('textbox').fill(other);
await page.getByRole('button', { name: 'Ուղարկել բառը', exact: true }).click();
await page
  .locator('.board .reveal')
  .evaluateAll((elements) =>
    Promise.all(
      elements.flatMap((el) => el.getAnimations().map((animation) => animation.finished)),
    ),
  );
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'docs/screenshots/mobile-long-scored.png', fullPage: true });
await page.getByRole('textbox').fill(secret);
await page.getByRole('button', { name: 'Ուղարկել բառը', exact: true }).click();
await page.getByRole('dialog', { name: 'Գերազանց, գտար բառը։' }).waitFor();
await page.screenshot({ path: 'docs/screenshots/victory-mobile.png', fullPage: true });
await browser.close();
if (errors.length) throw new Error(errors.join('\n'));
console.log(
  'Default desktop, scored 20-letter mobile and victory screenshots captured; no uncaught browser errors.',
);

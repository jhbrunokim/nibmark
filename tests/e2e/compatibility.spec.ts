import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { examples } from '../../src/examples';
import { shareURL } from '../../src/editor/share';
import { readFileSync } from 'node:fs';
const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
);

test('Korean shared recipe supports editing, SVG/PNG export and source round trip', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const source = examples.korean.replace('작은 도구', '호환성 확인');
  await page.goto(shareURL({ source, locale: 'ko' }, 'http://127.0.0.1:4173/'));
  await expect(page.locator('.version')).toHaveText(`v${version}`);
  const editor = page.getByRole('textbox', { name: 'Nibmark 문법 입력' });
  await expect(editor).toHaveValue(source);
  await expect(page.getByRole('button', { name: 'SVG 다운로드', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '문법 안내', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  for (const format of ['SVG', 'PNG']) {
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: `${format} 다운로드`, exact: true }).click();
    const download = await downloading;
    const bytes = await readFile((await download.path())!);
    if (format === 'PNG') {
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
      expect(bytes.readUInt32BE(16)).toBe(720);
    } else {
      expect(bytes.toString()).toContain('호환성 확인');
      expect(bytes.toString()).not.toContain('<text');
    }
  }
  const saving = page.waitForEvent('download');
  await page.getByRole('button', { name: '문법 저장', exact: true }).click();
  const saved = await readFile((await (await saving).path())!);
  await editor.fill('nutrition v9');
  await expect(page.getByRole('button', { name: 'SVG 다운로드', exact: true })).toBeDisabled();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'recipe.nibmark', mimeType: 'text/plain', buffer: saved });
  await expect(editor).toHaveValue(source);
  await expect(page.getByRole('button', { name: 'SVG 다운로드', exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('korean-desktop.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('long labels and zero totals remain readable at a 320px viewport', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  const long = examples.zero
    .replace('just-html', 'A very long project name '.repeat(5))
    .replace('Direct', 'A very long ingredient name '.repeat(5));
  const editor = page.getByRole('textbox', { name: 'Nibmark source' });
  await editor.fill(long);
  await expect(page.getByRole('button', { name: 'Download SVG', exact: true })).toBeEnabled();
  await expect(page.locator('#nibmark-desc')).toContainText('0');
  const preview = page.getByTestId('label-preview');
  const bounds = await preview.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: testInfo.outputPath('long-mobile.png'), fullPage: true });
});

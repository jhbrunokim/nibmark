import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

test('edit, recover from errors, export SVG/PNG and reopen a saved recipe', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (/^https?:/.test(r.url()) && !r.url().startsWith('http://127.0.0.1:4173'))
      requests.push(r.url());
  });
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Nibmark source' });
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeEnabled();
  await expect(page.getByTestId('label-preview')).toHaveScreenshot('classic-label.png', {
    maxDiffPixelRatio: 0.01,
  });
  if (process.env.UPDATE_EXAMPLES) {
    await mkdir('docs/assets', { recursive: true });
    await writeFile(
      'docs/assets/software-facts.svg',
      await page.getByTestId('label-preview').innerHTML(),
    );
    await page.screenshot({ path: 'docs/assets/playground.png', fullPage: true });
  }
  const original = await editor.inputValue();
  await editor.fill(original.replace('dependencies 128', 'dependencies 129'));
  await expect(page.getByRole('alert').first()).toContainText('128');
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeDisabled();
  await expect(page.getByText('Last valid preview')).toBeVisible();
  await editor.fill(original.replace('tiny-app', 'my-project'));
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeEnabled();
  const svgPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download SVG' }).click();
  const svg = await svgPromise;
  expect(svg.suggestedFilename()).toBe('my-project-facts.svg');
  const svgData = await readFile((await svg.path())!, 'utf8');
  expect(svgData).toContain('my-project');
  expect(svgData).not.toContain('<text');
  const pngPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const png = await pngPromise;
  const pngData = await readFile((await png.path())!);
  expect(pngData.subarray(1, 4).toString()).toBe('PNG');
  expect(pngData.readUInt32BE(16)).toBe(720);
  await png.saveAs('test-results/exported-label.png');
  await expect(page.getByText('my-project-facts.png', { exact: true })).toBeVisible();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy Markdown' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    '![Software Facts for my-project](./my-project-facts.png)',
  );
  const savePromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save source' }).click();
  const save = await savePromise;
  await page.getByLabel('Example', { exact: true }).selectOption('zero');
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'my-project.nibmark',
      mimeType: 'text/plain',
      buffer: Buffer.from(await readFile((await save.path())!, 'utf8')),
    });
  await expect(editor).toHaveValue(original.replace('tiny-app', 'my-project'));
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeEnabled();
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
  await page.screenshot({ path: 'test-results/editor-desktop.png', fullPage: true });
});

test('Korean label, guide, mobile layout and invalid file handling', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Example', { exact: true }).selectOption('korean');
  await expect(page.getByRole('button', { name: 'SVG 다운로드' })).toBeEnabled();
  await expect(page.locator('#nibmark-desc')).toContainText('소프트웨어 성분표');
  await expect(page.getByTestId('label-preview')).toHaveScreenshot('korean-label.png', {
    maxDiffPixelRatio: 0.01,
  });
  const p = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG 다운로드' }).click();
  const koreanPNG = await p;
  expect(koreanPNG.suggestedFilename()).toBe('작은-도구-facts.png');
  await koreanPNG.saveAs('test-results/exported-korean-label.png');
  await page.getByRole('button', { name: '문법 안내', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const before = await page.getByRole('textbox', { name: 'Nibmark 문법 입력' }).inputValue();
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'large.nibmark',
      mimeType: 'text/plain',
      buffer: Buffer.from('x'.repeat(51201)),
    });
  await expect(page.getByRole('alert')).toContainText('50 KB');
  await expect(page.getByRole('textbox', { name: 'Nibmark 문법 입력' })).toHaveValue(before);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'SVG 다운로드' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/editor-mobile.png', fullPage: true });
});

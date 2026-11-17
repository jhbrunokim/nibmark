import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { examples } from '../../src/examples';

test('compact view preserves the full recipe across save, share, undo and image export', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByLabel('Example', { exact: true }).selectOption('api');
  await expect(page.getByRole('button', { name: 'Download SVG', exact: true })).toBeEnabled();
  const detailedHeight = Number(
    await page.locator('[data-testid="label-preview"] svg').getAttribute('height'),
  );
  await page.getByLabel('Label view', { exact: true }).selectOption('compact');
  await expect(page.locator('#nibmark-desc')).toContainText('Compact view:');
  await expect(page.locator('#nibmark-desc')).not.toContainText('Declared licenses');
  const editor = page.getByRole('textbox', { name: 'Nibmark source' });
  const compact = await editor.inputValue();
  expect(compact.replace('view compact\n', '')).toBe(examples.api);
  expect(
    Number(await page.locator('[data-testid="label-preview"] svg').getAttribute('height')),
  ).toBeLessThan(detailedHeight);
  const saving = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save source', exact: true }).click();
  expect(await readFile((await (await saving).path())!, 'utf8')).toBe(compact);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy edit link', exact: true }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const recipient = await context.newPage();
  await recipient.goto(link);
  await expect(recipient.getByLabel('Label view', { exact: true })).toHaveValue('compact');
  await expect(recipient.getByRole('button', { name: 'Download SVG', exact: true })).toBeEnabled();
  for (const format of ['SVG', 'PNG']) {
    const downloading = recipient.waitForEvent('download');
    await recipient.getByRole('button', { name: `Download ${format}`, exact: true }).click();
    const download = await downloading;
    expect(await download.failure()).toBeNull();
    if (format === 'SVG')
      expect(await readFile((await download.path())!, 'utf8')).toContain('Compact view:');
  }
  await page.getByRole('button', { name: 'Undo replacement', exact: true }).click();
  await expect(editor).toHaveValue(examples.api);
  await expect(page.getByLabel('Label view', { exact: true })).toHaveValue('detailed');
  await page
    .getByLabel('Open source file')
    .setInputFiles({
      name: 'compact.nibmark',
      mimeType: 'text/plain',
      buffer: Buffer.from(compact),
    });
  await expect(page.getByLabel('Label view', { exact: true })).toHaveValue('compact');
  await page.getByLabel('Label view', { exact: true }).selectOption('detailed');
  await expect(page.locator('#nibmark-desc')).toContainText('Declared licenses');
  await editor.fill('invalid');
  await expect(page.getByLabel('Label view', { exact: true })).toBeDisabled();
});

test('project examples and language are independent', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.select-label select option:not([disabled])')).toHaveCount(7);
  await expect(page.locator('.select-label option[value="korean"]')).toHaveCount(0);
  await page.getByRole('button', { name: '한국어', exact: true }).click();
  await page.getByLabel('예제', { exact: true }).selectOption('rust');
  await expect(page.getByRole('button', { name: '한국어', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByLabel('라벨 보기', { exact: true }).selectOption('compact');
  await expect(page.locator('#nibmark-desc')).toContainText('간략형:');
  await expect(page.locator('#nibmark-desc')).toContainText('Trail CLI');
});

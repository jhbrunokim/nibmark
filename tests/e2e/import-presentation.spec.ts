import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { examples } from '../../src/examples';

test('pinned names and sections survive apply, undo, source round trip and edit links', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Nibmark source' });
  const original = await editor.inputValue();
  await page.getByRole('button', { name: 'Import SPDX', exact: true }).click();
  await page.getByLabel('Choose SPDX file').setInputFiles('public/examples/pantry-api.spdx.json');
  await page.getByText('Choose ingredients and sections', { exact: true }).click();
  await page.getByLabel('Representative selection').selectOption('manual');
  await page.getByLabel('Search packages').fill('library-20');
  await page.getByRole('checkbox', { name: /library-20 @/ }).check();
  await page.getByRole('checkbox', { name: 'Licenses', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Ecosystems', exact: true }).uncheck();
  const recipe = await page.getByLabel('Generated Nibmark').inputValue();
  expect(recipe).toContain('includes "library-20 @ 1.0.0" 1');
  expect(recipe).not.toContain('Declared licenses');
  await expect(editor).toHaveValue(original);
  await page.getByRole('button', { name: 'Create label', exact: true }).click();
  await expect(editor).toHaveValue(recipe);
  await expect(page.locator('#nibmark-desc')).toContainText('Packages: 24');
  await page.getByRole('button', { name: 'Undo replacement', exact: true }).click();
  await expect(editor).toHaveValue(original);
  await page.getByRole('button', { name: 'Import SPDX', exact: true }).click();
  await expect(page.getByLabel('Representative selection')).toHaveValue('manual');
  await expect(page.getByRole('checkbox', { name: /library-20 @/ })).toBeChecked();
  await page.getByRole('button', { name: 'Create label', exact: true }).click();
  const saving = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save source', exact: true }).click();
  const saved = await saving;
  const source = await readFile((await saved.path())!, 'utf8');
  expect(source).toBe(recipe);
  await page.getByLabel('Example', { exact: true }).selectOption('zero');
  await page
    .getByLabel('Open source file')
    .setInputFiles({ name: 'pinned.nibmark', mimeType: 'text/plain', buffer: Buffer.from(source) });
  await expect(editor).toHaveValue(recipe);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy edit link', exact: true }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  const recipient = await context.newPage();
  await recipient.goto(url);
  await expect(recipient.getByRole('textbox', { name: 'Nibmark source' })).toHaveValue(recipe);
  await expect(recipient.getByRole('button', { name: 'Download SVG', exact: true })).toBeEnabled();
  const downloading = recipient.waitForEvent('download');
  await recipient.getByRole('button', { name: 'Download PNG', exact: true }).click();
  expect(await (await downloading).failure()).toBeNull();
  await page.screenshot({ path: testInfo.outputPath('pinned-label.png'), fullPage: true });
});

test('pins are bounded and reset safely when the project root or file changes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Import SPDX', exact: true }).click();
  const file = page.getByLabel('Choose SPDX file');
  await file.setInputFiles('public/examples/pantry-api.spdx.json');
  await page.getByText('Choose ingredients and sections', { exact: true }).click();
  await page.getByLabel('Representative selection').selectOption('manual');
  const checkboxes = page.getByRole('group', { name: 'Packages to pin' }).getByRole('checkbox');
  for (let i = 0; i < 12; i++) await checkboxes.nth(i).check();
  await expect(checkboxes.nth(12)).toBeDisabled();
  await checkboxes.nth(0).uncheck();
  await expect(checkboxes.nth(12)).toBeEnabled();
  await page.getByLabel('Search packages').fill('fastify');
  await expect(page.getByRole('checkbox', { name: /fastify @/ })).toBeChecked();
  await page.getByLabel('Project root (excluded from counts)').selectOption('SPDXRef-P0');
  await expect(page.getByRole('status')).toContainText([
    'The new project root was removed',
    'Pinned 10 / 12',
  ]);
  await expect(page.getByRole('checkbox', { name: /fastify @/ })).toHaveCount(0);
  await file.setInputFiles('tests/fixtures/spdx/upstream/syft-alpine.json');
  await expect(page.getByLabel('Representative selection')).toHaveValue('auto');
  await page.getByText('Choose ingredients and sections', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Ecosystems/ })).toBeDisabled();
});

test('the example picker offers seven distinct working recipes and supports undo', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.select-label select option:not([disabled])')).toHaveCount(7);
  for (const [key, source] of Object.entries(examples)) {
    await page.locator('.select-label select').selectOption(key);
    await expect(page.locator('.source-pane textarea')).toHaveValue(source);
    await expect(
      page.getByRole('button', {
        name: key === 'korean' ? 'SVG 다운로드' : 'Download SVG',
        exact: true,
      }),
    ).toBeEnabled();
  }
  await page.getByRole('button', { name: 'Undo replacement', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nibmark source' })).toHaveValue(examples.python);
});

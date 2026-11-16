import { test, expect } from '@playwright/test';

test('review SPDX then create, edit, export and undo the label', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (/^https?:/.test(r.url()) && !r.url().startsWith('http://127.0.0.1:4173/'))
      external.push(r.url());
  });
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Nibmark source' });
  const original = await editor.inputValue();
  await page.getByRole('button', { name: 'Import SPDX', exact: true }).click();
  await page.getByLabel('Choose SPDX file').setInputFiles('public/examples/tiny-app.spdx.json');
  await expect(page.getByLabel('Project root (excluded from counts)')).toHaveValue('SPDXRef-App');
  await expect(page.getByRole('dialog')).toContainText('1 / 1 / 1');
  await expect(editor).toHaveValue(original);
  await page.getByRole('button', { name: 'Create label', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(editor).toHaveValue(/packages 3/);
  await expect(page.getByRole('button', { name: 'Download SVG', exact: true })).toBeEnabled();
  await expect(page.locator('#nibmark-desc')).toContainText('Packages: 3');
  await expect(page.locator('#nibmark-desc')).toContainText('Generator: Nibmark fictional example');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  expect((await downloading).suggestedFilename()).toBe('tiny-app-facts.png');
  await page.getByRole('button', { name: 'Undo replacement', exact: true }).click();
  await expect(editor).toHaveValue(original);
  expect(external).toEqual([]);
});

test('malformed and unsupported files keep the editor unchanged; root selection is explicit', async ({
  page,
}) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Nibmark source' });
  const original = await editor.inputValue();
  await page.getByRole('button', { name: 'Import SPDX', exact: true }).click();
  const file = page.getByLabel('Choose SPDX file');
  await file.setInputFiles({
    name: 'spdx3.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"@context":"https://spdx.org/rdf/3.0.1/spdx-context.jsonld"}'),
  });
  await expect(page.getByRole('alert')).toContainText('SPDX 3.x');
  await expect(editor).toHaveValue(original);
  await file.setInputFiles({
    name: 'large.json',
    mimeType: 'application/json',
    buffer: Buffer.from(' '.repeat(5 * 1024 * 1024 + 1)),
  });
  await expect(page.getByRole('alert')).toContainText('5 MB');
  await file.setInputFiles('tests/fixtures/spdx/example.spdx');
  await page.getByLabel('Project root (excluded from counts)').selectOption('');
  await expect(page.getByRole('dialog')).toContainText('0 / 0 / 4');
  await page.getByRole('button', { name: 'Create label', exact: true }).click();
  await expect(editor).toHaveValue(/packages 4/);
  await expect(page.getByRole('button', { name: 'Download SVG', exact: true })).toBeEnabled();
});

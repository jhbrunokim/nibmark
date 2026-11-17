import { mkdirSync, writeFileSync } from 'node:fs';
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

test('Pantry API import explains project identity and nests representative ingredients', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Import SPDX', exact: true }).click();
  const link = page.getByRole('link', { name: 'Download Pantry API example SPDX' });
  const response = await page.request.get((await link.getAttribute('href'))!);
  expect(response.ok()).toBe(true);
  await page.getByLabel('Choose SPDX file').setInputFiles({
    name: 'pantry.spdx.json',
    mimeType: 'application/json',
    buffer: await response.body(),
  });
  await expect(page.getByRole('dialog')).toContainText('6 / 18 / 0');
  await expect(page.getByRole('dialog')).toContainText('Packages without a known purpose: 0');
  await page.getByRole('button', { name: 'Create label', exact: true }).click();
  await expect(page.locator('#nibmark-desc')).toContainText('Libraries: 19');
  await expect(page.locator('#nibmark-desc')).toContainText('Runtime edge: 4');
  await expect(page.locator('#nibmark-desc')).toContainText(
    'Supplier: Organization: Pantry Example',
  );
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  await (await download).saveAs(testInfo.outputPath('pantry-api.png'));
  await page.screenshot({ path: testInfo.outputPath('pantry-editor.png'), fullPage: true });
  if (process.env.UPDATE_SPDX_EXAMPLE === '1') {
    mkdirSync('docs/examples', { recursive: true });
    writeFileSync(
      'docs/examples/pantry-api.nibmark',
      await page.getByRole('textbox', { name: 'Nibmark source' }).inputValue(),
    );
    const svgDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download SVG', exact: true }).click();
    await (await svgDownload).saveAs('docs/assets/pantry-api.svg');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'docs/assets/pantry-playground.png', fullPage: false });
  }
});

for (const [file, count] of [
  ['syft-alpine.json', 3],
  ['syft-tag-value.spdx', 4],
  ['trivy-bom.json', 11],
  ['trivy-files.json', 2],
  ['trivy-empty.json', 0],
  ['tern-photon.json', 37],
  ['tern-photon.spdx', 37],
] as const) {
  test(`upstream ${file} imports and exports a readable PNG`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && m.text().includes('attribute d')) errors.push(m.text());
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Import SPDX', exact: true }).click();
    await page.getByLabel('Choose SPDX file').setInputFiles('tests/fixtures/spdx/upstream/' + file);
    if (file === 'syft-tag-value.spdx')
      await expect(page.getByRole('dialog')).toContainText('The source has no document name.');
    await page.getByRole('button', { name: 'Create label', exact: true }).click();
    await expect(page.locator('#nibmark-desc')).toContainText('Packages: ' + count + '.');
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
    expect(await (await pending).failure()).toBeNull();
    expect(errors).toEqual([]);
  });
}

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
    .getByLabel('Open source file')
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

test('SPDX import works in Korean on a narrow screen', async ({ page }, testInfo) => {
  const pathErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().includes('attribute d')) pathErrors.push(m.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '한국어', exact: true }).click();
  await page.getByRole('button', { name: 'SPDX 가져오기', exact: true }).click();
  await page.getByLabel('SPDX 파일 선택').setInputFiles('public/examples/pantry-api.spdx.json');
  await expect(page.getByRole('button', { name: '성분표 만들기', exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('spdx-import-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: '성분표 만들기', exact: true }).click();
  await expect(page.getByRole('button', { name: 'SVG 다운로드', exact: true })).toBeEnabled();
  await expect(page.locator('#nibmark-desc')).toContainText('패키지: 24');
  await expect(page.locator('#nibmark-desc')).toContainText('프레임워크: 1');
  await expect(page.locator('#nibmark-desc')).toContainText('fastify @ 1.0.0');
  await expect(page.locator('#nibmark-desc')).toContainText('Node.js REST API');
  const dateWidth = await page
    .locator('[data-testid=label-preview] svg > g > g')
    .last()
    .evaluate((el) => (el as SVGGraphicsElement).getBBox().width);
  expect(dateWidth).toBeGreaterThan(100);
  expect(pathErrors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('spdx-label-mobile.png'), fullPage: true });
});

test('upstream metadata gaps are explained and ambiguous identities do not replace the recipe', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '한국어', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Nibmark 문법 입력' });
  const before = await editor.inputValue();
  await page.getByRole('button', { name: 'SPDX 가져오기', exact: true }).click();
  const file = page.getByLabel('SPDX 파일 선택');
  await file.setInputFiles('tests/fixtures/spdx/upstream/trivy-no-relationship.json');
  await expect(page.getByRole('alert')).toContainText('문서·패키지의 SPDX ID');
  await expect(editor).toHaveValue(before);
  await file.setInputFiles('tests/fixtures/spdx/upstream/syft-tag-value.spdx');
  await expect(page.getByRole('dialog')).toContainText('원본에 문서 이름이 없습니다.');
  await expect(page.getByRole('dialog')).toContainText('PURL 생태계별로 구성했습니다.');
  await page.getByRole('button', { name: '성분표 만들기', exact: true }).click();
  await expect(page.locator('#nibmark-desc')).toContainText('Alpine: 1');
  await expect(page.locator('#nibmark-desc')).toContainText('Maven: 3');
  await expect(page.getByRole('button', { name: 'SVG 다운로드', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('upstream-fallback.png'), fullPage: true });
});

test('manual pins and section choices work on a Korean mobile screen', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '한국어', exact: true }).click();
  await page.getByRole('button', { name: 'SPDX 가져오기', exact: true }).click();
  await page.getByLabel('SPDX 파일 선택').setInputFiles('public/examples/pantry-api.spdx.json');
  await page.getByText('대표 성분과 표시 영역 선택', { exact: true }).click();
  await page.getByLabel('대표 성분 선택 방식').selectOption('manual');
  await page.getByLabel('패키지 검색').fill('library-20');
  await page.getByRole('checkbox', { name: /library-20 @/ }).check();
  await page.getByRole('checkbox', { name: '라이선스', exact: true }).uncheck();
  await page
    .locator('.import-presentation')
    .screenshot({ path: testInfo.outputPath('ingredient-picker.png') });
  await page.getByRole('button', { name: '성분표 만들기', exact: true }).click();
  await expect(page.locator('#nibmark-desc')).toContainText('library-20 @ 1.0.0');
  await expect(page.locator('#nibmark-desc')).not.toContainText('선언된 라이선스');
  await expect(page.locator('#nibmark-desc')).toContainText('패키지: 24');
  await expect(page.getByRole('button', { name: 'SVG 다운로드', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

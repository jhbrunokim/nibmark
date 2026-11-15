import { test, expect } from '@playwright/test';
import { shareURL } from '../../src/editor/share';
import { examples } from '../../src/examples';

test('share restores exact source and language in a fresh tab without changing the original', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const editor = page.getByRole('textbox', { name: 'Nibmark source' });
  const source = (await editor.inputValue()).replace('tiny-app', 'shared-project');
  await editor.fill(source);
  await page.getByRole('button', { name: '한국어', exact: true }).click();
  await page.getByRole('button', { name: '편집 링크 복사', exact: true }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('/#nibmark=v1.');
  expect(new URL(page.url()).hash).toBe('');
  const recipient = await context.newPage();
  const requests: string[] = [];
  recipient.on('request', (r) => requests.push(r.url()));
  await recipient.goto(url);
  await expect(recipient.getByRole('textbox', { name: 'Nibmark 문법 입력' })).toHaveValue(source);
  await expect(recipient.getByRole('button', { name: 'SVG 다운로드', exact: true })).toBeEnabled();
  await recipient
    .getByRole('textbox', { name: 'Nibmark 문법 입력' })
    .fill(source.replace('shared-project', 'my-copy'));
  await expect(page.getByRole('textbox', { name: 'Nibmark 문법 입력' })).toHaveValue(source);
  expect(
    requests.every((url) => !url.includes('nibmark=') && !url.includes('shared-project')),
  ).toBe(true);
});

test('bad links recover, same-tab links preserve undo, and clipboard denial offers a copyable link', async ({
  page,
}) => {
  await page.goto('/#nibmark=v9.broken');
  await expect(page.getByRole('alert')).toContainText('edit link is incomplete');
  await expect(page.getByRole('button', { name: 'Download SVG', exact: true })).toBeEnabled();
  const url = shareURL({ source: examples.korean, locale: 'ko' }, page.url());
  await page.evaluate((url) => {
    location.hash = new URL(url).hash;
  }, url);
  await expect(page.getByRole('textbox', { name: 'Nibmark 문법 입력' })).toHaveValue(
    examples.korean,
  );
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: '교체 되돌리기' }).click();
  await expect(page.getByRole('textbox', { name: 'Nibmark source' })).toHaveValue(examples.classic);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    });
  });
  await page.getByRole('button', { name: 'Copy edit link', exact: true }).click();
  await expect(page.getByLabel('Copy this edit link manually')).toHaveValue(/#nibmark=v1\./);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('oversized recipes can still be saved while invalid recipes cannot be shared', async ({
  page,
}) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Nibmark source' });
  await editor.fill(examples.classic + '\n#' + 'x'.repeat(10_000));
  await page.getByRole('button', { name: 'Copy edit link', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('too long for a share link');
  await expect(page.getByRole('button', { name: 'Save source', exact: true })).toBeEnabled();
  await editor.fill(examples.classic.replace('dependencies 128', 'dependencies 129'));
  await expect(page.getByRole('button', { name: 'Copy edit link', exact: true })).toBeDisabled();
});

import { describe, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from '../src/core';
import { readShare, shareURL } from '../src/editor/share';

const helper = 'skills/nibmark/scripts/edit_link.py';
function run(source: string, locale = 'en') {
  const directory = mkdtempSync(join(tmpdir(), 'nibmark-skill-'));
  try {
    const path = join(directory, 'recipe with spaces.nibmark');
    writeFileSync(path, source);
    return spawnSync('python3', [helper, path, '--locale', locale], { encoding: 'utf8' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('distributed skill', () => {
  it('ships a valid example that opens with the expected compact view', () => {
    const reference = readFileSync('skills/nibmark/references/syntax.md', 'utf8');
    const source = reference.match(/```nibmark\n([\s\S]*?)```/)![1];
    const parsed = parse(source);
    expect(parsed.ok && parsed.model.view).toBe('compact');
    const result = run(source);
    expect(result.status, result.stderr).toBe(0);
    expect(readShare(new URL(result.stdout.trim()).hash)).toEqual({ source, locale: 'en' });
  });
  it('matches the application share protocol for Unicode, quotes and CRLF in both locales', () => {
    const source = '# 한글 "quoted" \\ recipe\r\nnutrition v1\r\n';
    for (const locale of ['en', 'ko'] as const) {
      const result = run(source, locale);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout.trim()).toBe(
        shareURL({ source, locale }, 'https://jhbrunokim.github.io/nibmark/'),
      );
    }
  });
  it('reports oversized sources/links and invalid locale without printing a broken URL', () => {
    for (const [source, locale] of [
      ['x'.repeat(10000), 'en'],
      ['가'.repeat(20000), 'ko'],
      ['hello', 'fr'],
    ]) {
      const result = run(source, locale);
      expect(result.status).toBe(2);
      expect(result.stdout).toBe('');
      expect(result.stderr.length).toBeGreaterThan(0);
    }
  });
  it('reports missing input without printing a URL', () => {
    const result = spawnSync('python3', [helper, '/does-not-exist/nibmark-skill.nibmark'], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
  });
});

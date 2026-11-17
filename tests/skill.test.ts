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

it('ships a reproducible, complete portable ZIP whose helper runs after relocation', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nibmark-bundle-'));
  try {
    const output = join(directory, 'skill.zip');
    const packaged = spawnSync('python3', ['scripts/package_skill.py', '--output', output], {
      encoding: 'utf8',
    });
    expect(packaged.status, packaged.stderr).toBe(0);
    expect(readFileSync(output)).toEqual(readFileSync('public/downloads/nibmark-skill.zip'));
    const inspected = spawnSync(
      'python3',
      [
        '-c',
        `
import sys
from pathlib import Path
from zipfile import ZipFile
archive_path, destination = sys.argv[1:]
with ZipFile(archive_path) as archive:
    names = archive.namelist()
    expected = {'SKILL.md', 'LICENSE', 'agents/openai.yaml', 'references/syntax.md', 'references/spdx.md', 'scripts/edit_link.py'}
    assert set(names) == {'nibmark/' + name for name in expected}
    for name in names:
        assert archive.read(name) == (Path('skills') / name).read_bytes()
    archive.extractall(destination)
`,
        output,
        directory,
      ],
      { encoding: 'utf8' },
    );
    expect(inspected.status, inspected.stderr).toBe(0);
    const recipe = join(directory, 'recipe.nibmark');
    writeFileSync(recipe, '# relocated 한국어 recipe\n');
    const result = spawnSync(
      'python3',
      [join(directory, 'nibmark/scripts/edit_link.py'), recipe, '--locale', 'ko'],
      { cwd: directory, encoding: 'utf8' },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(readShare(new URL(result.stdout.trim()).hash)).toEqual({
      source: '# relocated 한국어 recipe\n',
      locale: 'ko',
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

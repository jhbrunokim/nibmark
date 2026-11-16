import { describe, it, expect } from 'vitest';
import { parse, percent } from '../src/core';
import { examples } from '../src/examples';

describe('Nibmark documents', () => {
  it.each(Object.entries(examples))('accepts the %s example', (_, source) =>
    expect(parse(source).ok).toBe(true),
  );
  it('preserves includes without adding them to group totals', () => {
    const result = parse(examples.classic);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.model.groups[0].items[1].includes[0].count).toBe(16);
  });
  it('preserves original line numbers inside a Markdown fence', () => {
    const result = parse(
      '```nibmark\n' + examples.classic.replace('dependencies 128', 'dependencies -1') + '```',
    );
    expect(result).toMatchObject({ ok: false, errors: [{ line: 6, column: 14 }] });
  });
  it('accepts fences, BOM and Windows line endings without changing the model', () => {
    const fenced =
      '\uFEFF\r\n```nibmark\r\n' + examples.classic.replaceAll('\n', '\r\n') + '```\r\n';
    const r = parse(fenced);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.model.dependencies).toBe(128);
  });
  it.each(['\n```nibmark\nnutrition v1\n```', '\nMore prose'])(
    'rejects content outside a single block: %s',
    (extra) => {
      expect(parse('```nibmark\n' + examples.classic + '```' + extra).ok).toBe(false);
    },
  );
  it.each([
    ['unknown version', examples.zero.replace('v1\n', 'v2\n')],
    ['unknown kind', examples.zero.replace('nutrition', 'nutritionish')],
    ['unsafe integer', examples.zero.replace('dependencies 0', 'dependencies 9007199254740992')],
    ['decimal', examples.zero.replace('dependencies 0', 'dependencies 1.5')],
    [
      'duplicate declaration',
      examples.zero.replace('dependencies 0', 'dependencies 0\ndependencies 0'),
    ],
    ['wrong indent', examples.zero.replace('  item', ' item')],
    ['tab', examples.zero.replace('  item', '\titem')],
    ['orphan includes', examples.zero.replace('  item "Direct" 0', '    includes "Direct" 0')],
    ['bad string', examples.zero.replace('"just-html"', '"just-html')],
    ['trailing tokens', examples.zero.replace('dependencies 0', 'dependencies 0 surprise')],
    ['empty group', 'nutrition v1\nproject "a"\ndependencies 0\ngroup "a" of dependencies'],
  ])('rejects %s', (_, source) => expect(parse(source).ok).toBe(false));
  it('reports a group mismatch and a child exceeding its parent', () => {
    const r = parse(
      examples.classic
        .replace('"Direct" 12', '"Direct" 10')
        .replace('"Optional" 16', '"Optional" 117'),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toHaveLength(2);
      expect(r.errors[0].message).toContain('126');
      expect(r.errors[1].message).toContain('parent');
    }
  });
  it('does not silently round large integer sums', () => {
    const r = parse(
      'nutrition v1\nproject "a"\ndependencies 9007199254740991\ngroup "a" of dependencies\n  item "a" 9007199254740991\n  item "b" 1',
    );
    expect(r.ok).toBe(false);
  });
  it('supports quotes, backslashes, newlines and literal markup as text', () => {
    const r = parse(
      examples.zero.replace('"just-html"', '"<script> & \\"quote\\" \\\\ path\\nnext"'),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.model.project).toBe('<script> & "quote" \\ path\nnext');
  });
  it('bounds text and total input before rendering', () => {
    expect(parse('x'.repeat(51201)).ok).toBe(false);
    expect(parse(examples.zero.replace('just-html', '가'.repeat(201))).ok).toBe(false);
    const rows = Array.from({ length: 101 }, (_, i) => `  item "${i}" 0`).join('\n');
    expect(
      parse(`nutrition v1\nproject "a"\ndependencies 0\ngroup "a" of dependencies\n${rows}`).ok,
    ).toBe(false);
  });
  it('does not assign a percentage to a zero denominator', () => {
    expect(percent(0, 0)).toBe('—');
    expect(percent(12, 128)).toBe('9%');
  });
});

it('accepts inventory and provenance keywords without changing dependency recipes', () => {
  const result = parse(
    'nutrition v1\nproject "demo"\nsource "SPDX-2.3"\ngenerator "Syft"\ncreated "2026-11-16"\npackages 1\ngroup "Licenses" of packages\n  item "MIT" 1',
  );
  expect(result.ok).toBe(true);
  if (result.ok)
    expect(result.model).toMatchObject({
      measure: 'packages',
      dependencies: 1,
      source: 'SPDX-2.3',
      generator: 'Syft',
      created: '2026-11-16',
    });
  expect(
    parse('nutrition v1\nproject "demo"\npackages 1\ngroup "Wrong" of dependencies\n  item "MIT" 1')
      .ok,
  ).toBe(false);
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../src/core';
import { readSpdx, toNibmark, type ImportOptions } from '../src/importers/spdx';
const doc = readSpdx(readFileSync('public/examples/pantry-api.spdx.json', 'utf8'));
function converted(options: ImportOptions = {}) {
  const result = toNibmark(doc, 'SPDXRef-App', 'en', options);
  const parsed = parse(result.source);
  if (!parsed.ok) throw Error(JSON.stringify(parsed.errors));
  return { ...result, model: parsed.model };
}
describe('import presentation choices', () => {
  it('preserves automatic selection when options are omitted or section values are undefined', () => {
    expect(converted({ sections: { licenses: undefined } }).source).toBe(converted().source);
    expect(converted().representativeCount).toBeGreaterThan(0);
  });
  it('pins a previously unlisted ingredient without changing any parent totals', () => {
    const chosen = doc.packages.find((p) => p.name === 'library-20')!;
    const automatic = converted();
    expect(automatic.source).not.toContain('includes "library-20');
    const result = converted({ representatives: [chosen.id] });
    expect(result).toMatchObject({ count: 24, direct: 6, transitive: 18, representativeCount: 1 });
    expect(result.source).toContain('includes "library-20 @ 1.0.0" 1');
    expect(result.source).not.toContain('includes "fastify');
    for (const group of result.model.groups)
      expect(group.items.reduce((n, i) => n + i.count, 0)).toBe(24);
  });
  it('allows twelve representatives in one category and intentionally empty manual selection', () => {
    const ids = doc.packages
      .filter((p) => p.purpose === 'LIBRARY')
      .slice(0, 12)
      .map((p) => p.id);
    expect(converted({ representatives: ids }).representativeCount).toBe(12);
    const empty = converted({ representatives: [] });
    expect(empty.representativeCount).toBe(0);
    expect(empty.count).toBe(24);
    expect(empty.model.groups[0].items.every((i) => !i.includes.length)).toBe(true);
  });
  it('rejects unknown, excluded-root and excessive pins while deduplicating repeated IDs', () => {
    expect(() => converted({ representatives: ['SPDXRef-Missing'] })).toThrow('selection');
    expect(() => converted({ representatives: ['SPDXRef-App'] })).toThrow('selection');
    expect(() =>
      converted({ representatives: doc.packages.slice(1, 14).map((p) => p.id) }),
    ).toThrow('selection');
    expect(converted({ representatives: ['SPDXRef-P0', 'SPDXRef-P0'] }).representativeCount).toBe(
      1,
    );
  });
  it('freezes a deterministic selection independent of input order or pin order', () => {
    const pins = ['SPDXRef-P1', 'SPDXRef-P0'];
    expect(
      toNibmark({ ...doc, packages: [...doc.packages].reverse() }, 'SPDXRef-App', 'en', {
        representatives: pins.slice().reverse(),
      }).source,
    ).toBe(converted({ representatives: pins }).source);
  });
  it('hides optional sections but retains composition, total, provenance and omission note', () => {
    const result = converted({
      sections: { relationships: false, licenses: false, ecosystems: false },
    });
    expect(result.model.groups.map((g) => g.label)).toEqual(['Composition']);
    expect(result.count).toBe(24);
    expect(result.model.source).toBe('SPDX-2.3 (JSON)');
    expect(result.model.note).toContain('Some sections hidden.');
  });
  it('retains fallback ecosystems as the main composition when their optional section is off', () => {
    const sparse = readSpdx(
      readFileSync('tests/fixtures/spdx/upstream/syft-tag-value.spdx', 'utf8'),
    );
    const selected = sparse.packages.find((p) => p.name === 'my-app')!;
    const result = toNibmark(sparse, undefined, 'en', {
      representatives: [selected.id],
      sections: { relationships: false, licenses: false, ecosystems: false },
    });
    const parsed = parse(result.source);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.model.groups.map((g) => g.label)).toEqual(['Package ecosystems']);
    // One selected identity pins the displayed name, whose inventory contains two records.
    expect(result.source).toContain('includes "my-app @ 1" 2');
    expect(parsed.model.note).toContain('Source metadata');
    expect(result.shortened).toBe(false);
  });
});

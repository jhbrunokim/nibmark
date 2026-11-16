import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parse } from '../src/core';
import { readSpdx, toNibmark } from '../src/importers/spdx';
const base = 'tests/fixtures/spdx/upstream/';
const read = (name: string) => readFileSync(base + name, 'utf8');
const sources = JSON.parse(read('sources.json')) as { file: string; sha256: string }[];
// Counts checked against the records/relationships in the pinned upstream files.
const cases = [
  {
    file: 'syft-alpine.json',
    total: 3,
    count: 3,
    root: undefined,
    basis: 'ecosystem',
    missingPurpose: 3,
  },
  {
    file: 'syft-tag-value.spdx',
    total: 4,
    count: 4,
    root: undefined,
    basis: 'ecosystem',
    missingPurpose: 4,
  },
  {
    file: 'trivy-bom.json',
    total: 12,
    count: 11,
    root: 'SPDXRef-ContainerImage-b5d81cde5f95c8fc',
    basis: 'ecosystem',
    missingPurpose: 11,
  },
  {
    file: 'trivy-files.json',
    total: 3,
    count: 2,
    root: 'SPDXRef-Filesystem-13b142ca391a006e',
    basis: 'purpose',
    missingPurpose: 0,
  },
  {
    file: 'trivy-empty.json',
    total: 1,
    count: 0,
    root: 'SPDXRef-ContainerImage-7f428bd075b13fe8',
    basis: 'purpose',
    missingPurpose: 0,
  },
  {
    file: 'tern-photon.json',
    total: 38,
    count: 37,
    root: 'SPDXRef-photon-3.0',
    basis: 'purpose',
    missingPurpose: 37,
  },
  {
    file: 'tern-photon.spdx',
    total: 38,
    count: 37,
    root: 'SPDXRef-photon-3.0',
    basis: 'purpose',
    missingPurpose: 37,
  },
] as const;

describe('pinned upstream SPDX interoperability', () => {
  it('keeps upstream fixtures unchanged and verifiable without network access', () => {
    for (const entry of sources)
      expect(
        createHash('sha256')
          .update(readFileSync(base + entry.file))
          .digest('hex'),
      ).toBe(entry.sha256);
  });
  it.each(cases)('summarizes $file in both languages', (entry) => {
    const doc = readSpdx(read(entry.file));
    expect(doc.packages).toHaveLength(entry.total);
    expect(doc.roots).toEqual(entry.root ? [entry.root] : []);
    for (const locale of ['en', 'ko'] as const) {
      const result = toNibmark(doc, entry.root, locale);
      expect(result).toMatchObject({
        count: entry.count,
        direct: 0,
        transitive: 0,
        unclassified: entry.count,
        unknownPurpose: entry.missingPurpose,
        compositionBasis: entry.basis,
      });
      const parsed = parse(result.source);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      for (const g of parsed.model.groups) {
        expect(g.items.reduce((n, i) => n + i.count, 0)).toBe(entry.count);
        for (const item of g.items)
          for (const child of item.includes) expect(child.count).toBeLessThanOrEqual(item.count);
      }
      expect(
        parsed.model.groups.flatMap((g) => g.items.flatMap((i) => [i, ...i.includes])).length,
      ).toBeLessThanOrEqual(100);
    }
  });
  it('recovers Syft missing document name explicitly and groups duplicate displayed names', () => {
    const doc = readSpdx(read('syft-tag-value.spdx'));
    expect(doc.warnings).toEqual(['missing-document-name']);
    const result = toNibmark(doc, undefined, 'en');
    expect(result.source).toContain('project "Untitled SBOM"');
    expect(result.source).toContain('includes "my-app @ 1" 2');
    expect(result.source).toContain('Source metadata is incomplete or nonstandard.');
  });
  it('rejects the upstream third-party document/package ID collision rather than guessing', () => {
    expect(() => readSpdx(read('trivy-no-relationship.json'))).toThrow('duplicate');
  });
  it('uses the selected Trivy application as root without treating containment as dependency', () => {
    const doc = readSpdx(read('trivy-bom.json'));
    const app = doc.packages.find((p) => p.name === 'composer')!;
    const result = toNibmark(doc, app.id, 'en');
    expect(result).toMatchObject({ count: 11, direct: 2, transitive: 0, unclassified: 9 });
  });
  it('keeps Tern JSON and Tag/Value package inventory and summaries equivalent', () => {
    const json = readSpdx(read('tern-photon.json'));
    const tag = readSpdx(read('tern-photon.spdx'));
    expect(tag.packages).toEqual(json.packages);
    const a = toNibmark(json, json.roots[0], 'en');
    const b = toNibmark(tag, tag.roots[0], 'en');
    expect(json.created).toBe('2022-02-10T19:17:51Z');
    expect(tag.created).toBe('2022-02-10T19:23:19Z');
    expect(b.source.replace('Tag/Value', 'JSON').replace(tag.created!, json.created!)).toBe(
      a.source,
    );
  });
});

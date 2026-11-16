import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { parse } from '../src/core';
import { readSpdx, toNibmark, MAX_SPDX_BYTES } from '../src/importers/spdx';
const json = readFileSync('public/examples/tiny-app.spdx.json', 'utf8');
const tag = readFileSync('tests/fixtures/spdx/example.spdx', 'utf8');
const raw = () => JSON.parse(json);
const document = (change: (r: ReturnType<typeof raw>) => void) => {
  const r = raw();
  change(r);
  return readSpdx(JSON.stringify(r));
};

describe('SPDX inventory conversion', () => {
  it('maps explicit relationships and excludes only the selected root', () => {
    const doc = readSpdx(json);
    expect(doc.roots).toEqual(['SPDXRef-App']);
    const output = toNibmark(doc, doc.roots[0], 'en');
    expect(output).toMatchObject({
      count: 3,
      direct: 1,
      transitive: 1,
      unclassified: 1,
      excluded: 1,
    });
    const parsed = parse(output.source);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.model).toMatchObject({
      measure: 'packages',
      source: 'SPDX-2.3 (JSON)',
      generator: 'Nibmark fictional example',
      created: '2026-11-16T00:00:00Z',
    });
    expect(parsed.model.groups[1].items).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'NOASSERTION', count: 1 })]),
    );
    expect(parsed.model.groups[2].items).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'npm', count: 2 })]),
    );
  });
  it('reads Tag/Value without counting files or field-like text blocks', () => {
    const doc = readSpdx(tag);
    expect(doc.packages).toHaveLength(4);
    const output = toNibmark(doc, 'SPDXRef-App', 'en');
    expect(output).toMatchObject({ count: 3, direct: 1, transitive: 1, unclassified: 1 });
    expect(output.source).toContain('SPDX-2.2 (Tag/Value)');
  });
  it('uses documentDescribes and inverse DESCRIBED_BY, leaving multiple roots explicit', () => {
    const doc = document((r) => {
      r.documentDescribes = ['SPDXRef-A'];
      r.relationships.push({
        spdxElementId: 'SPDXRef-B',
        relationshipType: 'DESCRIBED_BY',
        relatedSpdxElement: 'SPDXRef-DOCUMENT',
      });
    });
    expect(new Set(doc.roots)).toEqual(new Set(['SPDXRef-App', 'SPDXRef-A', 'SPDXRef-B']));
    expect(toNibmark(doc, undefined, 'en')).toMatchObject({
      count: 4,
      unclassified: 4,
      excluded: 0,
    });
  });
  it('handles cycles, duplicate edges and direct precedence without double counting', () => {
    const doc = document((r) => {
      r.relationships.push(
        r.relationships[1],
        {
          spdxElementId: 'SPDXRef-B',
          relationshipType: 'DEPENDS_ON',
          relatedSpdxElement: 'SPDXRef-App',
        },
        {
          spdxElementId: 'SPDXRef-App',
          relationshipType: 'DEPENDS_ON',
          relatedSpdxElement: 'SPDXRef-B',
        },
      );
    });
    expect(toNibmark(doc, 'SPDXRef-App', 'en')).toMatchObject({
      direct: 2,
      transitive: 0,
      unclassified: 1,
    });
  });
  it('respects inverse typed dependency edges and reports external references', () => {
    const doc = document((r) => {
      r.relationships[2].relationshipType = 'BUILD_DEPENDENCY_OF';
      r.relationships.push({
        spdxElementId: 'SPDXRef-A',
        relationshipType: 'DEPENDS_ON',
        relatedSpdxElement: 'DocumentRef-Other:SPDXRef-Pkg',
      });
    });
    expect(toNibmark(doc, 'SPDXRef-App', 'en')).toMatchObject({
      direct: 1,
      transitive: 1,
      unresolved: 1,
    });
  });
  it('distinguishes special relationship assertions from unresolved references', () => {
    const doc = document((r) => {
      for (const type of ['DEPENDS_ON', 'DEPENDENCY_OF']) {
        for (const target of ['NONE', 'NOASSERTION'])
          r.relationships.push({
            spdxElementId: 'SPDXRef-A',
            relationshipType: type,
            relatedSpdxElement: target,
          });
      }
    });
    expect(toNibmark(doc, 'SPDXRef-App', 'en')).toMatchObject({
      direct: 1,
      transitive: 1,
      unclassified: 1,
      unresolved: 0,
      unasserted: 2,
    });
  });
  it('keeps unfamiliar PURL types as literal labels', () => {
    const doc = document((r) => {
      r.packages[1].externalRefs = [
        {
          referenceType: 'purl',
          referenceLocator: 'pkg:constructor/example@1',
        },
      ];
    });
    expect(toNibmark(doc, undefined, 'en').source).toContain('item "constructor" 1');
  });
  it('rejects invalid local package identifiers', () => {
    expect(() =>
      document((r) => {
        r.packages[1].SPDXID = 'SPDXRef-bad_id';
      }),
    ).toThrow('invalid');
  });
  it('rejects a Tag/Value document without a package inventory', () => {
    expect(() =>
      readSpdx(
        'SPDXVersion: SPDX-2.3\nSPDXID: SPDXRef-DOCUMENT\nDocumentName: files\nFileName: a\nSPDXID: SPDXRef-a',
      ),
    ).toThrow('packages');
  });
  it('never treats contains-only inventories as direct dependencies', () => {
    const doc = document((r) => {
      for (const relationship of r.relationships)
        if (relationship.relationshipType !== 'DESCRIBES')
          relationship.relationshipType = 'CONTAINS';
    });
    expect(toNibmark(doc, 'SPDXRef-App', 'en')).toMatchObject({
      direct: 0,
      transitive: 0,
      unclassified: 3,
    });
  });
  it('preserves missing, NONE, NOASSERTION and full license expressions distinctly', () => {
    const doc = document((r) => {
      delete r.packages[0].licenseDeclared;
      r.packages[0].licenseConcluded = 'MIT';
      r.packages[1].licenseDeclared = 'NONE';
      r.packages[2].licenseDeclared = 'MIT OR Apache-2.0';
    });
    const result = toNibmark(doc, undefined, 'en');
    expect(result.source).toContain('item "Not declared" 1');
    expect(result.source).toContain('item "NONE" 1');
    expect(result.source).toContain('item "NOASSERTION" 1');
    expect(result.source).toContain('item "MIT OR Apache-2.0" 1');
  });
  it('groups large license distributions and keeps every package in the total', () => {
    const doc = document((r) => {
      r.packages = Array.from({ length: 300 }, (_, i) => ({
        SPDXID: `SPDXRef-${i}`,
        name: `lib-${i}`,
        licenseDeclared: `LicenseRef-${i}`,
      }));
      r.relationships = [];
    });
    const result = toNibmark(doc, undefined, 'ko');
    expect(result.grouped).toBe(280);
    const parsed = parse(result.source);
    expect(parsed.ok).toBe(true);
    if (parsed.ok)
      for (const group of parsed.model.groups)
        expect(group.items.reduce((n, i) => n + i.count, 0)).toBe(300);
  });
  it('escapes injected-looking names and discloses shortened display fields', () => {
    const doc = document((r) => {
      r.packages[0].name = 'name"\npackages 999\n';
      r.packages[1].licenseDeclared = 'A'.repeat(250);
      r.creationInfo.creators = ['Tool: ' + 'x'.repeat(300)];
    });
    const result = toNibmark(doc, 'SPDXRef-App', 'en');
    expect(result.shortened).toBe(true);
    expect(parse(result.source).ok).toBe(true);
    expect(result.count).toBe(3);
  });
  it('accepts an explicit empty package list but rejects file-only documents', () => {
    const doc = document((r) => {
      r.packages = [];
      r.relationships = [];
    });
    expect(toNibmark(doc, undefined, 'en').count).toBe(0);
    expect(() =>
      document((r) => {
        delete r.packages;
      }),
    ).toThrow('packages');
  });
  it.each(['SPDX-2.1', 'SPDX-3.0'])('rejects unsupported version %s', (version) => {
    expect(() =>
      document((r) => {
        r.spdxVersion = version;
      }),
    ).toThrow('version');
  });
  it('rejects malformed inputs, JSON-LD and conflicting IDs', () => {
    expect(() => readSpdx('{')).toThrow('invalid');
    expect(() => readSpdx('{"@context":"https://spdx.org/rdf/3.0.1/spdx-context.jsonld"}')).toThrow(
      'version',
    );
    expect(() => readSpdx('{"bomFormat":"CycloneDX"}')).toThrow('format');
    expect(() =>
      document((r) => {
        r.packages[1].SPDXID = r.packages[0].SPDXID;
      }),
    ).toThrow('duplicate');
    expect(() => readSpdx(tag + '\nPackageName: broken')).toThrow('invalid');
    expect(() => readSpdx(tag.replaceAll('</text>', ''))).toThrow('invalid');
  });
  it('bounds file and collection sizes', () => {
    expect(() => readSpdx(' '.repeat(MAX_SPDX_BYTES + 1))).toThrow('size');
    expect(() =>
      document((r) => {
        r.packages = Array.from({ length: 10001 }, (_, i) => ({
          SPDXID: `SPDXRef-${i}`,
          name: 'x',
        }));
      }),
    ).toThrow('limit');
  });
});

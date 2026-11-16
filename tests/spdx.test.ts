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
    expect(parsed.model.groups.find((g) => g.label === 'Declared licenses')!.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'NOASSERTION', count: 1 })]),
    );
    expect(parsed.model.groups.find((g) => g.label === 'Package ecosystems')!.items).toEqual(
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

  it('turns recorded purposes into parent rows and prioritizes direct named ingredients', () => {
    const doc = document((r) => {
      r.packages[0].summary = 'REST API backed by PostgreSQL';
      r.packages[0].supplier = 'Organization: Example';
      r.packages[1].primaryPackagePurpose = 'FRAMEWORK';
      r.packages[1].name = 'fastify';
      r.packages[2].primaryPackagePurpose = 'LIBRARY';
      r.packages[2].name = 'pg';
    });
    const result = toNibmark(doc, 'SPDXRef-App', 'en');
    expect(result).toMatchObject({ unknownPurpose: 1, representativeCount: 3 });
    const parsed = parse(result.source);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.model).toMatchObject({
      description: 'REST API backed by PostgreSQL',
      supplier: 'Organization: Example',
    });
    expect(parsed.model.groups[0].items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Frameworks',
          count: 1,
          includes: [expect.objectContaining({ label: 'fastify @ 1.0.0', count: 1 })],
        }),
        expect.objectContaining({
          label: 'Libraries',
          count: 1,
          includes: [expect.objectContaining({ label: 'pg @ 2.0.0', count: 1 })],
        }),
        expect.objectContaining({ label: 'Unspecified purpose', count: 1 }),
      ]),
    );
    expect(parse(toNibmark(doc, undefined, 'en').source)).not.toMatchObject({
      model: { description: 'REST API backed by PostgreSQL' },
    });
  });
  it('reads purpose, description and supplier from Tag/Value text blocks', () => {
    // Append these fields immediately after a package header, before its other fields.
    const enriched = readSpdx(
      tag.replace(
        /PackageName: ([^\n]+)/,
        '$&\nPrimaryPackagePurpose: APPLICATION\nPackageSummary: <text>A service\nwith an API</text>\nPackageSupplier: Organization: Example',
      ),
    );
    expect(enriched.packages[0]).toMatchObject({
      purpose: 'APPLICATION',
      summary: 'A service\nwith an API',
      supplier: 'Organization: Example',
    });
    expect(toNibmark(enriched, enriched.packages[0].id, 'en').source).toContain(
      'description "A service with an API"',
    );
    expect(enriched.packages).toHaveLength(4);
  });
  it('does not guess framework purposes from popular package names', () => {
    const doc = document((r) => {
      r.packages[1].name = 'react';
      r.packages[1].primaryPackagePurpose = 'FUTURE-PURPOSE';
    });
    const result = toNibmark(doc, 'SPDXRef-App', 'en');
    expect(result.unknownPurpose).toBe(3);
    expect(result.source).toContain('item "Unspecified purpose" 3');
    expect(result.source).not.toContain('item "Frameworks"');
  });
  it('deduplicates typed edges, permits overlap and never inherits runtime scope', () => {
    const doc = document((r) => {
      r.relationships = [
        {
          spdxElementId: 'SPDXRef-A',
          relationshipType: 'RUNTIME_DEPENDENCY_OF',
          relatedSpdxElement: 'SPDXRef-App',
        },
        {
          spdxElementId: 'SPDXRef-A',
          relationshipType: 'RUNTIME_DEPENDENCY_OF',
          relatedSpdxElement: 'SPDXRef-App',
        },
        {
          spdxElementId: 'SPDXRef-A',
          relationshipType: 'DEV_DEPENDENCY_OF',
          relatedSpdxElement: 'SPDXRef-App',
        },
        {
          spdxElementId: 'SPDXRef-A',
          relationshipType: 'DEPENDS_ON',
          relatedSpdxElement: 'SPDXRef-B',
        },
        // An unreachable parent must not classify B as a test dependency.
        {
          spdxElementId: 'SPDXRef-B',
          relationshipType: 'TEST_DEPENDENCY_OF',
          relatedSpdxElement: 'SPDXRef-C',
        },
      ];
    });
    const result = toNibmark(doc, 'SPDXRef-App', 'en');
    const parsed = parse(result.source);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const rows = parsed.model.groups.find((g) => g.label === 'Recorded relationships')!.items;
    expect(rows[0].includes.map((i) => [i.label, i.count])).toEqual([
      ['Runtime edge', 1],
      ['Development edge', 1],
    ]);
    expect(rows[1]).toMatchObject({ count: 1, includes: [] });
    expect(rows[2]).toMatchObject({ count: 1, includes: [] });
  });
  it('prioritizes direct representatives, aggregates same name/version and bounds every group', () => {
    const doc = document((r) => {
      r.packages = [
        r.packages[0],
        ...Array.from({ length: 400 }, (_, i) => ({
          SPDXID: 'SPDXRef-' + i,
          name: i < 2 ? 'z-direct' : 'a-' + i,
          versionInfo: '1',
          primaryPackagePurpose: 'LIBRARY',
          licenseDeclared: 'LicenseRef-' + i,
          externalRefs: [
            { referenceType: 'purl', referenceLocator: 'pkg:ecosystem' + i + '/package' },
          ],
        })),
      ];
      r.relationships = [
        {
          spdxElementId: 'SPDXRef-App',
          relationshipType: 'DEPENDS_ON',
          relatedSpdxElement: 'SPDXRef-0',
        },
      ];
    });
    const result = toNibmark(doc, 'SPDXRef-App', 'en');
    const parsed = parse(result.source);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.model.groups[0].items[0].includes[0]).toMatchObject({
      label: 'z-direct @ 1',
      count: 2,
    });
    expect(result.representativeCount).toBe(3);
    for (const group of parsed.model.groups)
      expect(group.items.reduce((n, i) => n + i.count, 0)).toBe(400);
    expect(
      toNibmark({ ...doc, packages: [...doc.packages].reverse() }, 'SPDXRef-App', 'en').source,
    ).toBe(result.source);
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

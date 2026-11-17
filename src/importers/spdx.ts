import { parse, type Locale } from '../core';

export const MAX_SPDX_BYTES = 5 * 1024 * 1024;
const MAX_PACKAGES = 10_000;
const MAX_RELATIONSHIPS = 100_000;
export type ImportErrorCode =
  'size' | 'format' | 'version' | 'invalid' | 'packages' | 'limit' | 'duplicate' | 'selection';
export class SpdxError extends Error {
  constructor(public code: ImportErrorCode) {
    super(code);
  }
}
export interface SpdxPackage {
  id: string;
  name: string;
  version?: string;
  license?: string;
  purpose?: string;
  summary?: string;
  description?: string;
  supplier?: string;
  purls: string[];
}
export interface SpdxRelationship {
  from: string;
  type: string;
  to: string;
}
export type SpdxWarning = 'missing-document-name' | 'nonstandard-document-id';
export interface SpdxDocument {
  warnings: SpdxWarning[];
  version: string;
  format: 'JSON' | 'Tag/Value';
  id: string;
  name: string;
  packages: SpdxPackage[];
  relationships: SpdxRelationship[];
  roots: string[];
  generator?: string;
  created?: string;
}
type RecordValue = Record<string, unknown>;
const bad = (code: ImportErrorCode): never => {
  throw new SpdxError(code);
};
function object(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return bad('invalid');
  return value as RecordValue;
}
function string(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return bad('invalid');
  return value;
}
function optional(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return string(value);
}
function displayText(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return bad('invalid');
  return value.trim() ? value : undefined;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) return bad('invalid');
  return value;
}

// Parse only needed SPDX fields. This is an inventory importer, not a full SPDX validator.
export function readSpdx(input: string): SpdxDocument {
  if (new TextEncoder().encode(input).byteLength > MAX_SPDX_BYTES) return bad('size');
  const text = input.replace(/^\uFEFF/, '').trim();
  let raw: RecordValue;
  let format: SpdxDocument['format'];
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      raw = object(JSON.parse(text));
    } catch {
      return bad('invalid');
    }
    if ('@context' in raw || '@graph' in raw || String(raw.spdxVersion).startsWith('SPDX-3'))
      return bad('version');
    if (!('spdxVersion' in raw)) return bad('format');
    format = 'JSON';
  } else {
    if (!/^SPDXVersion\s*:/m.test(text)) return bad('format');
    raw = readTagValue(text);
    format = 'Tag/Value';
  }
  const version = string(raw.spdxVersion);
  if (!['SPDX-2.2', 'SPDX-2.3'].includes(version)) return bad('version');
  const id = string(raw.SPDXID);
  if (!/^SPDXRef-[a-zA-Z0-9.-]+$/.test(id)) return bad('invalid');
  const warnings: SpdxWarning[] = [];
  if (id !== 'SPDXRef-DOCUMENT') warnings.push('nonstandard-document-id');
  const name = displayText(raw.name);
  if (!name) warnings.push('missing-document-name');
  if (raw.packages === undefined) return bad('packages');
  const packagesRaw = list(raw.packages);
  if (packagesRaw.length > MAX_PACKAGES) return bad('limit');
  const ids = new Set([id]);
  const packages = packagesRaw.map((value) => {
    const p = object(value);
    const pid = string(p.SPDXID);
    if (!/^SPDXRef-[a-zA-Z0-9.-]+$/.test(pid)) return bad('invalid');
    if (ids.has(pid)) return bad('duplicate');
    ids.add(pid);
    const purls = (p.externalRefs === undefined ? [] : list(p.externalRefs)).flatMap((value) => {
      const ref = object(value);
      return ref.referenceType === 'purl' ? [string(ref.referenceLocator)] : [];
    });
    return {
      id: pid,
      name: string(p.name),
      version: optional(p.versionInfo),
      license: optional(p.licenseDeclared),
      purpose: optional(p.primaryPackagePurpose),
      summary: displayText(p.summary),
      description: displayText(p.description),
      supplier: optional(p.supplier),
      purls,
    };
  });
  const relationsRaw = raw.relationships === undefined ? [] : list(raw.relationships);
  if (relationsRaw.length > MAX_RELATIONSHIPS) return bad('limit');
  const relationships = relationsRaw.map((value) => {
    const r = object(value);
    return {
      from: string(r.spdxElementId),
      type: string(r.relationshipType),
      to: string(r.relatedSpdxElement),
    };
  });
  const roots = new Set(
    raw.documentDescribes === undefined ? [] : list(raw.documentDescribes).map(string),
  );
  for (const r of relationships) {
    if (r.from === id && r.type === 'DESCRIBES') roots.add(r.to);
    if (r.to === id && r.type === 'DESCRIBED_BY') roots.add(r.from);
  }
  const info = raw.creationInfo === undefined ? {} : object(raw.creationInfo);
  const creators = info.creators === undefined ? [] : list(info.creators).map(string);
  return {
    version,
    format,
    id,
    name: name ?? 'Untitled SBOM',
    warnings,
    packages,
    relationships,
    roots: [...roots].filter((ref) => ref !== id && ids.has(ref)),
    generator:
      creators
        .filter((c) => c.startsWith('Tool:'))
        .map((c) => c.slice(5).trim())
        .join('; ') || undefined,
    created: optional(info.created),
  };
}

function readTagValue(text: string): RecordValue {
  const raw: RecordValue = { packages: [], relationships: [], creationInfo: { creators: [] } };
  const packages = raw.packages as RecordValue[];
  const relationships = raw.relationships as RecordValue[];
  const info = raw.creationInfo as RecordValue;
  let pkg: RecordValue | undefined;
  let section: 'document' | 'package' | 'other' = 'document';
  const lines = text.split(/\r?\n/);
  function assign(target: RecordValue, key: string, value: string) {
    if (target[key] !== undefined) return bad('duplicate');
    target[key] = value;
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line);
    if (!match) return bad('invalid');
    const tag = match[1];
    let value = match[2];
    // Consume complete text blocks, including fields we do not otherwise use.
    if (value.startsWith('<text>')) {
      const chunks = [value.slice(6)];
      while (!chunks[chunks.length - 1].includes('</text>')) {
        if (++i >= lines.length) return bad('invalid');
        chunks.push(lines[i]);
      }
      const joined = chunks.join('\n');
      const end = joined.indexOf('</text>');
      if (joined.slice(end + 7).trim()) return bad('invalid');
      value = joined.slice(0, end);
    }
    if (tag === 'PackageName') {
      pkg = { name: value, externalRefs: [] };
      packages.push(pkg);
      section = 'package';
      if (packages.length > MAX_PACKAGES) return bad('limit');
      continue;
    }
    if (['FileName', 'SnippetSPDXID', 'LicenseID', 'Annotator', 'Reviewer'].includes(tag)) {
      section = 'other';
      pkg = undefined;
    }
    if (tag === 'SPDXVersion') assign(raw, 'spdxVersion', value);
    else if (tag === 'DocumentName') assign(raw, 'name', value);
    else if (tag === 'SPDXID') {
      if (section === 'document') assign(raw, 'SPDXID', value);
      else if (pkg) assign(pkg, 'SPDXID', value);
    } else if (tag === 'Creator') (info.creators as string[]).push(value);
    else if (tag === 'Created') assign(info, 'created', value);
    else if (tag === 'Relationship') {
      const parts = value.trim().split(/\s+/);
      if (parts.length !== 3) return bad('invalid');
      relationships.push({
        spdxElementId: parts[0],
        relationshipType: parts[1],
        relatedSpdxElement: parts[2],
      });
      if (relationships.length > MAX_RELATIONSHIPS) return bad('limit');
    } else if (pkg) {
      if (tag === 'PackageVersion') assign(pkg, 'versionInfo', value);
      else if (tag === 'PackageLicenseDeclared') assign(pkg, 'licenseDeclared', value);
      else if (tag === 'PrimaryPackagePurpose') assign(pkg, 'primaryPackagePurpose', value);
      else if (tag === 'PackageSummary') assign(pkg, 'summary', value);
      else if (tag === 'PackageDescription') assign(pkg, 'description', value);
      else if (tag === 'PackageSupplier') assign(pkg, 'supplier', value);
      else if (tag === 'ExternalRef') {
        const parts = value.trim().split(/\s+/);
        if (parts.length !== 3) return bad('invalid');
        (pkg.externalRefs as RecordValue[]).push({
          referenceType: parts[1],
          referenceLocator: parts[2],
        });
      }
    }
  }
  if (!packages.length) return bad('packages');
  return raw;
}

export const MAX_PINNED_PACKAGES = 12;
export interface ImportOptions {
  // Undefined uses automatic representatives; an empty array intentionally shows no names.
  representatives?: readonly string[];
  sections?: { relationships?: boolean; licenses?: boolean; ecosystems?: boolean };
}
export interface ImportSummary {
  source: string;
  count: number;
  direct: number;
  transitive: number;
  unclassified: number;
  excluded: number;
  unresolved: number;
  unasserted: number;
  grouped: number;
  shortened: boolean;
  unknownPurpose: number;
  representativeCount: number;
  compositionBasis: 'purpose' | 'ecosystem';
}
const reverseDependencies = new Set([
  'DEPENDENCY_OF',
  'BUILD_DEPENDENCY_OF',
  'DEV_DEPENDENCY_OF',
  'OPTIONAL_DEPENDENCY_OF',
  'PROVIDED_DEPENDENCY_OF',
  'TEST_DEPENDENCY_OF',
  'RUNTIME_DEPENDENCY_OF',
]);
const purposeNames = new Map<string, [string, string]>([
  ['FRAMEWORK', ['Frameworks', '프레임워크']],
  ['LIBRARY', ['Libraries', '라이브러리']],
  ['APPLICATION', ['Applications', '애플리케이션']],
  ['CONTAINER', ['Containers', '컨테이너']],
  ['OPERATING-SYSTEM', ['Operating systems', '운영체제']],
  ['DEVICE', ['Devices', '장치']],
  ['FIRMWARE', ['Firmware', '펌웨어']],
  ['SOURCE', ['Source packages', '소스 패키지']],
  ['ARCHIVE', ['Archives', '아카이브']],
  ['FILE', ['Standalone files', '독립 파일 패키지']],
  ['INSTALL', ['Installers', '설치 프로그램']],
  ['OTHER', ['Other purposes', '기타 용도']],
]);
const scopeNames = new Map<string, [string, string]>([
  ['RUNTIME_DEPENDENCY_OF', ['Runtime edge', '실행 관계']],
  ['DEV_DEPENDENCY_OF', ['Development edge', '개발 관계']],
  ['BUILD_DEPENDENCY_OF', ['Build edge', '빌드 관계']],
  ['TEST_DEPENDENCY_OF', ['Test edge', '테스트 관계']],
  ['OPTIONAL_DEPENDENCY_OF', ['Optional edge', '선택 관계']],
  ['PROVIDED_DEPENDENCY_OF', ['Provided edge', '외부 제공 관계']],
]);
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const ecosystemNames: Record<string, string> = {
  npm: 'npm',
  pypi: 'PyPI',
  maven: 'Maven',
  golang: 'Go',
  cargo: 'Cargo',
  nuget: 'NuGet',
  gem: 'RubyGems',
  composer: 'Composer',
  deb: 'Debian',
  apk: 'Alpine',
  rpm: 'RPM',
};

function ecosystem(p: SpdxPackage, ko: boolean): string {
  const types = new Set(
    p.purls
      .map((url) => /^pkg:([a-z][a-z0-9.+-]*)\//.exec(url)?.[1])
      .filter((v): v is string => !!v),
  );
  if (types.size > 1) return ko ? '여러 생태계' : 'Multiple ecosystems';
  const type = [...types][0];
  return type
    ? Object.hasOwn(ecosystemNames, type)
      ? ecosystemNames[type]
      : type
    : ko
      ? '미확인'
      : 'Unknown';
}

export function toNibmark(
  doc: SpdxDocument,
  rootId: string | undefined,
  locale: Locale,
  options: ImportOptions = {},
): ImportSummary {
  const ko = locale === 'ko';
  const root = rootId ? doc.packages.find((p) => p.id === rootId) : undefined;
  if (rootId && !root) return bad('invalid');
  const allIds = new Set(doc.packages.map((p) => p.id));
  const inventory = doc.packages.filter((p) => p.id !== rootId);
  const selected =
    options.representatives === undefined ? undefined : new Set(options.representatives);
  if (
    selected &&
    (selected.size > MAX_PINNED_PACKAGES ||
      [...selected].some((id) => !allIds.has(id) || id === rootId))
  )
    return bad('selection');
  const sections = {
    relationships: options.sections?.relationships !== false,
    licenses: options.sections?.licenses !== false,
    ecosystems: options.sections?.ecosystems !== false,
  };
  const edges = new Map<string, Set<string>>();
  const typedEdges: { from: string; to: string; type: string }[] = [];
  let unresolved = 0;
  let unasserted = 0;
  for (const r of doc.relationships) {
    if (r.type !== 'DEPENDS_ON' && !reverseDependencies.has(r.type)) continue;
    // Special RHS markers are assertions, not element identifiers (SPDX §11.1).
    if (r.to === 'NONE') continue;
    if (r.to === 'NOASSERTION') {
      unasserted++;
      continue;
    }
    let from = r.from,
      to = r.to;
    if (reverseDependencies.has(r.type)) [from, to] = [to, from];
    else if (r.type !== 'DEPENDS_ON') continue;
    if (!allIds.has(from) || !allIds.has(to)) {
      unresolved++;
      continue;
    }
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from)!.add(to);
    if (scopeNames.has(r.type)) typedEdges.push({ from, to, type: r.type });
  }
  const directIds = new Set(
    rootId ? [...(edges.get(rootId) ?? [])].filter((id) => id !== rootId) : [],
  );
  const reached = new Set(rootId ? [rootId, ...directIds] : []);
  const queue = [...directIds];
  for (let i = 0; i < queue.length; i++) {
    for (const id of edges.get(queue[i]) ?? [])
      if (!reached.has(id)) {
        reached.add(id);
        queue.push(id);
      }
  }
  const direct = directIds.size;
  const transitive = inventory.filter((p) => reached.has(p.id) && !directIds.has(p.id)).length;
  const unclassified = inventory.length - direct - transitive;
  let shortened = false;
  const clean = (text: string) => {
    const normalized = text.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    const chars = Array.from(normalized);
    if (normalized !== text || chars.length > 200) shortened = true;
    return chars.length > 200 ? chars.slice(0, 199).join('') + '…' : normalized;
  };
  const quote = (s: string) => JSON.stringify(clean(s));
  const lines = [
    'nutrition v1',
    `project ${quote(root?.name ?? (doc.warnings.includes('missing-document-name') && ko ? '이름 없는 SBOM' : doc.name))}${root?.version ? ' version ' + quote(root.version) : ''}`,
    `serving ${quote(ko ? 'SBOM 1개' : '1 SBOM')}`,
    `scope ${quote(ko ? 'SBOM 패키지 목록 · 모든 범위' : 'SBOM package inventory · all scopes')}`,
    `source ${quote(`${doc.version} (${doc.format})`)}`,
  ];

  const rootDescription = root?.summary ?? root?.description;
  if (rootDescription) lines.push(`description ${quote(rootDescription)}`);
  if (root?.supplier) lines.push(`supplier ${quote(root.supplier)}`);
  if (doc.generator) lines.push(`generator ${quote(doc.generator)}`);
  if (doc.created) lines.push(`created ${quote(doc.created)}`);
  lines.push(`packages ${inventory.length}`);
  const purposeBuckets = new Map<string, SpdxPackage[]>();
  for (const p of inventory) {
    const key = p.purpose && purposeNames.has(p.purpose) ? p.purpose : 'UNKNOWN';
    if (!purposeBuckets.has(key)) purposeBuckets.set(key, []);
    purposeBuckets.get(key)!.push(p);
  }
  const unknownPurpose = purposeBuckets.get('UNKNOWN')?.length ?? 0;
  let grouped = 0;
  let representativeCount = 0;
  const unknownEcosystem = ko ? '미확인' : 'Unknown';
  const useEcosystems =
    inventory.length > 0 &&
    unknownPurpose === inventory.length &&
    inventory.some((p) => ecosystem(p, ko) !== unknownEcosystem);
  const compositionBasis = useEcosystems ? 'ecosystem' : 'purpose';
  let composition: [string, SpdxPackage[]][];
  if (useEcosystems) {
    const buckets = new Map<string, SpdxPackage[]>();
    for (const p of inventory) {
      const label = ecosystem(p, ko);
      if (!buckets.has(label)) buckets.set(label, []);
      buckets.get(label)!.push(p);
    }
    const sorted = [...buckets].sort((a, b) => b[1].length - a[1].length || compare(a[0], b[0]));
    composition = sorted.slice(0, 20);
    if (sorted.length > 20) {
      grouped += sorted.length - 20;
      composition.push([
        ko ? '기타 생태계 (묶음)' : 'Other ecosystems (grouped)',
        sorted.slice(20).flatMap(([, members]) => members),
      ]);
    }
  } else {
    composition = [...purposeNames.keys(), 'UNKNOWN'].flatMap((key) => {
      const members = purposeBuckets.get(key);
      return members
        ? [
            [
              purposeNames.get(key)?.[ko ? 1 : 0] ?? (ko ? '용도 미확인' : 'Unspecified purpose'),
              members,
            ] as [string, SpdxPackage[]],
          ]
        : [];
    });
  }
  lines.push(
    '',
    `group ${quote(useEcosystems ? (ko ? '패키지 생태계' : 'Package ecosystems') : ko ? '구성 요소' : 'Composition')} of packages`,
  );
  if (!inventory.length) lines.push(`  item ${quote(ko ? '없음' : 'None listed')} 0`);
  // At most 12 named rows overall leave room under MAX_ROWS. Automatic mode uses up to 3 per category.
  for (const [title, members] of composition) {
    lines.push(`  item ${quote(title)} ${members.length}`);
    const names = new Map<string, { count: number; direct: boolean; selected: boolean }>();
    for (const p of members) {
      const label = clean(p.name + (p.version ? ' @ ' + p.version : ''));
      const previous = names.get(label);
      names.set(label, {
        count: (previous?.count ?? 0) + 1,
        direct: !!previous?.direct || directIds.has(p.id),
        selected: !!previous?.selected || !!selected?.has(p.id),
      });
    }
    const representatives = [...names]
      .filter(([, value]) => selected === undefined || value.selected)
      .sort((a, b) => Number(b[1].direct) - Number(a[1].direct) || compare(a[0], b[0]));
    for (const [label, value] of representatives.slice(
      0,
      Math.min(
        selected === undefined ? 3 : MAX_PINNED_PACKAGES,
        MAX_PINNED_PACKAGES - representativeCount,
      ),
    )) {
      lines.push(`    includes ${quote(label)} ${value.count}`);
      representativeCount++;
    }
  }
  if (sections.relationships)
    lines.push(
      '',
      `group ${quote(ko ? '기록된 의존 관계' : 'Recorded relationships')} of packages`,
    );
  const typedMembers = new Map<string, Set<string>>();
  for (const edge of typedEdges) {
    // Classify only edges participating in this root's reachable graph.
    // Direct records require an edge to the root, not a different transitive parent.
    if (!reached.has(edge.from) || edge.to === rootId) continue;
    if (directIds.has(edge.to) && edge.from !== rootId) continue;
    if (!typedMembers.has(edge.type)) typedMembers.set(edge.type, new Set());
    typedMembers.get(edge.type)!.add(edge.to);
  }
  const partitions = [
    [ko ? '직접 관계' : 'Direct', inventory.filter((p) => directIds.has(p.id))],
    [
      ko ? '간접 관계' : 'Transitive',
      inventory.filter((p) => reached.has(p.id) && !directIds.has(p.id)),
    ],
    [ko ? '미분류' : 'Unclassified', inventory.filter((p) => !reached.has(p.id))],
  ] as const;
  for (const [label, members] of sections.relationships ? partitions : []) {
    lines.push(`  item ${quote(label)} ${members.length}`);
    for (const [type, names] of scopeNames) {
      const count = members.filter((p) => typedMembers.get(type)?.has(p.id)).length;
      if (count) lines.push(`    includes ${quote(names[ko ? 1 : 0])} ${count}`);
    }
  }
  function group(title: string, labels: string[]) {
    const counts = new Map<string, number>();
    for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
    const sorted = [...counts].sort(
      (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
    );
    lines.push('', `group ${quote(title)} of packages`);
    if (!sorted.length) sorted.push([ko ? '없음' : 'None listed', 0]);
    for (const [label, count] of sorted.slice(0, 20)) lines.push(`  item ${quote(label)} ${count}`);
    if (sorted.length > 20) {
      grouped += sorted.length - 20;
      lines.push(
        `  item ${quote(ko ? '기타 항목 (묶음)' : 'Other entries (grouped)')} ${sorted.slice(20).reduce((n, r) => n + r[1], 0)}`,
      );
    }
  }
  if (sections.licenses)
    group(
      ko ? '선언된 라이선스' : 'Declared licenses',
      inventory.map((p) => {
        if (p.license === undefined) return ko ? '선언 누락' : 'Not declared';
        if (Array.from(p.license).length > 200 || /[\u0000-\u001f\u007f]/.test(p.license)) {
          shortened = true;
          return ko ? '긴 라이선스 선언 (원본 참조)' : 'Long license declarations (see SBOM)';
        }
        return p.license;
      }),
    );
  if (!useEcosystems && sections.ecosystems)
    group(
      ko ? '패키지 생태계' : 'Package ecosystems',
      inventory.map((p) => ecosystem(p, ko)),
    );
  const notes = ko
    ? [
        useEcosystems
          ? '용도 정보가 없어 PURL 생태계로 구성했습니다.'
          : '용도는 SBOM 기록 기준입니다.',
        '대표 패키지만 표시합니다. 관계는 불완전하거나 중복될 수 있으며 실행 범위를 추정하지 않습니다.',
      ]
    : [
        useEcosystems
          ? 'No purpose data; grouped by PURL ecosystem.'
          : 'Purposes follow SBOM records.',
        'Selected names only. Edges may be incomplete or overlap; runtime scope is not inferred.',
      ];
  if (!sections.relationships || !sections.licenses || (!useEcosystems && !sections.ecosystems))
    notes.push(ko ? '일부 영역은 숨겼습니다.' : 'Some sections hidden.');
  if (doc.warnings.length)
    notes.push(
      ko
        ? '원본 문서 메타데이터가 불완전하거나 비표준입니다.'
        : 'Source metadata is incomplete or nonstandard.',
    );
  lines.push('', `note ${quote(notes.join(' '))}`);
  const source = lines.join('\n') + '\n';
  if (!parse(source).ok) return bad('invalid');
  return {
    source,
    count: inventory.length,
    direct,
    transitive,
    unclassified,
    excluded: root ? 1 : 0,
    unresolved,
    unasserted,
    grouped,
    shortened,
    unknownPurpose,
    representativeCount,
    compositionBasis,
  };
}

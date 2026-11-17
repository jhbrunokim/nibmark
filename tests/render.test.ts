import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse as fontParse } from 'opentype.js';
import { parse } from '../src/core';
import { render } from '../src/renderer/render';
import { Typography, type Fonts } from '../src/renderer/typography';
import { examples } from '../src/examples';
import { filename, markdown } from '../src/editor/exports';

function font(path: string) {
  const b = readFileSync(path);
  return fontParse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
}
let fonts: Fonts;
beforeAll(() => {
  fonts = {
    regular: font('node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff'),
    bold: font('node_modules/@fontsource/roboto/files/roboto-latin-700-normal.woff'),
    black: font('node_modules/@fontsource/roboto/files/roboto-latin-900-normal.woff'),
    koreanRegular: font('public/fonts/NibmarkHangul-Regular.woff'),
    koreanBold: font('public/fonts/NibmarkHangul-Bold.woff'),
  };
});
function model(source: string) {
  const r = parse(source);
  if (!r.ok) throw Error(JSON.stringify(r.errors));
  return r.model;
}
describe('portable label rendering', () => {
  it('exports deterministic path-based SVG without runtime or font dependencies', () => {
    const first = render(model(examples.classic), fonts);
    expect(first).toEqual(render(model(examples.classic), fonts));
    expect(first.svg).toContain('<path');
    expect(first.svg).not.toMatch(/<text|<script|<foreignObject|<image|@font-face|href=/);
    expect(first.description).toContain('Transitive: 116 (91%)');
    expect(first.height).toBeGreaterThan(450);
  });
  it('renders project description and supplier without treating their values as markup', () => {
    const m = model(examples.zero);
    m.description = 'A REST API <service> & database';
    m.supplier = 'Organization: Example';
    const output = render(m, fonts);
    expect(output.height).toBeGreaterThan(render(model(examples.zero), fonts).height);
    expect(output.description).toContain(m.description);
    expect(output.description).toContain('Supplier: Organization: Example');
    expect(output.svg).toContain('&lt;service&gt;');
    expect(output.svg).not.toContain('<service>');
  });
  it('treats malicious-looking text as accessible text, never markup', () => {
    const source = examples.zero.replace('just-html', '<script>alert(1)</script> & test');
    const output = render(model(source), fonts);
    expect(output.svg).not.toContain('<script>');
    expect(output.svg).toContain('&lt;script&gt;');
    expect(output.svg).toContain('&amp; test');
  });
  it('renders Korean using bundled glyphs and translated label furniture', () => {
    const output = render(model(examples.korean), fonts, 'ko');
    expect(output.description).toContain('소프트웨어 성분표');
    expect(output.description).toContain('간접 의존성: 18 (75%)');
    expect(output.svg).not.toContain('NaN');
  });
  it('wraps long words, long counts and multiline values without narrowing body text', () => {
    const m = model(examples.zero);
    m.project = 'LongProject'.repeat(15);
    m.dependencies = Number.MAX_SAFE_INTEGER;
    m.groups[0].items = [
      {
        label: 'VeryLongIngredient'.repeat(10),
        count: Number.MAX_SAFE_INTEGER,
        line: 1,
        includes: [],
      },
    ];
    const output = render(m, fonts);
    expect(output.height).toBeGreaterThan(render(model(examples.zero), fonts).height);
    expect(output.svg).not.toContain('NaN');
    const type = new Typography(fonts);
    const lines = type.wrap('한글'.repeat(80), 16, 200);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(type.width(line, 16)).toBeLessThanOrEqual(200);
  });
  it('reports unsupported glyphs instead of silently dropping them', () => {
    const m = model(examples.zero);
    m.note = '🦄';
    expect(() => render(m, fonts)).toThrow(/does not support/);
  });
  it('sanitizes file paths and Markdown alt text', () => {
    expect(filename('../../a / b')).toBe('a-b');
    expect(filename('작은 도구')).toBe('작은-도구');
    expect(markdown('a] (bad)\nline', 'a.svg')).toBe(
      '![Software Facts for a\\] (bad) line](./a.svg)',
    );
  });
});

it('compact summarizes visible rows without changing totals, notes, provenance or the model', () => {
  const original = model(examples.api);
  const compactModel = { ...original, view: 'compact' as const };
  const before = JSON.stringify(compactModel);
  const detailed = render(original, fonts);
  const compact = render(compactModel, fonts);
  expect(compact.height).toBeLessThan(detailed.height);
  expect(compact.description).toContain('Packages: 24');
  expect(compact.description).toContain('Libraries: 19 (79%)');
  expect(compact.description).toContain('ioredis');
  expect(compact.description).not.toContain('Includes pg');
  expect(compact.description).not.toContain('Declared licenses');
  expect(compact.description).toContain(original.note);
  expect(compact.description).toContain(original.source);
  expect(compact.description).toContain(original.created);
  expect(compact.description).toContain('Compact view:');
  expect(JSON.stringify(compactModel)).toBe(before);
  expect(render({ ...original, view: 'detailed' }, fonts)).toEqual(detailed);
});
it('compact renders all examples and Korean summary wording, including zero totals', () => {
  for (const source of Object.values(examples)) {
    const output = render({ ...model(source), view: 'compact' }, fonts, 'ko');
    expect(output.description).toContain('간략형:');
    expect(output.svg).not.toContain('NaN');
  }
});

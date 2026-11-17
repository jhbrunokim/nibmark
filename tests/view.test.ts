import { describe, expect, it } from 'vitest';
import { parse } from '../src/core';
import { setView } from '../src/core/view';
import { examples } from '../src/examples';

describe('view declarations', () => {
  it('defaults to detailed and accepts either explicit view without losing data', () => {
    const original = parse(examples.api);
    expect(original.ok).toBe(true);
    for (const view of ['compact', 'detailed'] as const) {
      const parsed = parse(setView(examples.api, view));
      expect(parsed.ok && parsed.model).toEqual(
        original.ok && { ...original.model, view, groups: parsed.ok ? parsed.model.groups : [] },
      );
      expect(setView(examples.api, view).replace(`view ${view}\n`, '')).toBe(examples.api);
    }
  });
  it('rejects invalid, quoted, repeated and misplaced declarations', () => {
    for (const declaration of [
      'view small',
      'view "compact"',
      'view compact extra',
      'view compact\nview detailed',
    ])
      expect(parse(examples.api.replace('packages 24', `${declaration}\npackages 24`)).ok).toBe(
        false,
      );
    expect(parse(examples.api + '\nview compact').ok).toBe(false);
  });
  it('preserves fences, comments and CRLF when replacing a view', () => {
    const source = '```nibmark\r\n' + examples.api.replaceAll('\n', '\r\n') + '# keep this\r\n```';
    const compact = setView(source, 'compact');
    expect(parse(compact).ok).toBe(true);
    expect(compact.replace('view compact\r\n', '')).toBe(source);
    expect(setView(compact, 'detailed')).toBe(compact.replace('view compact', 'view detailed'));
    expect(setView('invalid recipe', 'compact')).toBe('invalid recipe');
  });
});

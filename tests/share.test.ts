import { describe, expect, it } from 'vitest';
import { MAX_SHARE_URL, readShare, shareURL } from '../src/editor/share';
import { examples } from '../src/examples';

const base = 'https://jhbrunokim.github.io/nibmark/?old=1#old';
const encoded = (data: unknown) => '#nibmark=v1.' + btoa(JSON.stringify(data)).replace(/=+$/, '');
describe('editable recipe links', () => {
  it('round-trips English and Korean without placing recipe contents in a request URL', () => {
    for (const locale of ['en', 'ko'] as const) {
      const recipe = { source: locale === 'en' ? examples.classic : examples.korean, locale };
      const url = new URL(shareURL(recipe, base));
      expect(url.origin + url.pathname + url.search).toBe('https://jhbrunokim.github.io/nibmark/');
      expect(readShare(url.hash)).toEqual(recipe);
    }
  });
  it('preserves exact whitespace, quotes and fenced source', () => {
    const recipe = {
      source: '```nibmark\r\n' + examples.korean + '\r\n```',
      locale: 'ko' as const,
    };
    expect(readShare(new URL(shareURL(recipe, base)).hash)).toEqual(recipe);
  });
  it('ignores unrelated anchors', () => {
    expect(readShare('')).toBeUndefined();
    expect(readShare('#guide')).toBeUndefined();
  });
  it.each([
    '#nibmark=v2.aaaa',
    '#nibmark=v1.',
    '#nibmark=v1.!!!',
    '#nibmark=v1.a',
    '#nibmark=v1._w',
    encoded(null),
    encoded({ source: 123, locale: 'en' }),
    encoded({ source: 'text', locale: 'fr' }),
    encoded({ source: 'text', locale: ['en'] }),
    encoded({ source: 'text' }),
    '#nibmark=v1.' + 'a'.repeat(MAX_SHARE_URL),
  ])('rejects a malformed, unsupported or excessive payload case %#', (hash) => {
    expect(() => readShare(hash)).toThrow('invalid');
  });
  it('rejects a recipe too long for sharing with a distinct error', () => {
    expect(() => shareURL({ source: '한'.repeat(5000), locale: 'ko' }, base)).toThrow('too-long');
    expect(() => shareURL({ source: 'x'.repeat(60_000), locale: 'en' }, base)).toThrow('too-long');
  });
});

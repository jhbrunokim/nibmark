import { parse as parseFont } from 'opentype.js';
import regularUrl from '@fontsource/roboto/files/roboto-latin-400-normal.woff?url';
import boldUrl from '@fontsource/roboto/files/roboto-latin-700-normal.woff?url';
import blackUrl from '@fontsource/roboto/files/roboto-latin-900-normal.woff?url';
import type { Fonts } from './typography';
let latin: Promise<Fonts> | undefined;
let korean: Promise<Pick<Fonts, 'koreanRegular' | 'koreanBold'>> | undefined;
async function load(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load the label fonts. Please retry.');
  return parseFont(await response.arrayBuffer());
}
export async function loadFonts(source: string, locale: string): Promise<Fonts> {
  latin ??= Promise.all([regularUrl, boldUrl, blackUrl].map(load))
    .then(([regular, bold, black]) => ({ regular, bold, black }))
    .catch((e) => {
      latin = undefined;
      throw e;
    });
  const fonts = await latin;
  const needsFallback =
    locale === 'ko' ||
    Array.from(source.normalize('NFC')).some((c) => c > ' ' && !fonts.regular.hasChar(c));
  if (needsFallback) {
    korean ??= Promise.all(
      ['Regular', 'Bold'].map((weight) =>
        load(`${import.meta.env.BASE_URL}fonts/NibmarkHangul-${weight}.woff`),
      ),
    )
      .then(([koreanRegular, koreanBold]) => ({ koreanRegular, koreanBold }))
      .catch((e) => {
        korean = undefined;
        throw e;
      });
    return { ...fonts, ...(await korean) };
  }
  return fonts;
}

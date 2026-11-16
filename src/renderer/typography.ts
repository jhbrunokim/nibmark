import type { Font, PathCommand } from 'opentype.js';

// Explicit separators prevent rounded negative-zero coordinates from merging
// with the previous number in the font library's compact path serializer.
function pathCommand(c: PathCommand): string {
  if (c.type === 'Z') return 'Z';
  const values =
    c.type === 'C'
      ? [c.x1, c.y1, c.x2, c.y2, c.x, c.y]
      : c.type === 'Q'
        ? [c.x1, c.y1, c.x, c.y]
        : [c.x, c.y];
  return c.type + ' ' + values.map((n) => n.toFixed(2)).join(' ');
}

export type Weight = 'regular' | 'bold' | 'black';
export interface Fonts {
  regular: Font;
  bold: Font;
  black: Font;
  koreanRegular?: Font;
  koreanBold?: Font;
}

export class Typography {
  constructor(private fonts: Fonts) {}
  private runs(text: string, weight: Weight): { font: Font; text: string }[] {
    const primary = this.fonts[weight];
    const fallback = weight === 'regular' ? this.fonts.koreanRegular : this.fonts.koreanBold;
    const runs: { font: Font; text: string }[] = [];
    for (const character of text.normalize('NFC')) {
      const font = primary.hasChar(character)
        ? primary
        : fallback?.hasChar(character)
          ? fallback
          : undefined;
      if (!font)
        throw new Error(
          `The label font does not support “${character}” (U+${character.codePointAt(0)!.toString(16).toUpperCase()}). Use English, Korean or supported symbols.`,
        );
      const last = runs.at(-1);
      if (last?.font === font) last.text += character;
      else runs.push({ font, text: character });
    }
    return runs;
  }
  width(text: string, size: number, weight: Weight = 'regular'): number {
    return this.runs(text, weight).reduce((n, r) => n + this.glyphs(r.font, r.text, size).width, 0);
  }
  // The v1 alphabet is Latin and NFC Hangul. Position individual glyphs so
  // unsupported OpenType contextual-substitution tables cannot break exports.
  private glyphs(font: Font, text: string, size: number) {
    const glyphs = Array.from(text).map((c) => font.charToGlyph(c));
    const scale = size / font.unitsPerEm;
    let width = 0;
    const positions = glyphs.map((glyph, i) => {
      const x = width;
      width += (glyph.advanceWidth ?? 0) * scale;
      if (i + 1 < glyphs.length) width += font.getKerningValue(glyph, glyphs[i + 1]) * scale;
      return { glyph, x };
    });
    return { positions, width };
  }
  path(
    text: string,
    x: number,
    y: number,
    size: number,
    weight: Weight = 'regular',
    maxWidth?: number,
  ): string {
    const width = this.width(text, size, weight);
    const scale = maxWidth && width > maxWidth ? maxWidth / width : 1;
    let cursor = 0;
    const paths = this.runs(text, weight)
      .map((r) => {
        const run = this.glyphs(r.font, r.text, size);
        const d = run.positions
          .map(({ glyph, x }) =>
            glyph
              .getPath(cursor + x, 0, size)
              .commands.map(pathCommand)
              .join(' '),
          )
          .join(' ');
        cursor += run.width;
        return `<path d="${d}"/>`;
      })
      .join('');
    return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)} 1)">${paths}</g>`;
  }
  wrap(text: string, size: number, width: number, weight: Weight = 'regular'): string[] {
    const lines: string[] = [];
    for (const paragraph of text.replace(/\r/g, '').split('\n')) {
      if (!paragraph) {
        lines.push('');
        continue;
      }
      let line = '';
      for (const word of paragraph.split(/(\s+)/u)) {
        if (this.width(line + word, size, weight) <= width) {
          line += word;
          continue;
        }
        if (line.trim()) {
          lines.push(line.trimEnd());
          line = '';
        }
        const candidate = word.trimStart();
        if (this.width(candidate, size, weight) <= width) {
          line = candidate;
          continue;
        }
        for (const character of candidate) {
          if (line && this.width(line + character, size, weight) > width) {
            lines.push(line);
            line = '';
          }
          line += character;
        }
      }
      if (line.trim()) lines.push(line.trimEnd());
    }
    return lines.length ? lines : [''];
  }
}

import { percent, type LabelModel, type Locale } from '../core';
import { Typography, type Fonts, type Weight } from './typography';
export interface RenderedLabel {
  svg: string;
  width: number;
  height: number;
  description: string;
}
const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export function render(model: LabelModel, fonts: Fonts, locale: Locale = 'en'): RenderedLabel {
  const ko = locale === 'ko';
  const packages = model.measure === 'packages';
  const defaultScope = packages
    ? ko
      ? 'SBOM 패키지 목록'
      : 'SBOM package inventory'
    : ko
      ? '실행용 의존성'
      : 'Runtime dependencies';
  const t = new Typography(fonts);
  const shapes: string[] = [];
  const left = 11,
    right = 349,
    width = right - left;
  let y = 47;
  const draw = (
    text: string,
    x: number,
    baseline: number,
    size = 16,
    weight: Weight = 'regular',
    maxWidth?: number,
  ) => shapes.push(t.path(text, x, baseline, size, weight, maxWidth));
  const rule = (thickness: number, indent = left) => {
    shapes.push(
      `<rect x="${indent}" y="${y.toFixed(2)}" width="${right - indent}" height="${thickness}"/>`,
    );
    y += thickness;
  };
  const wrapped = (
    text: string,
    size: number,
    weight: Weight = 'regular',
    x = left,
    available = width,
    leading = size * 1.25,
  ) => {
    for (const line of t.wrap(text, size, available, weight)) {
      draw(line, x, y, size, weight);
      y += leading;
    }
  };
  draw(ko ? '소프트웨어 성분표' : 'Software Facts', left, y, ko ? 43 : 50, 'black', width);
  y = 55;
  rule(1);
  y += 21;
  wrapped(
    model.project + (model.projectVersion ? ` · v${model.projectVersion.replace(/^v/, '')}` : ''),
    17,
  );
  const serving = model.serving ?? (ko ? '릴리스 1개' : '1 release');
  const servingLabel = ko ? '기준 단위' : 'Serving size';
  const servingSpace = width - t.width(servingLabel, 19, 'bold') - 14;
  const servingLines = t.wrap(serving, 19, servingSpace, 'bold');
  y += 4;
  draw(servingLabel, left, y, 19, 'bold');
  for (const line of servingLines) {
    draw(line, right - t.width(line, 19, 'bold'), y, 19, 'bold');
    y += 24;
  }
  y -= 13;
  rule(12);
  y += 19;
  wrapped(model.scope ?? defaultScope, 13, 'bold', left, width, 17);
  const headline = packages ? (ko ? '패키지' : 'Packages') : ko ? '의존성' : 'Dependencies';
  const value = String(model.dependencies);
  const valueWidth = t.width(value, 45, 'black');
  y += 26;
  if (t.width(headline, 29, 'black') + valueWidth + 14 <= width) {
    draw(headline, left, y, 29, 'black');
    draw(value, right - valueWidth, y, 45, 'black');
  } else {
    draw(headline, left, y - 5, 29, 'black');
    y += 45;
    draw(value, left, y, 45, 'black', width);
  }
  y += 10;
  rule(6);
  y += 20;
  const col = ko ? '전체 대비*' : '% of Total*';
  draw(col, right - t.width(col, 13, 'bold'), y, 13, 'bold');
  y += 8;
  rule(0.8);
  for (const [groupIndex, group] of model.groups.entries()) {
    if (groupIndex > 0) {
      y += 3;
      rule(11);
      y += 21;
      wrapped(group.label, 16, 'bold');
      y -= 12;
      rule(0.8);
    }
    for (const item of group.items) {
      y += 21;
      const itemWeight = groupIndex === 0 ? 'bold' : 'regular';
      const amount = ko ? ` ${item.count}개` : ` ${item.count} packages`;
      const available = width - 63;
      const totalWidth = t.width(item.label, 16, itemWeight) + t.width(amount, 16);
      const firstY = y;
      if (!item.label.includes('\n') && totalWidth <= available) {
        draw(item.label, left, y, 16, itemWeight);
        draw(amount, left + t.width(item.label, 16, itemWeight), y, 16);
        y += 20;
      } else {
        wrapped(item.label, 16, itemWeight, left, available, 20);
        wrapped(amount.trimStart(), 15, 'regular', left, available, 19);
      }
      const pct = percent(item.count, model.dependencies);
      draw(pct, right - t.width(pct, 16, itemWeight), firstY, 16, itemWeight);
      y -= 12;
      rule(0.6);
      for (const child of item.includes) {
        y += 20;
        const childY = y;
        const text = ko
          ? `${child.label} ${child.count}개 포함`
          : `Includes ${child.count} ${child.label} packages`;
        wrapped(text, 15, 'regular', left + 17, available - 17, 19);
        const p = percent(child.count, model.dependencies);
        draw(p, right - t.width(p, 15, 'bold'), childY, 15, 'bold');
        y -= 11;
        rule(0.6, left + 17);
      }
    }
  }
  y += 3;
  rule(6);
  y += 18;
  const footnote = ko
    ? `* 비율은 위 범위의 전체 ${packages ? '패키지' : '의존성'} ${model.dependencies}개를 기준으로 합니다. 포함 항목은 상위 수치에 이미 들어 있습니다. 비율은 반올림했습니다.${model.dependencies === 0 ? ' 전체가 0이면 비율은 —로 표시합니다.' : ''}`
    : `* Percentages use the ${model.dependencies} ${packages ? 'packages' : 'dependencies'} in the scope above. Included items are already counted in their parent. Percentages are rounded.${model.dependencies === 0 ? ' A zero total has no percentage (—).' : ''}`;
  wrapped(footnote, 11.3, 'regular', left, width, 14.5);
  if (model.note) {
    y += 8;
    wrapped(model.note, 12, 'regular', left, width, 15);
  }
  const provenance = [
    model.source && `${ko ? '출처' : 'Source'}: ${model.source}`,
    model.generator && `${ko ? '생성 도구' : 'Generator'}: ${model.generator}`,
    model.created && `${ko ? '생성 시점' : 'Created'}: ${model.created}`,
  ].filter((v): v is string => Boolean(v));
  if (provenance.length) {
    y += 6;
    for (const line of provenance) wrapped(line, 10, 'regular', left, width, 13);
  }
  const height = Math.ceil(y + 8);
  const title = `${ko ? '소프트웨어 성분표' : 'Software Facts'} — ${model.project}`;
  const description = [
    title,
    `${serving}. ${model.scope ?? defaultScope}.`,
    `${headline}: ${value}.`,
    ...model.groups.flatMap((g) => [
      g.label,
      ...g.items.flatMap((i) => [
        `${i.label}: ${i.count} (${percent(i.count, model.dependencies)}).`,
        ...i.includes.map(
          (c) =>
            `${ko ? '포함' : 'Includes'} ${c.label}: ${c.count} (${percent(c.count, model.dependencies)}).`,
        ),
      ]),
    ]),
    footnote,
    model.note ?? '',
    ...provenance,
  ].join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${height}" viewBox="0 0 360 ${height}" role="img" aria-labelledby="nibmark-title nibmark-desc"><title id="nibmark-title">${escape(title)}</title><desc id="nibmark-desc">${escape(description)}</desc><rect width="360" height="${height}" fill="#fff"/><rect x="2" y="2" width="356" height="${height - 4}" fill="none" stroke="#000" stroke-width="2.5"/><g fill="#000" aria-hidden="true">${shapes.join('')}</g></svg>`;
  return { svg, width: 360, height, description };
}

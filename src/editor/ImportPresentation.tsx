import { useMemo, useState } from 'react';
import type { Locale } from '../core';
import { MAX_PINNED_PACKAGES, type ImportOptions, type SpdxDocument } from '../importers/spdx';

export function ImportPresentation({
  doc,
  rootId,
  locale,
  options,
  ecosystemComposition,
  onChange,
}: {
  doc: SpdxDocument;
  rootId: string;
  locale: Locale;
  options: ImportOptions;
  ecosystemComposition: boolean;
  onChange: (options: ImportOptions) => void;
}) {
  const ko = locale === 'ko';
  const [query, setQuery] = useState('');
  const manual = options.representatives !== undefined;
  const selected = options.representatives ?? [];
  const candidates = useMemo(
    () =>
      doc.packages
        .filter((p) => p.id !== rootId)
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : 1)),
    [doc, rootId],
  );
  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();
    return candidates.filter((p) =>
      `${p.name} ${p.version ?? ''} ${p.id}`.toLowerCase().includes(search),
    );
  }, [candidates, query]);
  function toggle(id: string) {
    const ids = selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id];
    if (ids.length <= MAX_PINNED_PACKAGES) onChange({ ...options, representatives: ids });
  }
  return (
    <details className="import-presentation">
      <summary>{ko ? '대표 성분과 표시 영역 선택' : 'Choose ingredients and sections'}</summary>
      <label className="spdx-field">
        {ko ? '대표 성분 선택 방식' : 'Representative selection'}
        <select
          value={manual ? 'manual' : 'auto'}
          onChange={(e) =>
            onChange({ ...options, representatives: e.target.value === 'manual' ? [] : undefined })
          }
        >
          <option value="auto">{ko ? '자동 선택' : 'Automatic'}</option>
          <option value="manual">{ko ? '직접 선택하여 고정' : 'Choose and pin'}</option>
        </select>
      </label>
      {manual && (
        <>
          <p>
            {ko
              ? '고정한 이름만 하위 항목에 표시합니다. 전체 패키지 수와 비율은 유지됩니다. 같은 이름·버전의 기록은 묶어서 표시합니다.'
              : 'Only pinned names appear as nested ingredients. Inventory totals and percentages stay unchanged. Records with the same displayed name/version are grouped.'}
          </p>
          <p role="status">
            {ko
              ? `고정 ${selected.length} / ${MAX_PINNED_PACKAGES}`
              : `Pinned ${selected.length} / ${MAX_PINNED_PACKAGES}`}
          </p>
          {selected.length > 0 && (
            <ul className="pinned-ingredients">
              {selected.map((id) => {
                const p = doc.packages.find((p) => p.id === id)!;
                return (
                  <li key={id}>
                    <span>
                      {p.name}
                      {p.version ? ` @ ${p.version}` : ''}
                      <small>{id}</small>
                    </span>
                    <button
                      type="button"
                      aria-label={`${ko ? '고정 해제' : 'Unpin'} ${p.name} ${id}`}
                      onClick={() => toggle(id)}
                    >
                      {ko ? '해제' : 'Unpin'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <label className="spdx-field">
            {ko ? '패키지 검색' : 'Search packages'}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ko ? '이름, 버전 또는 SPDX ID' : 'Name, version or SPDX ID'}
            />
          </label>
          <p>
            {ko
              ? `검색 결과 ${matches.length}개 중 ${Math.min(50, matches.length)}개 표시`
              : `Showing ${Math.min(50, matches.length)} of ${matches.length} matches`}
          </p>
          <div
            className="ingredient-options"
            role="group"
            aria-label={ko ? '고정할 패키지' : 'Packages to pin'}
          >
            {matches.slice(0, 50).map((p) => (
              <label key={p.id} className="ingredient-option">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  disabled={!selected.includes(p.id) && selected.length >= MAX_PINNED_PACKAGES}
                  onChange={() => toggle(p.id)}
                  aria-label={`${p.name}${p.version ? ` @ ${p.version}` : ''} — ${p.id}`}
                />
                <span>
                  {p.name}
                  {p.version ? ` @ ${p.version}` : ''}
                  <small>{p.id}</small>
                </span>
              </label>
            ))}
            {!matches.length && (
              <p>{ko ? '일치하는 패키지가 없습니다.' : 'No matching packages.'}</p>
            )}
          </div>
        </>
      )}
      <fieldset className="section-options">
        <legend>{ko ? '표시 영역' : 'Visible sections'}</legend>
        <p>{ko ? '구성 합계는 항상 표시합니다.' : 'Composition totals are always shown.'}</p>
        {(['relationships', 'licenses', 'ecosystems'] as const).map((key) => {
          const labels = {
            relationships: ko ? '의존 관계' : 'Relationships',
            licenses: ko ? '라이선스' : 'Licenses',
            ecosystems: ko ? '생태계' : 'Ecosystems',
          };
          const required = key === 'ecosystems' && ecosystemComposition;
          return (
            <label key={key} className="ingredient-option">
              <input
                type="checkbox"
                checked={required || options.sections?.[key] !== false}
                disabled={required}
                onChange={(e) =>
                  onChange({
                    ...options,
                    sections: { ...options.sections, [key]: e.target.checked },
                  })
                }
              />
              <span>
                {labels[key]}
                {required && (
                  <small>
                    {ko
                      ? '용도 정보가 없어 주 구성으로 표시합니다.'
                      : 'Used as the main composition because purpose data is absent.'}
                  </small>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
      <p>
        {ko
          ? '선택 결과는 생성한 문법에 고정되어 저장·공유됩니다. 새 SBOM 파일을 열면 선택을 초기화합니다.'
          : 'The generated recipe freezes your choices for saving and sharing. Opening a new SBOM resets these choices.'}
      </p>
    </details>
  );
}

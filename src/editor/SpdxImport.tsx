import { useMemo, useRef, useState } from 'react';
import { ImportPresentation } from './ImportPresentation';
import type { Locale } from '../core';
import {
  MAX_SPDX_BYTES,
  readSpdx,
  SpdxError,
  toNibmark,
  type SpdxDocument,
  type ImportErrorCode,
  type ImportOptions,
} from '../importers/spdx';

const errors: Record<Locale, Record<ImportErrorCode, string>> = {
  en: {
    selection: 'Choose up to 12 packages, excluding the project root.',
    size: 'Choose an SPDX file no larger than 5 MB.',
    format:
      'Use SPDX 2.2/2.3 JSON or Tag/Value. Native Syft JSON, CycloneDX, XML and YAML are not supported yet.',
    version:
      'This SPDX version is not supported yet. Export SPDX 2.2 or 2.3 JSON / Tag/Value. SPDX 3.x JSON-LD uses a different model.',
    invalid:
      'The file is incomplete or contains invalid inventory fields. Export a fresh SPDX file and try again.',
    packages:
      'This document contains no package inventory. Choose an SPDX file with a packages section.',
    limit: 'Use at most 10,000 packages and 100,000 relationships per file.',
    duplicate:
      'Duplicate document/package SPDX IDs or repeated fields make the inventory ambiguous. Export a fresh file.',
  },
  ko: {
    selection: '기준 프로젝트를 제외하고 최대 12개 패키지를 선택하세요.',
    size: '5 MB 이하의 SPDX 파일을 선택하세요.',
    format:
      'SPDX 2.2/2.3 JSON 또는 Tag/Value 파일을 사용하세요. Syft 자체 JSON, CycloneDX, XML, YAML은 아직 지원하지 않습니다.',
    version:
      '아직 지원하지 않는 SPDX 버전입니다. SPDX 2.2 또는 2.3 JSON / Tag/Value로 내보내세요. SPDX 3.x JSON-LD는 별도 모델입니다.',
    invalid: '파일이 불완전하거나 목록 필드가 올바르지 않습니다. SPDX 파일을 다시 생성해 주세요.',
    packages: '패키지 목록이 없는 문서입니다. packages 영역이 있는 SPDX 파일을 선택하세요.',
    limit: '파일당 패키지 10,000개, 관계 100,000개까지 지원합니다.',
    duplicate:
      '문서·패키지의 SPDX ID 또는 필드가 중복되어 집계할 수 없습니다. 파일을 다시 생성해 주세요.',
  },
};
export function SpdxImport({
  locale,
  onApply,
}: {
  locale: Locale;
  onApply: (source: string) => void;
}) {
  const ko = locale === 'ko';
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef(0);
  const [doc, setDoc] = useState<SpdxDocument>();
  const [root, setRoot] = useState('');
  const [error, setError] = useState<ImportErrorCode>();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ImportOptions>({});
  const [removedPin, setRemovedPin] = useState(false);
  const result = useMemo(() => {
    if (!doc) return undefined;
    try {
      return { summary: toNibmark(doc, root || undefined, locale, options) };
    } catch (e) {
      return { error: e instanceof SpdxError ? e.code : ('invalid' as ImportErrorCode) };
    }
  }, [doc, root, locale, options]);
  async function open(file: File | undefined) {
    if (!file) return;
    const token = ++request.current;
    setDoc(undefined);
    setError(undefined);
    setLoading(true);
    try {
      if (file.size > MAX_SPDX_BYTES) throw new SpdxError('size');
      const parsed = readSpdx(await file.text());
      if (token !== request.current) return;
      setDoc(parsed);
      setOptions({});
      setRemovedPin(false);
      setRoot(parsed.roots.length === 1 ? parsed.roots[0] : '');
    } catch (e) {
      if (token === request.current) setError(e instanceof SpdxError ? e.code : 'invalid');
    } finally {
      if (token === request.current) setLoading(false);
    }
  }
  const summary = result?.summary;
  const shownError = error ?? result?.error;
  return (
    <>
      <div className="spdx-entry">
        <button onClick={() => dialog.current?.showModal()}>
          {ko ? 'SPDX 가져오기' : 'Import SPDX'}
        </button>
        <p>
          {ko
            ? 'SBOM을 편집 가능한 성분표로 · 파일은 브라우저에서만 처리합니다.'
            : 'Turn an SBOM into an editable label. Files stay in your browser.'}
        </p>
      </div>
      <dialog
        ref={dialog}
        className="guide spdx-dialog"
        aria-labelledby="spdx-title"
        onClose={() => {
          request.current++;
          setLoading(false);
        }}
      >
        <div className="guide-content">
          <div className="guide-heading">
            <span className="brand-small">nibmark.</span>
            <button onClick={() => dialog.current?.close()}>{ko ? '닫기' : 'Close'} ×</button>
          </div>
          <h2 id="spdx-title">{ko ? 'SBOM에서 성분표로.' : 'From SBOM to Software Facts.'}</h2>
          <p>
            {ko
              ? 'SPDX 2.2 · 2.3 JSON / Tag/Value · 최대 5 MB'
              : 'SPDX 2.2 / 2.3 JSON or Tag/Value · Up to 5 MB'}
          </p>
          <label className="spdx-field">
            {ko ? 'SPDX 파일 선택' : 'Choose SPDX file'}
            <input
              type="file"
              accept=".json,.spdx,.txt"
              onChange={(e) => {
                void open(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <p>
            <a
              className="spdx-doc-link"
              href={`${import.meta.env.BASE_URL}examples/pantry-api.spdx.json`}
              download
            >
              {ko ? 'Pantry API 예제 SPDX 받기' : 'Download Pantry API example SPDX'}
            </a>
          </p>
          {loading && <p role="status">{ko ? '목록을 읽는 중…' : 'Reading the inventory…'}</p>}
          {shownError && (
            <p className="action-error" role="alert">
              {errors[locale][shownError]}
            </p>
          )}
          {doc?.warnings.map((warning) => (
            <p className="spdx-note" key={warning}>
              {warning === 'missing-document-name'
                ? ko
                  ? '원본에 문서 이름이 없습니다. 기준 프로젝트를 선택하지 않으면 임시 제목을 사용합니다.'
                  : 'The source has no document name. A placeholder title is used unless you select a project root.'
                : ko
                  ? '문서 ID가 표준 SPDXRef-DOCUMENT와 다릅니다. 원본 ID를 유지하며 해석합니다.'
                  : 'The document uses a nonstandard ID instead of SPDXRef-DOCUMENT. Its original ID is preserved.'}
            </p>
          ))}
          {doc && (
            <>
              <label className="spdx-field">
                {ko ? '기준 프로젝트 (집계에서 제외)' : 'Project root (excluded from counts)'}
                <select
                  value={root}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRemovedPin(!!options.representatives?.includes(value));
                    setOptions((current) => ({
                      ...current,
                      representatives: current.representatives?.filter((id) => id !== value),
                    }));
                    setRoot(value);
                  }}
                >
                  <option value="">
                    {ko
                      ? '지정하지 않음 · 모든 패키지 집계'
                      : 'No project root · count all packages'}
                  </option>
                  {doc.packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.version ? ` @ ${p.version}` : ''} — {p.id}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                {ko
                  ? 'DESCRIBES로 프로젝트 하나가 명시된 경우에만 자동 선택합니다. 필요하면 변경하세요.'
                  : 'A root is preselected only when the document explicitly describes one package. Change it if needed.'}
              </p>
            </>
          )}
          {summary && (
            <>
              {removedPin && (
                <p role="status">
                  {ko
                    ? '기준 프로젝트로 지정한 패키지는 고정 목록에서 제외했습니다.'
                    : 'The new project root was removed from pinned ingredients.'}
                </p>
              )}
              <ImportPresentation
                doc={doc!}
                rootId={root}
                locale={locale}
                options={options}
                ecosystemComposition={summary.compositionBasis === 'ecosystem'}
                onChange={setOptions}
              />
              <dl className="spdx-summary">
                <div>
                  <dt>{ko ? '집계 패키지' : 'Counted packages'}</dt>
                  <dd>{summary.count}</dd>
                </div>
                <div>
                  <dt>{ko ? '제외한 기준 프로젝트' : 'Excluded project'}</dt>
                  <dd>{summary.excluded}</dd>
                </div>
                <div>
                  <dt>{ko ? '직접 / 간접 / 미분류' : 'Direct / transitive / unclassified'}</dt>
                  <dd>
                    {summary.direct} / {summary.transitive} / {summary.unclassified}
                  </dd>
                </div>
              </dl>
              <p className="spdx-note">
                {ko
                  ? '목록에 기록된 모든 범위를 집계합니다. 포함 관계(CONTAINS)는 의존 관계로 추측하지 않습니다. 라이선스는 licenseDeclared를 사용하며, 누락·NOASSERTION·NONE을 구분합니다.'
                  : 'Counts cover all scopes in the inventory. CONTAINS is not treated as a dependency. Licenses use licenseDeclared; missing, NOASSERTION and NONE remain distinct.'}
              </p>
              <p className="spdx-note">
                {ko
                  ? `대표 항목 ${summary.representativeCount}개를 표시합니다. 용도 미확인 패키지: ${summary.unknownPurpose}개. 관계 하위 항목은 중복될 수 있으며 실행·개발 범위를 상속하지 않습니다.`
                  : `Showing ${summary.representativeCount} representative entries. Packages without a known purpose: ${summary.unknownPurpose}. Edge subtypes may overlap; runtime/development scopes are not inherited.`}
              </p>
              {summary.compositionBasis === 'ecosystem' && (
                <p className="spdx-note">
                  {ko
                    ? '용도 정보가 없어 기록된 PURL 생태계별로 구성했습니다. 생태계로 프로그램 언어나 용도를 추정하지 않습니다.'
                    : 'No purpose data: composition uses recorded PURL ecosystems. These do not establish the program’s language or purpose.'}
                </p>
              )}
              {summary.unresolved > 0 && (
                <p>
                  {ko
                    ? `문서 밖 또는 패키지가 아닌 참조 ${summary.unresolved}개는 관계 탐색에서 제외했습니다.`
                    : `${summary.unresolved} external or non-package references were excluded from dependency traversal.`}
                </p>
              )}
              {summary.unasserted > 0 && (
                <p>
                  {ko
                    ? `의존 관계의 NOASSERTION 선언 ${summary.unasserted}개는 관계 유무를 판단하지 않은 것으로 표시합니다.`
                    : `${summary.unasserted} dependency NOASSERTION statements leave the existence of relationships unspecified.`}
                </p>
              )}
              {summary.grouped > 0 && (
                <p>
                  {ko
                    ? `종류가 많은 항목 ${summary.grouped}개를 기타로 묶었습니다. 전체 개수는 유지됩니다.`
                    : `${summary.grouped} less common entries are grouped as Other; totals are preserved.`}
                </p>
              )}
              {summary.shortened && (
                <p>
                  {ko
                    ? '긴 문구를 줄이거나 표시할 수 없는 긴 선언을 묶었습니다. 상세 내용은 원본 SBOM을 확인하세요.'
                    : 'Long display text was shortened or long declarations grouped. Refer to the original SBOM for full details.'}
                </p>
              )}
              <details>
                <summary>{ko ? '생성할 Nibmark 문법 보기' : 'Preview generated Nibmark'}</summary>
                <textarea aria-label="Generated Nibmark" readOnly value={summary.source} />
              </details>
              <div className="export-buttons">
                <button
                  className="primary"
                  onClick={() => {
                    onApply(summary.source);
                    dialog.current?.close();
                  }}
                >
                  {ko ? '성분표 만들기' : 'Create label'}
                </button>
              </div>
              <p>
                {ko
                  ? '현재 문법을 교체합니다. 편집기의 교체 되돌리기로 복원할 수 있습니다.'
                  : 'Replaces the current recipe. Undo replacement restores it in the editor.'}
              </p>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

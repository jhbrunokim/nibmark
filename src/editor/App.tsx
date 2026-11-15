import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_BYTES, parse, type LabelModel, type Locale } from '../core';
import { examples, type ExampleName } from '../examples';
import { loadFonts } from '../renderer/fonts';
import { render, type RenderedLabel } from '../renderer/render';
import { download, filename, markdown, png } from './exports';
import { readShare, shareURL, ShareError } from './share';
import { version } from '../../package.json';

const copy = {
  en: {
    tagline: 'Give your project a nutrition label.',
    example: 'Example',
    classic: 'Classic',
    korean: 'Korean',
    zero: 'Zero dependencies',
    custom: 'Your recipe',
    source: 'The recipe',
    preview: 'The label',
    input: 'Nibmark source',
    import: 'Open',
    save: 'Save source',
    guide: 'Syntax guide',
    ready: 'Ready to serve',
    waiting: 'Setting the type…',
    invalid: 'Check your recipe',
    stale: 'Last valid preview',
    error: 'Line',
    export: 'Take it to your README',
    exportHint: 'Download an image, add it to your repo, then copy the Markdown.',
    svg: 'Download SVG',
    png: 'Download PNG',
    md: 'Copy Markdown',
    share: 'Copy edit link',
    shareHint: 'Anyone with the link can open and edit a copy.',
    linkCopied: 'Edit link copied.',
    linkHelp: 'Copy this edit link manually',
    linkInvalid:
      'This edit link is incomplete or unsupported. Ask for a new link or open a .nibmark file.',
    linkLong:
      'This recipe is too long for a share link. Save the source and share the .nibmark file instead.',
    privacy: 'Made in your browser. Your recipe stays here.',
    footer: 'A familiar label. A different kind of ingredient.',
    illustrative: 'Sample values. Make them your own.',
    rows: 'lines',
    copied: 'Markdown copied.',
    saved: 'Source saved.',
    downloaded: 'Downloaded',
    close: 'Close',
    guideTitle: 'A small language for your ingredients.',
    guideIntro: 'Describe the contents. Nibmark takes care of the label.',
    note: 'Counts are entered by you. Percentages are calculated from dependencies.',
    undo: 'Undo replacement',
    fix: 'Fix the recipe to export the current label.',
    retry: 'Retry fonts',
    copyHelp: 'Copy this snippet manually',
    downloadSource: 'The source can be saved even while you are fixing an error.',
    browserError: 'This action failed. Please try again.',
    fileLimit: 'Choose a .nibmark, .txt or .md file no larger than 50 KB.',
  },
  ko: {
    tagline: '내 프로젝트를 위한 소프트웨어 성분표.',
    example: '예제',
    classic: '기본',
    korean: '한국어',
    zero: '의존성 없음',
    custom: '나만의 레시피',
    source: '레시피',
    preview: '성분표',
    input: 'Nibmark 문법 입력',
    import: '열기',
    save: '문법 저장',
    guide: '문법 안내',
    ready: '라벨 완성',
    waiting: '글자를 배치하는 중…',
    invalid: '입력을 확인하세요',
    stale: '마지막 정상 미리보기',
    error: '줄',
    export: 'README에 담아 가세요',
    exportHint: '이미지를 내려받아 저장소에 넣고, Markdown을 복사하세요.',
    svg: 'SVG 다운로드',
    png: 'PNG 다운로드',
    md: 'Markdown 복사',
    share: '편집 링크 복사',
    shareHint: '링크를 받은 사람은 내용을 열고 사본을 수정할 수 있습니다.',
    linkCopied: '편집 링크를 복사했습니다.',
    linkHelp: '아래 편집 링크를 직접 복사하세요',
    linkInvalid:
      '편집 링크가 불완전하거나 지원하지 않는 형식입니다. 새 링크를 받거나 .nibmark 파일을 여세요.',
    linkLong:
      '문법이 길어 공유 링크를 만들 수 없습니다. 문법을 저장한 뒤 .nibmark 파일로 공유하세요.',
    privacy: '브라우저 안에서 만듭니다. 입력 내용은 전송하지 않습니다.',
    footer: '익숙한 성분표에 담은 소프트웨어.',
    illustrative: '가상의 예제 수치입니다. 내 프로젝트에 맞게 바꿔보세요.',
    rows: '줄',
    copied: 'Markdown을 복사했습니다.',
    saved: '문법을 저장했습니다.',
    downloaded: '다운로드 완료',
    close: '닫기',
    guideTitle: '프로젝트의 재료를 적는 작은 언어.',
    guideIntro: '내용만 적으세요. 배치는 Nibmark가 맡습니다.',
    note: '개수는 직접 입력하고, 비율은 전체 의존성을 기준으로 계산합니다.',
    undo: '교체 되돌리기',
    fix: '현재 라벨을 내보내려면 입력을 수정하세요.',
    retry: '글꼴 다시 불러오기',
    copyHelp: '아래 삽입문을 직접 복사하세요',
    downloadSource: '입력 오류를 수정하는 중에도 문법 원본을 저장할 수 있습니다.',
    browserError: '작업을 완료하지 못했습니다. 다시 시도하세요.',
    fileLimit: '50 KB 이하의 .nibmark, .txt 또는 .md 파일을 선택하세요.',
  },
};
function Icon({ name }: { name: 'open' | 'save' | 'download' | 'copy' | 'arrow' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'open' ? (
        <>
          <path d="M3 19V5h6l2 3h10v11z" />
          <path d="M3 10h18" />
        </>
      ) : name === 'save' ? (
        <>
          <path d="M5 3h12l4 4v14H3V3z" />
          <path d="M7 3v6h10V3M7 21v-8h10v8" />
        </>
      ) : name === 'copy' ? (
        <>
          <rect x="8" y="8" width="12" height="12" rx="1" />
          <path d="M15 8V3H3v12h5" />
        </>
      ) : name === 'arrow' ? (
        <path d="M6 18 18 6M6 6h12v12" />
      ) : (
        <>
          <path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" />
        </>
      )}
    </svg>
  );
}
export function App() {
  const [initial] = useState(() => {
    try {
      return {
        ...(readShare(window.location.hash) ?? {
          source: examples.classic,
          locale: 'en' as Locale,
        }),
        invalid: false,
      };
    } catch {
      return { source: examples.classic, locale: 'en' as Locale, invalid: true };
    }
  });
  const [source, setSource] = useState<string>(initial.source);
  const [locale, setLocale] = useState<Locale>(initial.locale);
  const [linkInvalid, setLinkInvalid] = useState(initial.invalid);
  const [last, setLast] = useState<{
    label: RenderedLabel;
    model: LabelModel;
    source: string;
    locale: Locale;
  }>();
  const [renderError, setRenderError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [fallback, setFallback] = useState('');
  const [fallbackLabel, setFallbackLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [previous, setPrevious] = useState<{ source: string; locale: Locale }>();
  const [imageFormat, setImageFormat] = useState<'svg' | 'png'>('svg');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const numbers = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const parsed = useMemo(() => parse(source), [source]);
  const c = copy[locale];
  const exampleName =
    (Object.keys(examples) as ExampleName[]).find((key) => examples[key] === source) ?? 'custom';
  const ready = parsed.ok && last?.source === source && last.locale === locale && !renderError;
  useEffect(() => {
    let active = true;
    setRenderError('');
    setActionError('');
    setMessage('');
    setFallback('');
    if (!parsed.ok) return;
    const timer = window.setTimeout(() => {
      loadFonts(source, locale)
        .then((fonts) => {
          if (!active) return;
          const label = render(parsed.model, fonts, locale);
          setLast({ label, model: parsed.model, source, locale });
        })
        .catch((e: unknown) => {
          if (active)
            setRenderError(e instanceof Error ? e.message : 'Could not render this label.');
        });
    }, 120);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [parsed, source, locale, retry]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(id);
  }, [message]);
  useEffect(() => {
    function openLink() {
      try {
        const recipe = readShare(window.location.hash);
        setLinkInvalid(false);
        if (!recipe) return;
        setPrevious({ source, locale });
        setSource(recipe.source);
        setLocale(recipe.locale);
      } catch {
        setLinkInvalid(true);
      }
    }
    window.addEventListener('hashchange', openLink);
    return () => window.removeEventListener('hashchange', openLink);
  }, [source, locale]);
  function replace(next: string, language = locale) {
    setLinkInvalid(false);
    setPrevious({ source, locale });
    setSource(next);
    setLocale(language);
    if (textarea.current) textarea.current.scrollTop = 0;
    if (numbers.current) numbers.current.style.transform = 'translateY(0)';
  }
  async function openFile(input: File | undefined) {
    if (!input) return;
    setActionError('');
    if (input.size > MAX_BYTES || !/\.(nibmark|txt|md)$/i.test(input.name)) {
      setActionError(c.fileLimit);
      return;
    }
    try {
      replace(await input.text());
    } catch {
      setActionError(c.browserError);
    }
  }
  async function exportImage(format: 'svg' | 'png') {
    if (!ready || !last) return;
    setBusy(true);
    setActionError('');
    try {
      const blob =
        format === 'svg'
          ? new Blob([last.label.svg], { type: 'image/svg+xml;charset=utf-8' })
          : await png(last.label);
      const name = `${filename(last.model.project)}-facts.${format}`;
      download(blob, name);
      setImageFormat(format);
      setMessage(`${c.downloaded}: ${name}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : c.browserError);
    } finally {
      setBusy(false);
    }
  }
  const imageName = `${filename(last?.model.project ?? 'project')}-facts.${imageFormat}`;
  const snippet = markdown(last?.model.project ?? 'project', imageName);
  async function copyMarkdown() {
    if (!ready) return;
    setActionError('');
    try {
      await navigator.clipboard.writeText(snippet);
      setMessage(c.copied);
      setFallback('');
    } catch {
      setFallbackLabel(c.copyHelp);
      setFallback(snippet);
    }
  }
  async function copyEditLink() {
    if (!ready) return;
    setActionError('');
    setMessage('');
    setFallback('');
    let url: string;
    try {
      url = shareURL({ source, locale }, window.location.href);
    } catch (e) {
      setActionError(
        e instanceof ShareError && e.code === 'too-long' ? c.linkLong : c.browserError,
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setMessage(c.linkCopied);
    } catch {
      setFallbackLabel(c.linkHelp);
      setFallback(url);
    }
  }
  function save() {
    const name = filename(parsed.ok ? parsed.model.project : (last?.model.project ?? 'project'));
    download(new Blob([source], { type: 'text/plain;charset=utf-8' }), `${name}.nibmark`);
    setMessage(c.saved);
  }
  function goToLine(line: number, column: number) {
    const lines = source.split('\n');
    const at = lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0) + column - 1;
    textarea.current?.focus();
    textarea.current?.setSelectionRange(at, at);
    if (textarea.current) textarea.current.scrollTop = Math.max(0, (line - 4) * 24);
  }
  return (
    <div className="app-shell">
      <header className="masthead">
        <a className="brand" href="./" aria-label="Nibmark home">
          <svg viewBox="0 0 30 34" width="27" height="31" aria-hidden="true">
            <path d="M2 2h26v30H2z" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M6 7h18v5H6zm0 9h18v2H6zm0 6h18v2H6z" fill="currentColor" />
          </svg>
          <span>
            nibmark<span className="brand-dot">.</span>
          </span>
        </a>
        <p className="tagline">{c.tagline}</p>
        <nav aria-label="Main navigation">
          <button className="text-button" onClick={() => dialog.current?.showModal()}>
            {c.guide}
          </button>
          <a
            className="github-link"
            href="https://github.com/jhbrunokim/nibmark"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <Icon name="arrow" />
          </a>
        </nav>
      </header>
      <main>
        <div className="workspace-toolbar">
          <div className="toolbar-left">
            <span className="local-indicator" />
            <span className="workspace-title">
              {locale === 'ko' ? '라벨 작업실' : 'Label playground'}
            </span>
            <span className="version">v{version}</span>
          </div>
          <div className="toolbar-right">
            <label className="select-label">
              {c.example}
              <select
                aria-label={c.example}
                value={exampleName}
                onChange={(e) => {
                  const name = e.target.value as ExampleName;
                  replace(examples[name], name === 'korean' ? 'ko' : 'en');
                }}
              >
                <option value="custom" disabled>
                  {c.custom}
                </option>
                <option value="classic">{c.classic}</option>
                <option value="korean">{c.korean}</option>
                <option value="zero">{c.zero}</option>
              </select>
            </label>
            <div className="locale-switch" role="group" aria-label="Language">
              <button aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>
                EN
              </button>
              <button aria-pressed={locale === 'ko'} onClick={() => setLocale('ko')}>
                한국어
              </button>
            </div>
          </div>
        </div>
        <div className="workspace">
          <section className="source-pane" aria-label={c.source}>
            <div className="pane-heading">
              <div>
                <h1>{c.source}</h1>
                <span className="file-type">.nibmark</span>
              </div>
              <div className="file-actions">
                <button onClick={() => file.current?.click()}>
                  <Icon name="open" />
                  {c.import}
                </button>
                <button onClick={save} title={c.downloadSource}>
                  <Icon name="save" />
                  {c.save}
                </button>
              </div>
            </div>
            <input
              ref={file}
              type="file"
              accept=".nibmark,.txt,.md"
              hidden
              aria-label="Open source file"
              onChange={(e) => {
                void openFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <div className="code-editor">
              <div className="number-viewport" aria-hidden="true">
                <div ref={numbers}>
                  {source.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
              </div>
              <textarea
                ref={textarea}
                aria-label={c.input}
                aria-describedby="editor-hint"
                aria-invalid={!parsed.ok || !!renderError}
                value={source}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                wrap="off"
                onChange={(e) => setSource(e.target.value)}
                onScroll={(e) => {
                  if (numbers.current)
                    numbers.current.style.transform = `translateY(-${e.currentTarget.scrollTop}px)`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    setSource(source.slice(0, start) + '  ' + source.slice(end));
                    requestAnimationFrame(() =>
                      textarea.current?.setSelectionRange(start + 2, start + 2),
                    );
                  }
                }}
              />
            </div>
            <div className="editor-status">
              <span>
                {source.split('\n').length} {c.rows}
              </span>
              <span>nutrition v1</span>
              {previous && (
                <button
                  onClick={() => {
                    setSource(previous.source);
                    setLocale(previous.locale);
                    setPrevious(undefined);
                  }}
                >
                  {c.undo}
                </button>
              )}
            </div>
            <div className="source-help" id="editor-hint">
              <span className="hint-mark">*</span>
              <p>
                {exampleName === 'custom' ? c.note : c.illustrative}
                <button onClick={() => dialog.current?.showModal()}>
                  {c.guide} <span aria-hidden="true">↗</span>
                </button>
              </p>
            </div>
            {linkInvalid && (
              <div className="diagnostics" role="alert">
                <p>{c.linkInvalid}</p>
              </div>
            )}
            {!parsed.ok && (
              <div className="diagnostics" role="alert">
                {parsed.errors.map((error, i) => (
                  <button key={i} onClick={() => goToLine(error.line, error.column)}>
                    <strong>
                      {c.error} {error.line}:{error.column}
                    </strong>
                    <span>{error.message}</span>
                  </button>
                ))}
              </div>
            )}
            {renderError && (
              <div className="diagnostics" role="alert">
                <p>{renderError}</p>
                <button onClick={() => setRetry(retry + 1)}>{c.retry}</button>
              </div>
            )}
          </section>
          <section className="preview-pane" aria-label={c.preview}>
            <div className="pane-heading">
              <h2>{c.preview}</h2>
              <span className={`preview-status ${ready ? 'valid' : ''}`} role="status">
                <i />
                {ready ? c.ready : !parsed.ok || renderError ? c.invalid : c.waiting}
              </span>
            </div>
            <div className="preview-stage">
              {last ? (
                <>
                  <div
                    className="label-frame"
                    data-testid="label-preview"
                    dangerouslySetInnerHTML={{ __html: last.label.svg }}
                  />
                  {!ready && <span className="stale-label">{c.stale}</span>}
                </>
              ) : (
                <div className="empty-label">
                  {renderError || !parsed.ok ? c.invalid : c.waiting}
                </div>
              )}
            </div>
            <div className="export-panel">
              <div>
                <h2>{c.export}</h2>
                <p>{c.exportHint}</p>
              </div>
              <div className="export-buttons">
                <button
                  className="primary"
                  disabled={!ready || busy}
                  onClick={() => void exportImage('svg')}
                >
                  <Icon name="download" />
                  {c.svg}
                </button>
                <button disabled={!ready || busy} onClick={() => void exportImage('png')}>
                  <Icon name="download" />
                  {c.png}
                </button>
              </div>
              <div className="markdown-row">
                <code title={snippet}>{imageName}</code>
                <button disabled={!ready || busy} onClick={() => void copyMarkdown()}>
                  <Icon name="copy" />
                  {c.md}
                </button>
              </div>
              <div className="share-row">
                <button disabled={!ready || busy} onClick={() => void copyEditLink()}>
                  <Icon name="copy" />
                  {c.share}
                </button>
                <p>{c.shareHint}</p>
              </div>
              {!ready && <p className="export-reason">{c.fix}</p>}
              {fallback && (
                <label className="copy-fallback">
                  {fallbackLabel}
                  <textarea readOnly value={fallback} onFocus={(e) => e.target.select()} />
                </label>
              )}
              <p className="action-message" role="status">
                {message}
              </p>
              {actionError && (
                <p className="action-error" role="alert">
                  {actionError}
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
      <footer>
        <span>{c.privacy}</span>
        <span>{c.footer}</span>
      </footer>
      <dialog
        ref={dialog}
        className="guide"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="guide-content">
          <div className="guide-heading">
            <span className="brand-small">nibmark.</span>
            <button onClick={() => dialog.current?.close()}>
              {c.close} <span aria-hidden="true">×</span>
            </button>
          </div>
          <h2>{c.guideTitle}</h2>
          <p>{c.guideIntro}</p>
          <dl>
            <dt>nutrition v1</dt>
            <dd>
              {locale === 'ko'
                ? '라벨 종류와 문법 버전. 항상 첫 줄입니다.'
                : 'The label type and syntax version. Always the first line.'}
            </dd>
            <dt>project "name" version "1.0"</dt>
            <dd>
              {locale === 'ko'
                ? '프로젝트 이름과 선택적인 버전입니다.'
                : 'Your project name and optional version.'}
            </dd>
            <dt>dependencies 42</dt>
            <dd>
              {locale === 'ko'
                ? '크게 표시할 전체 의존성 수입니다.'
                : 'The headline number and denominator for percentages.'}
            </dd>
            <dt>group "Composition" of dependencies</dt>
            <dd>
              {locale === 'ko'
                ? '구성 그룹입니다. 각 그룹의 item 합계는 전체 수와 같아야 합니다.'
                : 'A composition group. Its item counts must add up to the total.'}
            </dd>
            <dt> item "Direct" 8</dt>
            <dd>
              {locale === 'ko'
                ? '두 칸 들여쓰기. 항목 이름과 개수입니다.'
                : 'Indent by two spaces. Give the ingredient a name and count.'}
            </dd>
            <dt> includes "Optional" 2</dt>
            <dd>
              {locale === 'ko'
                ? '네 칸 들여쓰기. 바로 위 item에 이미 포함된 수치입니다.'
                : 'Indent by four spaces. Already counted in the parent item.'}
            </dd>
            <dt>note "A little extra flavor."</dt>
            <dd>
              {locale === 'ko'
                ? '각주 아래에 들어가는 선택적인 문구입니다.'
                : 'An optional line of personality beneath the footnote.'}
            </dd>
          </dl>
          <p className="guide-note">
            {locale === 'ko'
              ? 'serving과 scope는 project 다음, dependencies 앞에 넣습니다. 문자열은 큰따옴표로 감싸고, #으로 주석을 시작할 수 있습니다. Shift+Tab으로 편집 영역을 나갈 수 있습니다.'
              : 'Put optional serving and scope after project, before dependencies. Use double quotes for text and # for comments. Shift+Tab leaves the editor.'}
          </p>
          <p className="guide-note">
            {locale === 'ko'
              ? 'GitHub에는 이미지를 넣으세요. nibmark 코드 블록은 GitHub에서 자동 렌더링되지 않습니다.'
              : 'Use the exported image on GitHub. Nibmark code blocks do not render there natively.'}
          </p>
        </div>
      </dialog>
    </div>
  );
}

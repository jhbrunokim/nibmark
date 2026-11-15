# Contributing to Nibmark

Use Node.js 24.16+ and npm. The lockfile is committed.

```sh
npm ci
npm run dev
```

Before opening a pull request:

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

If Chrome is installed locally, `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`
uses it instead of the downloaded Chromium browser.

The parser and data model live in `src/core/`. Font measurement, layout and
portable SVG output live in `src/renderer/`. The React UI and browser-only
exports live in `src/editor/`. Keep the core independent of React and the DOM.

For visual changes, compare the English and Korean labels against the static
design sample. Also check long names, zero dependencies, and narrow screens.
SVG output must remain self-contained and must never execute input text.

New syntax must include valid examples and error-location tests. Document
changes in `docs/syntax.md`. Keep automated analysis and additional label
types outside v0.1 unless the scope is agreed first.

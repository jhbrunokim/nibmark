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
npx playwright install chromium firefox webkit
npm run test:e2e
```

If Chrome is installed locally, `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`
uses it instead of downloaded Chromium; Firefox and WebKit still use Playwright builds.
The full suite covers all three engines. For a quick Chromium-only check, use
`npm run test:e2e -- --project=chromium`.

Follow [VERSIONING.md](VERSIONING.md) when changing release numbers.

The parser and data model live in `src/core/`. Font measurement, layout and
portable SVG output live in `src/renderer/`. The React UI and browser-only
exports live in `src/editor/`. Keep the core independent of React and the DOM.

For visual changes, compare the English and Korean labels against the static
design sample. Also check long names, zero dependencies, and narrow screens.
SVG output must remain self-contained and must never execute input text.

New syntax must include valid examples and error-location tests. Document
changes in `docs/syntax.md`. Keep project scanning and SBOM generation outside the product scope. Input adapters
should consume existing SBOMs and preserve uncertainty instead of guessing metadata.

## Working in rounds

Start each development round from the latest `main` in a new `codex/…` branch.
Keep the round scoped to the next roadmap milestone and merge only after its checks pass.
After merging, verify the branch tip matches the merged PR head, remove the remote and
local topic branches, and update local `main`. Do not reuse merged branches or delete
branches containing additional unmerged work.

## Packaged Agent Skill

The distributable skill lives in `skills/nibmark`. Keep its references consistent
with supported parser/importer behavior. Do not add machine-specific paths or
promise headless image export: images currently use the browser playground.

`npm test` also checks the skill's example and Python edit-link helper against the
application's parser/share protocol. Python 3.9+ must be available as `python3`;
the helper uses only the standard library. A GitHub installation should copy the
entire skill directory, including its MIT license. Test installer changes in a
fresh temporary destination instead of replacing a user's installed skill.

Run `python3 scripts/package_skill.py` after changing bundled skill files, and
commit `public/downloads/nibmark-skill.zip` with the source. Packaging uses an
explicit file list and fixed timestamps; `npm test` checks the committed ZIP
matches the source. The archive must not include caches or machine-specific
configuration. Host-specific UI metadata stays separate from common instructions.

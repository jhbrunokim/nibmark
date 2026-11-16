# Changelog

## 0.4.0 — 2026-11-16

- Build hierarchical ingredient labels from recorded SPDX package purposes, with representative package names nested beneath each category.
- Display explicit dependency edge subtypes beneath direct/transitive totals without inheriting scopes or guessing from names.
- Add description and supplier metadata; import project summary/description and supplier from JSON and Tag/Value.
- Include a fictional Pantry API SBOM example and explain missing purpose information and representative selection.

## 0.3.0 — 2026-11-16

- Import SPDX 2.2/2.3 JSON and Tag/Value in the browser with explicit root selection,
  dependency uncertainty, declared-license and PURL ecosystem summaries.
- Add packages, source, generator and created presentation keywords while retaining
  existing dependencies recipes.
- Distinguish NONE/NOASSERTION relationship assertions from unresolved references,
  and validate inventory identifiers against the SPDX 2.x rules.
- Fix SVG glyph coordinate serialization that could truncate timestamp text.
- Refocus the roadmap on presenting existing SBOMs, additional format adapters and README integrations.

## 0.2.0 — 2026-11-16

- Share editable recipes and display language through a browser-only link.
- Recover from invalid links, offer manual copying when clipboard access is unavailable,
  and keep file export available for recipes exceeding the link size limit.
- Add Chromium, Firefox and WebKit checks for Korean labels, image exports, source
  round trips, long labels and narrow screens.
- Display the package version in the editor and validate release metadata during builds.
- Document roadmap order, round-specific branches and merged-branch cleanup.

## 0.1.0 — 2026-11-16

- Initial public editor: nutrition v1 parser, Software Facts SVG renderer, English/Korean
  labels, PNG/source downloads and README Markdown snippets.
- Publish the playground through tested GitHub Pages deployments.

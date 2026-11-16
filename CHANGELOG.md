# Changelog

## 0.5.0 — 2026-11-16

- Add eight pinned Syft, Trivy and Tern upstream SPDX example/test files with source URLs, commit hashes and SHA-256 checks; seven import/export and one remains an explicit ambiguity rejection.
- Fall back to recorded PURL ecosystems when every package lacks a recognized purpose, preserving nested names and totals without guessing a program's language or purpose.
- Recover absent/blank document names with a visible placeholder warning; preserve unique nonstandard document IDs with a warning while rejecting colliding IDs.
- Cover real file/package boundaries, containment, root-only inventories and JSON/Tag-Value parity in offline regression tests and browser exports.
- Keep representative selection and compact/detailed labels as the next required rounds; format expansion and automation are optional backlog.

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

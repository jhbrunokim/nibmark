# Existing SPDX workflow

Use Nibmark's importer rather than reconstructing its inventory rules.

1. Open Import SPDX and choose an existing SPDX 2.2/2.3 JSON or Tag/Value file. Limits: 5 MB, 10,000 packages, 100,000 relationships. SPDX 3.x, CycloneDX and generator-native JSON are not supported in 0.9.0.
2. Review root, warnings and inventory totals before applying. One explicit described package can be preselected; ambiguous roots require a choice or explicit count-all behavior. Ask when the user's intended project root cannot be established.
3. Optionally open Choose ingredients and sections, pin up to 12 representative package records and select relationship/license/ecosystem sections. Automatic representatives are deterministic, not a ranking of importance.
4. Create label, then choose compact/detailed in the main editor. Inspect and export through the existing renderer.

Counting invariants:
- Count distinct SPDX package records, excluding only the selected root. Different IDs remain distinct even when names or PURLs match. Files/snippets are not packages. Conflicting IDs are rejected.
- The inventory may contain packages with no dependency path. Do not call the whole inventory runtime dependencies.
- Direct/transitive follow supported explicit edges; CONTAINS is not a dependency edge. Unclassified does not mean unused.
- Purpose follows recorded purpose fields; package names do not establish purpose. If all purposes are unknown and recorded PURLs exist, the importer can use ecosystem composition. Do not infer languages/framework categories from names.
- Keep NOASSERTION, NONE, unknowns and missing metadata distinguishable. Preserve timestamps and source warnings; do not fabricate license certainty or an analysis date.
- Generated recipes retain selected displayed rows and provenance, not the original SBOM or reusable import settings. A new SBOM import resets selection. Retain the original input separately when relevant.

Maintained details: https://github.com/jhbrunokim/nibmark/blob/main/docs/spdx-import.md

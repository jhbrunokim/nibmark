# Nibmark v1 essentials

A raw definition or one complete `nibmark` fence is accepted, without surrounding prose.

```nibmark
nutrition v1
project "Example CLI" version "1.0.0"
view compact
description "Fictional command-line tool"
serving "1 release"
scope "Illustrative package inventory"
packages 4

group "Composition" of packages
  item "Libraries" 3
    includes "example-parser" 1
  item "Applications" 1
    includes "example-helper" 1

group "Declared licenses" of packages
  item "MIT" 3
  item "Unspecified" 1

note "Fictional values; replace with your own inventory."
```

- Order: `nutrition v1`, `project`, optional metadata and view, count, groups, optional final note.
- `version "..."` is optional on project. Metadata: `serving`, `scope`, `description`, `supplier`, `source`, `generator`, `created`, each followed by quoted text, once per definition.
- `view compact` or `view detailed`, unquoted. Omission is detailed. Compact shows only the first group and at most the first includes row per item, retaining all source data and provenance.
- Exactly one headline: `packages N` for inventory records, or `dependencies N` for known dependency counts. Every group uses the matching `of packages` or `of dependencies`.
- Every group's top-level item counts must sum to N. Add a truthful Other/Unspecified remainder when necessary. Zero totals are valid; percentages then display an em dash.
- Items use two spaces, includes four. Includes is already counted in its parent; each included count must be no larger than that parent's. Included items may overlap. All percentages use the headline total, not the parent count.
- Text uses double quotes; escape quote/backslash/newline as `\"`, `\\`, `\n`. Blank lines and whole-line `#` comments are allowed. No tabs or inline comments.
- Counts are nonnegative safe integers. Input ≤50 KB UTF-8, each quoted string ≤200 code points, ≤100 item/includes rows.
- No layout/CSS/theme directives. The renderer controls the recognizable nutrition-label design. First group title is accessibility text only; later titles are visible.
- Fixed labels support EN and Korean. Unsupported glyphs (including most emoji) produce errors. PNG is 2×, limited to 16,000 px height and 16 MP; SVG supports taller labels.

Full maintained grammar: https://github.com/jhbrunokim/nibmark/blob/main/docs/syntax.md

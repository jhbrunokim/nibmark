# SPDX → Nibmark

Nibmark presents the output of existing SBOM generators. It does not scan projects,
resolve dependencies, generate an SBOM or check vulnerabilities.

Choose **Import SPDX**, select a file, review the root and totals, and choose
**Create label**. The generated Nibmark recipe remains editable and supports the
same SVG, PNG, source and edit-link exports. **Undo replacement** restores the
previous recipe. Files are processed in browser memory without an upload.

## Supported inputs

- SPDX 2.2 and 2.3, JSON or Tag/Value text (including `.spdx`).
  The 2.3.1 maintenance specification still uses `SPDX-2.3` in documents.
- Maximum 5 MB, 10,000 packages and 100,000 relationships.
- The file must expose a package inventory; an explicit empty list produces a zero label.
- SPDX 3.x JSON-LD, RDF/XML, YAML, CycloneDX and generator-native JSON are not yet supported.
  The UI reports unsupported formats instead of silently producing an empty label.
- This importer validates the fields needed for its summary. It is not a full SPDX validator.

[Download a fictional example](../public/examples/tiny-app.spdx.json).

## What the numbers mean

`packages` counts package records with distinct SPDX IDs, excluding the selected
project root. Files and snippets are not packages. Different versions or records
with different IDs remain separate, even when their names or PURLs match.
Conflicting duplicate IDs are rejected instead of silently deduplicated.

The document's single explicit described package is preselected using
`documentDescribes`, `DESCRIBES` or `DESCRIBED_BY`. With multiple or no candidates,
no root is selected. You can choose another package or count all packages.
Only the selected root is excluded; all remaining package records are counted,
including those without an established dependency path. This is an inventory
summary, not a claim that all packages are runtime dependencies.

- **Direct:** explicitly connected to the root by a supported dependency edge.
- **Transitive:** reachable through dependency edges beyond the root's direct set.
- **Unclassified:** no established path from the selected root, or no root selected.
- Cycles and duplicate edges do not increase counts. Direct membership takes precedence.
- `DEPENDS_ON` points from parent to dependency. `DEPENDENCY_OF`,
  `BUILD_DEPENDENCY_OF`, `DEV_DEPENDENCY_OF`, `OPTIONAL_DEPENDENCY_OF`,
  `PROVIDED_DEPENDENCY_OF`, `TEST_DEPENDENCY_OF` and `RUNTIME_DEPENDENCY_OF`
  are followed in the inverse direction. All scopes are included.
- `CONTAINS` is not a dependency edge. External or non-package endpoints are not
  fetched or traversed; the review shows their count.
- Relationship RHS `NONE` creates no edge; `NOASSERTION` creates no edge and is
  reported separately as unspecified, not as a broken/external reference.

The importer follows explicit evidence, not tool-specific name heuristics. SPDX
relationships need not be complete, so “Unclassified” does not mean “unused”.
See the [SPDX relationship specification](https://spdx.github.io/spdx-spec/v2.3.1/relationships-between-SPDX-elements/).

## License and ecosystem summaries

Declared licenses use the exact `licenseDeclared` expression. `MIT OR Apache-2.0`
is one expression, not two packages. Missing declarations, `NOASSERTION` and `NONE`
remain distinct. `licenseConcluded` is not silently substituted for a declaration.
The label makes no legal or compliance judgment. See
[SPDX package information](https://spdx.github.io/spdx-spec/v2.3.1/package-information/).

Ecosystem names come from the type of `purl` external references. Conflicting PURL
types are shown as multiple ecosystems; absent PURLs remain unknown. Package
names alone are not used to guess an ecosystem.

Each distribution shows its 20 most common entries; the rest are combined into
“Other entries (grouped)” while preserving totals. The review explains grouping.
Display metadata longer than 200 characters is shortened. Oversized or multiline
license declarations receive a separate “see SBOM” bucket rather than a truncated
license expression. The original SPDX file is never changed.

## Presentation keywords

```nibmark
nutrition v1
project "tiny-app" version "1.0.0"
serving "1 SBOM"
scope "SBOM package inventory · all scopes"
source "SPDX-2.3 (JSON)"
generator "Syft"
created "2026-11-16T00:00:00Z"
packages 3

group "Recorded relationships" of packages
  item "Direct" 1
  item "Transitive" 1
  item "Unclassified" 1

group "Declared licenses" of packages
  item "MIT" 2
  item "NOASSERTION" 1
```

These are common presentation concepts, not generator-specific commands. Existing
`dependencies` recipes remain valid. See [the syntax reference](syntax.md) for
ordering and limits. Nibmark's version and the `nutrition v1` grammar version are
independent of the source document's SPDX version.

## Generator survey (2026-11-16)

The user's [Korean overview](https://jicoding.tistory.com/124) and
[tool roundup](https://safeguard.sh/resources/blog/best-open-source-sbom-generation-tools)
were starting points. The entries below were checked against the projects' own
current documentation, because formats and defaults have changed since older articles.

| Tool                                                                                                    | SPDX output relevant to Nibmark                                             | Current input guidance                                                                  |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [Syft](https://oss.anchore.com/docs/guides/sbom/formats/)                                               | SPDX JSON and Tag/Value; version selection is supported                     | Select 2.2 or 2.3 explicitly; native Syft JSON and SPDX 3.x are different inputs        |
| [Trivy](https://trivy.dev/docs/latest/supply-chain/sbom/)                                               | `spdx-json` and `spdx`; documented examples use 2.3                         | Import either 2.2/2.3 serialization                                                     |
| [Microsoft sbom-tool](https://github.com/microsoft/sbom-tool/blob/main/docs/sbom-tool-cli-reference.md) | SPDX 2.2 and 3.0; 2.2 manifests use `_manifest/spdx_2.2/manifest.spdx.json` | Use the 2.2 manifest; 3.x is not yet supported                                          |
| [Tern](https://github.com/tern-tools/tern/blob/main/README.md)                                          | `spdxjson` and `spdxtagvalue`                                               | Import 2.2/2.3 output; containment alone does not establish direct dependencies         |
| [SPDX SBOM Generator](https://github.com/opensbom-generator/spdx-sbom-generator)                        | Tag/Value and JSON; README includes a 2.2 example                           | Existing 2.2 files fit the importer; the repository is archived                         |
| [cdxgen](https://github.com/cdxgen/cdxgen/blob/master/docs/CLI.md)                                      | Current `--format spdx` exports SPDX 3.0.1 JSON-LD                          | Not yet supported; older descriptions saying “CycloneDX only” are outdated              |
| [SPDX tools-python](https://github.com/spdx/tools-python)                                               | Parsing, validation and document creation/conversion                        | Useful for validating/converting supported 2.x files; not a replacement project scanner |

Example output commands (run these tools separately from Nibmark):

```sh
syft dir:. -o spdx-json@2.3 > project.spdx.json
trivy fs --format spdx-json --output project.spdx.json .
tern report -f spdxjson -i your-image:tag -o project.spdx.json
```

The interoperability review used the official
[Syft alpine sample](https://github.com/anchore/syft/blob/main/syft/format/spdxjson/testdata/spdx/alpine-3.10.syft.spdx.json)
and [Trivy sample](https://github.com/aquasecurity/trivy/blob/main/pkg/sbom/spdx/testdata/happy/bom.json),
imported in the browser. These are sample-output checks, not a guarantee for every
generator release or a claim that all generators were run locally. The committed
unit fixtures and downloadable example are fictional, authored for Nibmark.

## Specification audit

The importer was rechecked against the pinned
[SPDX 2.3.1 specification](https://github.com/spdx/spdx-spec/tree/v2.3.1)
and its [JSON schema](https://github.com/spdx/spdx-spec/blob/v2.3.1/schemas/spdx-schema.json),
rather than the evolving default development branch. Version 2.3.1 is a maintenance
revision of 2.3, not a new document version string. The deprecated
`documentDescribes` JSON alias remains accepted for older generators.
Document and package identifiers are checked before counting or traversing.
SPDX 3.x has a different model and JSON-LD serialization; it requires a separate
adapter, not additional aliases in the 2.x parser.

The official 2.3.1
[JSON example](https://github.com/spdx/spdx-spec/blob/v2.3.1/examples/SPDXJSONExample-v2.3.spdx.json)
and [Tag/Value example](https://github.com/spdx/spdx-spec/blob/v2.3.1/examples/SPDXTagExample-v2.3.spdx)
were also imported through the browser: both produced four package records when
no project root was excluded. These external sample checks were run separately
from the committed fictional regression fixtures.

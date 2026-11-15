# Nibmark v1 syntax

Nibmark turns one text definition into a nutrition-style Software Facts label.
It does not inspect the project being described. Counts are supplied by you.

```nibmark
nutrition v1
project "tiny-app" version "1.0.0"
serving "1 release"
scope "Runtime dependencies"
dependencies 128

group "Composition" of dependencies
  item "Direct" 12
  item "Transitive" 116
    includes "Optional" 16

group "Licenses" of dependencies
  item "MIT" 96
  item "Apache-2.0" 24
  item "Unspecified" 8

note "Made with care."
```

## Declarations

| Declaration                        | Required               | Meaning                                                        |
| ---------------------------------- | ---------------------- | -------------------------------------------------------------- |
| `nutrition v1`                     | Yes                    | Label type and syntax version; first declaration               |
| `project "name" version "version"` | Yes                    | Name; the `version` clause is optional                         |
| `serving "1 release"`              | No                     | Basis of the label; defaults to one release                    |
| `scope "Runtime dependencies"`     | No                     | What the numbers describe; defaults to runtime dependencies    |
| `dependencies 128`                 | Yes                    | Headline count and percentage denominator                      |
| `group "name" of dependencies`     | At least one           | A complete breakdown of the total                              |
| `  item "name" 12`                 | At least one per group | Two-space indentation, name and count                          |
| `    includes "name" 3`            | No                     | Four-space indentation; already included in the preceding item |
| `note "text"`                      | No                     | Final optional footnote                                        |

Keep declarations in the order shown. `serving` and `scope` can swap places.
The project, serving, scope, dependencies and note declarations cannot repeat.
The first group title is included in the accessible description, but omitted
visually to preserve the nutrition-label layout. Later group titles are visible.

## Text and numbers

- Use double quotes for text. Escapes: `\"`, `\\`, `\n`.
- Blank lines and lines starting with `#` are allowed.
- Use spaces, not tabs. Counts must be non-negative safe integers.
- Each group's items must add up to `dependencies`. Use an explicit
  `Other` or `Unspecified` item when listing only some ingredients.
- Included counts cannot exceed their parent. Multiple included items may
  overlap; they are not added together or counted again.
- Every percentage uses the headline count, including nested items.
- Percentages round to whole numbers; the rounded total can differ from 100%.
- With zero dependencies, counts must also be zero and percentages show `—`.
- Limits: 50 KB of input, 200 characters per quoted string, 100 item/includes rows.

## Editor and exports

The editor accepts either the raw definition or one complete fenced `nibmark`
code block. Surrounding prose and multiple blocks are not supported.
Error locations refer to the original input, including the opening fence.

The EN/한국어 switch changes the interface and fixed label wording. Your own
strings stay unchanged; use the Korean example to start with Korean contents.
The display language is an editor setting, not stored in the `.nibmark` file.

Exports use outlined glyphs rather than external fonts, so SVG and PNG retain
the layout without a font installation. SVG has an accessible title and a full
text description. Supported text includes English, Korean and a subset of Latin
characters, punctuation and symbols. Unsupported characters (including most
emoji) produce an error rather than disappearing.

PNG exports are 2× resolution and limited to 16,000 pixels in height and
16 megapixels. Taller labels can be downloaded as SVG. File contents are processed
in browser memory. Font and app assets are loaded from the same origin; label
contents are not sent to a server. There is no automatic persistent storage.

After downloading an image, add it to your repository. The Markdown button
uses the most recently downloaded image format (SVG initially). Adjust the path
if you put the image in another directory. GitHub does not render `nibmark`
code blocks natively.

Invalid input preserves the previous preview, visibly marked as stale, while
image export is disabled. Saving the source remains available. Opening a file
or switching examples can be undone with Undo replacement.

# Install Nibmark

Use the hosted browser editor without installing anything. The sections below
cover installing the AI skill or running the editor locally.

The skill badge links here as a convenience; it is not a vendor certification.

Nibmark uses the [Agent Skills directory format](https://agentskills.io/specification):
`SKILL.md`, relative references, optional scripts and the MIT license. The same
folder supports compatible clients. `agents/openai.yaml` is optional Codex UI
metadata; other clients do not need to interpret it.

## Codex

Ask the built-in skill installer:

```text
$skill-installer Install https://github.com/jhbrunokim/nibmark/tree/main/skills/nibmark
```

Use `$nibmark` on the next turn. Manual installations go in
`$CODEX_HOME/skills/nibmark`, defaulting to `~/.codex/skills/nibmark`.

## Claude Code

Clone the repository, then copy the whole `skills/nibmark` folder to either:

- Personal: `~/.claude/skills/nibmark`
- Project: `<your-project>/.claude/skills/nibmark`

The result must contain `nibmark/SKILL.md`, with `references`, `scripts` and
`LICENSE` beside it. Review any existing installation before replacing it.
Then invoke:

```text
/nibmark Turn ./sbom.spdx.json into a compact Software Facts label for my README.
```

These locations and slash invocation follow the [Claude Code skill documentation](https://code.claude.com/docs/en/skills).

## Claude web

Download [nibmark-skill.zip](https://jhbrunokim.github.io/nibmark/downloads/nibmark-skill.zip).
Under **Customize → Skills**, choose **+ → Create skill → Upload a skill** and
upload the ZIP. Enable the skill and ask Claude to use Nibmark for your file.
Code execution/file creation must be enabled; organization settings can control
availability. Follow the [current Claude upload instructions](https://support.claude.com/en/articles/12512180-use-skills-in-claude)
if the interface differs.

The ZIP contains a single `nibmark/` directory with `SKILL.md` at its root.
It is a skill bundle, not the entire repository archive.

## Other compatible tools

Install the same folder through the client's Agent Skills mechanism. Follow that
client's discovery paths and invocation syntax; neither `$nibmark` nor `/nibmark`
is universal. Plain chat products without skill/file support are not an automatic
installation target.

## Capabilities and verification

| Capability                                | Needed environment                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| Write/edit `.nibmark` from supplied facts | File access and skill instructions                                           |
| Generate an edit link                     | Python 3.9+, standard library only                                           |
| Convert SPDX 2.2/2.3 JSON or Tag/Value    | Nibmark's existing importer through browser tools or a usable local checkout |
| Export SVG/PNG                            | Browser tools that can operate the editor and download files                 |

Installing a skill does not grant browser tools or network access. Without image
export capabilities, the agent delivers a recipe/edit link and identifies the
missing export. Unsupported SBOM formats are not converted by guesswork. The
skill does not scan projects, generate SBOMs or check vulnerabilities.

Validation covers skill structure, repository installation, ZIP contents, sample
syntax, and helper compatibility with the web application. Claude installation
instructions follow its official documentation; a live Claude session has not
been tested. Client-specific behavior remains dependent on that client's tools.

## Versioned installs and updates

For a fixed source version, use Git tag `v0.9.0`. To build its ZIP locally:

```sh
git clone --branch v0.9.0 https://github.com/jhbrunokim/nibmark.git
cd nibmark
python3 scripts/package_skill.py
```

The output is `public/downloads/nibmark-skill.zip`. No npm install is needed to
package the skill. GitHub `main` and the hosted ZIP represent the current shipped
bundle; installed copies do not update automatically. Review changes before
replacing an existing installation.

## Run the editor locally

Use Node.js 24.16+ and npm:

```sh
git clone https://github.com/jhbrunokim/nibmark.git
cd nibmark
npm ci
npm run dev
```

Open the Local URL printed by Vite. These requirements are for running Nibmark,
not for the project described by a label. Hosted editor users only need a browser.

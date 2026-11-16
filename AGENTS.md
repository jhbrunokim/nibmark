# Nibmark development

- Follow the roadmap in README.md in order. Keep each round focused on one milestone.
- Start every round on a new `codex/…` branch based on up-to-date `main`.
- Run the checks relevant to the changes before merging. Pages deploys tested `main`.
- After merge, verify the topic branch tip matches the merged PR head, then delete
  that remote and local branch. Preserve any additional unmerged work.
- Update local `main` before beginning the next round.

- Use the three-part `main.sub.ninor` rules in VERSIONING.md; keep package, lockfile, UI and changelog consistent.

- Nibmark presents existing SBOM outputs. Do not build a project scanner/SBOM generator. Add common presentation concepts rather than tool-specific grammar.

- Required next rounds are real-SBOM robustness, representative selection, then compact/detailed composition. SPDX 3.x/CycloneDX and CLI/Actions/Markdown integration are optional backlog, not automatic next steps.

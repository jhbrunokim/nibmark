# Versioning

Nibmark versions have exactly three non-negative integer components: `main.sub.ninor`.
The names follow the project convention requested by the maintainer.

| Component | Increment when                                                               | Reset                  |
| --------- | ---------------------------------------------------------------------------- | ---------------------- |
| `main`    | Existing syntax or public APIs become incompatible                           | `sub` and `ninor` to 0 |
| `sub`     | Backward-compatible features are added                                       | `ninor` to 0           |
| `ninor`   | Compatible bug fixes, design improvements, documentation or maintenance ship | No other component     |

Examples: `0.1.0` → `0.2.0` for edit links; `0.2.0` → `0.2.1` for a rendering fix;
`0.2.1` → `1.0.0` for an incompatible syntax/API change. No leading zeroes,
prerelease suffixes or fourth component are used in this release scheme.

`nutrition v1` is the DSL version, independent of the application release number.
Changing the app version does not automatically change the DSL version.

## Release procedure

1. Start a new round from current `main`, following CONTRIBUTING.md.
2. Choose the increment based on all changes since the last versioned release.
3. Run `npm version X.Y.Z --no-git-tag-version`. This updates package.json and package-lock.json.
4. Add the version's changes to CHANGELOG.md and update the README version.
   The editor reads its version directly from package.json.
5. Build and test, merge the PR, and confirm the Pages deployment.
6. Tag the merged main commit as `vX.Y.Z` and push that tag. Do not move an existing release tag.
7. Remove the merged topic branch locally and remotely.

`npm run check:version` validates the numeric format, lockfile versions and changelog entry.
It also runs as part of the production build. Releases are not automatically published to npm.

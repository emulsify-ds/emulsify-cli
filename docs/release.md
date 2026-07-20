# Release

This project publishes `@emulsify/cli` with GitHub Actions and
semantic-release. Do not run a real semantic-release invocation from a local
checkout as part of routine verification.

## Branch Strategy

| Branch                   | Purpose                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Feature and fix branches | Open pull requests into `develop`. Read-only CI validates the prospective merge.                                              |
| `develop`                | Integration branch. Package metadata reflects the complete unreleased history since the latest stable release on `main`.      |
| `main`                   | Release branch. Merging to `main` explicitly authorizes the exact merged commit for publication after all release gates pass. |

Pushes to `develop` run the develop-version workflow. It finds the latest
stable `vX.Y.Z` tag reachable from `origin/main`, analyzes that tag's complete
unreleased range through the pushed commit, and opens or updates the dedicated
`chore/develop-version-bump` pull request when package metadata needs to change.
The calculation always starts from the stable tag, not the version already in
`package.json`, so a feature followed by later fixes remains one minor release.

The repository must allow GitHub Actions to create pull requests for the
version-bump workflow. Because the pull request is created or updated with the
repository `GITHUB_TOKEN`, GitHub starts its `CI / Validate` run in an
approval-required state. A maintainer with write access must select
**Approve workflows to run**, then wait for that exact head commit to pass
before merging. Configure a GitHub App or personal access token for the bump
workflow instead if unattended validation is required.

## Required Validation

The single read-only `CI / Validate` job runs for pull requests targeting
`develop` or `main` and for pushes to either branch. It installs from the
lockfile and runs:

```bash
npm ci
npm run build
npm run type
npm run test
npm run pack:dry-run
npm run smoke:pack
```

`npm run test` includes both the Jest suite and the release-automation
regression tests. `pack:dry-run` asserts npm's structured package manifest.
`smoke:pack` creates the real tarball, installs it with its declared runtime
dependencies in a clean temporary project, and runs `emulsify --help` and
`emulsify --version`.

Repository branch protection should require `CI / Validate`. Remove any
required-check reference to the retired duplicate `Test / build` job.

The CI workflow has only `contents: read` permission. It does not receive npm or
GitHub publishing credentials and cannot publish, push a release tag, or create
a GitHub release.

## Release Calculation

The develop bumper, the safe analyzer, and semantic-release all import the same
Angular conventional-commit options from `config/release-analysis.cjs`.
Breaking releases require an explicit footer using one of:

```text
BREAKING CHANGE:
BREAKING CHANGES:
BREAKING:
```

Run the non-publishing analyzer with:

```bash
npm run release:analyze
npm run release:analyze -- --base origin/main --head HEAD
```

The analyzer calls only the conventional-commit analyzer. It reads Git history,
reports the predicted release type and version, and verifies package metadata.
It does not invoke npm, GitHub, or other publishing plugins; it does not change
files, create tags, or publish.

The mutating develop command is:

```bash
npm run version:develop -- origin/main HEAD
```

It updates `package.json`, the lockfile version, and the lockfile root-package
version to the single prediction calculated from stable release history.
Running it again against unchanged history produces no diff.

## Develop-to-Main Merge Expectations

The established release strategy uses GitHub's **Create a merge commit** option
for the `develop` pull request into `main`. This preserves the individual
conventional commits that semantic-release analyzes.

CI also evaluates the pull request title as a prospective squash commit. If
squash merging is used, the title must itself produce a release and must
preserve the release type predicted from the full prospective merge range. For
example:

```text
fix(release): prepare CLI patch release
feat(release): prepare CLI minor release
```

A title such as `chore(release): prepare release` or
`ci(release): verify release` does not produce a semantic release. Use the
merge-commit strategy for breaking releases so the explicit breaking footer is
retained.

Merging to `main` is not merely an integration action: it starts the trusted
publication workflow. Do not merge until the intended version, release notes,
package contents, and merge strategy are ready to publish.

## Validated Main Publication

The `Publish` workflow runs only for a push to `main` and uses two jobs:

1. `Validate Main Commit` checks out the event's exact `github.sha`, receives
   only read permission, and runs `npm run release:verify`. That aggregate runs
   the build, typecheck, all tests, package-content assertions, installed
   tarball smoke test, and safe release analysis.
2. `Publish Package` waits for that exact-SHA validation. It alone receives
   release permissions and credentials, checks out the same SHA, rebuilds
   `dist`, and refuses to continue unless `origin/main` still points to the
   validated commit.
3. The release job runs authenticated semantic-release with `--dry-run`, checks
   `origin/main` again, and only then runs the real semantic-release command.

Publish runs share a concurrency group, so a newer `main` push supersedes an
older run. The explicit SHA checks also prevent a stale rerun from publishing an
older commit.

semantic-release dry-run mode still verifies repository and registry
credentials, so it belongs only in the trusted post-merge release job. A
maintainer can repeat that check from the current trusted `main` commit with:

```bash
GITHUB_TOKEN="$GITHUB_TOKEN" NPM_TOKEN="$NPM_TOKEN" \
  npm run semantic-release -- --dry-run
```

Pull-request CI uses `npm run release:analyze` instead and never receives those
credentials. Do not run `npm run semantic-release` without `--dry-run` unless
the maintainers intend to publish.

## semantic-release Plugins

| Plugin                                      | Purpose                                                               |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `@semantic-release/commit-analyzer`         | Determine the release type from the shared conventional-commit rules. |
| `@semantic-release/release-notes-generator` | Generate release notes with the same parser options.                  |
| `@semantic-release/npm`                     | Publish the package to npm.                                           |
| `@semantic-release/github`                  | Create GitHub release metadata.                                       |

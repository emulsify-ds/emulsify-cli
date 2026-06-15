# Release

This project publishes to npm with GitHub Actions and semantic-release.

## Branches

| Branch    | Behavior                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------- |
| `develop` | CI validates changes. A workflow may update `package.json` and `package-lock.json` from semantic commits. |
| `main`    | CI validates changes and the publish workflow runs semantic-release.                                      |

## CI Checks

The workflows use Node.js 24 and run the project checks from a clean install.

Typical validation includes:

```bash
npm ci
npm run build
npm run type
npm run test
npm pack --dry-run
```

There are currently both `ci.yml` and `test.yml` workflows that validate pull requests and pushes.

## Develop Version Bump

Pushes to `develop` run:

```bash
npm run version:develop -- <before-sha> <after-sha>
```

If semantic commits imply a package version change, the workflow commits updated package metadata back to `develop` with:

```text
chore(release): bump version to <version> [skip ci]
```

## Publishing

Pushes to `main` run the `Publish` workflow:

1. Check out full Git history.
2. Install Node.js 24.
3. Run `npm ci`.
4. Run `npm run build`.
5. Run `npm run semantic-release`.

semantic-release is configured in `release.config.cjs` with:

| Plugin                                      | Purpose                                           |
| ------------------------------------------- | ------------------------------------------------- |
| `@semantic-release/commit-analyzer`         | Determine the release type from semantic commits. |
| `@semantic-release/release-notes-generator` | Generate release notes.                           |
| `@semantic-release/npm`                     | Publish the package to npm.                       |
| `@semantic-release/github`                  | Publish GitHub release metadata.                  |

The publish workflow uses `GITHUB_TOKEN` and `NPM_TOKEN` from GitHub Actions.

## Commit Conventions

The release config uses the Angular preset. Breaking changes are detected from:

```text
BREAKING CHANGE
BREAKING CHANGES
BREAKING
```

Example release-driving commits:

```text
fix(component): preserve dependency install order
feat(init): support non-interactive defaults
feat(system)!: require explicit custom checkouts

BREAKING CHANGE: custom system installs now require --checkout.
```

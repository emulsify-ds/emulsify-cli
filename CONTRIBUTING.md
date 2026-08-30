# Contributing

Thank you for contributing to Emulsify CLI. This file is a short entry point;
the detailed development and release guidance remains in the canonical project
documentation:

- [Development](./docs/development.md) covers setup, repository layout,
  scripts, generated files, and local verification.
- [Release](./docs/release.md) covers branch strategy, semantic-release, and
  the checks applied to release-bound changes.

## Choose the Target Branch

Open normal feature, fix, test, and documentation pull requests against
`develop`. The `main` branch is the trusted publication branch; a merge to
`main` can publish the exact merged commit after its release gates pass.

Report suspected vulnerabilities through the private channel in
[SECURITY.md](./SECURITY.md), not through a public issue.

## Commits and Pull Request Titles

Every commit must follow the
[Conventional Commits](https://www.conventionalcommits.org/) format. The
repository extends `@commitlint/config-conventional`, and Husky's `commit-msg`
hook runs `npm run husky:commit-msg` to reject non-conforming commits. Running
`npm install` installs the hooks through the `prepare` script.

Examples include:

```text
fix(cache): reuse an available local clone
feat(component): support a new component format
docs: clarify local verification
```

Every pull request targeting `main` must also have a release-producing
conventional title whose release type matches the prospective release. CI
evaluates that title as a prospective squash commit; if squash merging is used,
the title becomes the release-bearing commit. For example:

```text
fix(release): prepare CLI patch release
feat(release): prepare CLI minor release
```

See [Develop-to-Main Merge Expectations](./docs/release.md#develop-to-main-merge-expectations)
before opening or merging a pull request to `main`.

## Verify the Change

Follow the [Local Verification](./docs/development.md#local-verification)
commands before opening a pull request. Add or update tests for behavior
changes, and explain any verification step you could not run in the pull
request description.

# Development

Emulsify CLI is a TypeScript project that builds to the `dist` directory and publishes the `emulsify` binary from `dist/index.js`.

## Setup

Use the Node.js version in `.nvmrc`, which should satisfy the package requirement of Node.js 24 or newer.

```bash
nvm use
npm install
npm run build
npm link
```

After `npm link`, run the local CLI:

```bash
emulsify --help
```

## Source Layout

| Path                | Purpose                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/index.ts`      | Commander command composition and top-level error handling.                                                  |
| `src/handlers`      | Command handlers for `init`, `system`, and `component` commands.                                             |
| `src/handlers/hofs` | Shared handler wrappers, including progress and system-loading helpers.                                      |
| `src/lib`           | Logging, constants, and CLI error primitives.                                                                |
| `src/schemas`       | JSON Schemas for project, system, and variant configuration.                                                 |
| `src/scripts`       | TypeScript maintenance scripts, including schema type generation.                                            |
| `src/types`         | Type modules. Generated schema types are prefixed with `_`.                                                  |
| `src/util`          | Platform detection, cache utilities, filesystem helpers, component generation, and project config utilities. |
| `scripts`           | Package verification and release-calculation scripts, plus their regression tests.                           |
| `test/e2e`          | End-to-end tests that run the built CLI against temporary local Git repositories.                            |

## Scripts

| Script                       | Purpose                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run clean`              | Remove all generated files from `dist`.                                                            |
| `npm run build`              | Clean `dist`, generate schema types, compile the runtime package, and mark the CLI bin executable. |
| `npm run build-schema-types` | Generate TypeScript definitions from JSON Schema files.                                            |
| `npm run build-ts`           | Compile TypeScript with `tsconfig.dist.json`.                                                      |
| `npm run pack:dry-run`       | Inspect npm's structured package manifest and assert the expected runtime-only contents.           |
| `npm run smoke:pack`         | Pack the real tarball, install it in a clean temporary project, and run the installed CLI.         |
| `npm run watch`              | Rebuild when files in `src` change.                                                                |
| `npm run watch-ts`           | Recompile TypeScript when files in `src` change.                                                   |
| `npm run format`             | Run Prettier on source TypeScript and JavaScript files.                                            |
| `npm run husky:commit-msg`   | Validate a commit message with the repository's conventional commitlint rules.                     |
| `npm run husky:pre-commit`   | Run the repository's lint-staged pre-commit checks.                                                |
| `npm run husky:pre-push`     | Run the complete test suite before pushing.                                                        |
| `npm run lint`               | Run the complete test suite through `npm run test`.                                                |
| `npm run test`               | Run unit and release tests, build the CLI, then run the end-to-end suite.                          |
| `npm run test:e2e`           | Run the built CLI end to end with Node's test runner.                                              |
| `npm run test:unit`          | Run the Jest unit suite with coverage.                                                             |
| `npm run test:release`       | Run the release-calculation integration tests with Node's test runner.                             |
| `npm run type`               | Run TypeScript checking without emitting files.                                                    |
| `npm run twatch`             | Run Jest without coverage in watch mode.                                                           |
| `npm run version:develop`    | Update package metadata from the complete unreleased conventional-commit history.                  |
| `npm run release:analyze`    | Verify the predicted release without invoking publishing plugins.                                  |
| `npm run release:verify`     | Run every build, test, package, smoke, and release-analysis gate used before publication.          |
| `npm run semantic-release`   | Publish through semantic-release; use `-- --dry-run` unless publication is explicitly intended.    |
| `npm run prepare`            | Install this repository's Husky Git hooks after installing dependencies.                           |

Run one test file by passing the path after `--`:

```bash
npm run test:unit -- src/handlers/componentCreate.test.ts
```

## End-to-End Tests

The tests in `test/e2e/` use Node's test runner to spawn the real built binary
at `dist/index.js`. They create local Git repositories and an isolated home and
cache beneath the operating system's temporary directory, so they do not use
the network or the developer's Emulsify cache.

These tests must remain outside `src/`. Jest applies `jest.setup.cjs` to every
test under `src/`, globally mocking `simple-git`, `fs`, `fs-extra`,
`child_process`, and `progress`; those mocks would prevent a real end-to-end
run.

Build first, then run one end-to-end file directly:

```bash
npm run build
node --test ./test/e2e/cli.test.mjs
```

## Generated Types

Schema-derived type files live in `src/types` and are generated by:

```bash
npm run build-schema-types
```

Run this after changing files in `src/schemas`.

## Local Verification

Before opening a PR, run:

```bash
npm ci
npm run build
npm run type
npm run test
npm run pack:dry-run
npm run smoke:pack
```

The package checks verify npm's actual file list, create the real tarball, install it
with its declared runtime dependencies, and exercise `emulsify --help` and
`emulsify --version`. Temporary tarballs and install projects are removed whether
the smoke test passes or fails.

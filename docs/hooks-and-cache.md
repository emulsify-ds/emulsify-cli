# Hooks And Cache

Emulsify CLI can run project setup hooks and caches cloned system repositories locally.

## Starter Init Hook

During `emulsify init`, the CLI checks the cloned starter for:

```text
.cli/init.js
```

If the file exists, it is executed with the same Node.js binary running the CLI.

Execution timing:

1. Starter repository is cloned.
2. `project.emulsify.json` is written.
3. Project dependencies are installed.
4. `.cli/init.js` runs if present.
5. The starter `.git` directory is removed.

The hook working directory is the hook file directory, so relative file operations are resolved from `.cli/`.

Example starter hook:

```js
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

await writeFile(resolve('..', '.env.example'), 'STORYBOOK_PORT=6006\n');
```

## System Install Hook

The CLI has a `systemInstall.js` hook constant for system installation workflows:

```text
.cli/systemInstall.js
```

When system install can discover the hook location, it executes the file with Node.js after required components and general assets are installed.

Use this hook for setup that must happen after a system has populated project files. Keep it idempotent because system installs may be repeated in local development or test projects.

## Local Cache

System repositories are cloned into the Emulsify cache directory:

```text
~/.emulsify/cache
```

The cache path includes:

| Input               | Why It Matters                                                     |
| ------------------- | ------------------------------------------------------------------ |
| Cache bucket        | Systems currently use the `systems` bucket.                        |
| Project config path | Different Emulsify projects get separate cache locations.          |
| Checkout            | Different tags, branches, or commits get separate cache locations. |
| System name         | The parsed repository name becomes the final cache segment.        |

The project path and checkout are hashed, so the full path is intentionally not human-friendly.

## Cache Reuse

If the expected cached repository already exists, the CLI reuses it instead of cloning again. This keeps repeated component installs fast and keeps a project pinned to the checkout recorded in `project.emulsify.json`.

If you need to force a fresh clone, remove the relevant cache directory under:

```text
~/.emulsify/cache/systems
```

There is currently no CLI command for clearing the cache.

## Copy Behavior

Component and asset copies come from the cache into the current project.

| Command             | Copy Source                                                            | Destination                                                             |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `system install`    | Required or all system components, plus variant files and directories. | Project paths from the selected variant.                                |
| `component install` | One component and its dependencies, or all components.                 | Structure implementation directories in `project.emulsify.json`.        |
| `component create`  | Built-in templates or `.cli/templates` overrides.                      | Structure implementation directory selected by `--directory` or prompt. |

Install commands use safe path resolution so component and asset destinations stay inside the Emulsify project root.

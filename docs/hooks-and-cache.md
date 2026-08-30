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
| Repository          | Different repository URLs get separate cache locations.            |
| Checkout            | Different tags, branches, or commits get separate cache locations. |
| System name         | The parsed repository name becomes the final cache segment.        |

The project path, normalized repository URL, and checkout are hashed, so the full path is intentionally not human-friendly. This prevents same-named repositories at the same checkout from sharing an entry.

## Cache Reuse

After a successful clone, the CLI writes `.emulsify-cache.json` inside the cache entry. The sidecar records the repository, requested checkout, resolved Git ref, clone time, and a completion marker. It is written only after cloning and ref resolution succeed.

Before reusing an entry, the CLI validates the sidecar, repository, checkout, local `origin` fetch URL, and local `HEAD`. Missing, malformed, incomplete, or mismatched entries are removed and cloned again. Routine component commands perform only these local checks, so an installed system remains usable offline.

`system install` checks remote freshness when reusing a cache entry. Component commands do so only when passed `--refresh`. The bounded lookup compares a named checkout such as `main` (or the default remote `HEAD`) with the recorded resolved ref and re-clones when it has advanced. If the remote check times out or is otherwise unavailable, a locally valid clone remains usable.

To inspect how much would be removed without changing files, run:

```bash
emulsify cache clear --dry-run
```

To remove every cache bucket and entry under `~/.emulsify/cache`, run:

```bash
emulsify cache clear
```

Both commands report bucket and entry counts. Clearing an already empty cache succeeds without an error.

## Copy Behavior

Component and asset copies come from the cache into the current project.

| Command             | Copy Source                                                            | Destination                                                             |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `system install`    | Required or all system components, plus variant files and directories. | Project paths from the selected variant.                                |
| `component install` | One component and its dependencies, or all components.                 | Structure implementation directories in `project.emulsify.json`.        |
| `component create`  | Built-in templates or `.cli/templates` overrides.                      | Structure implementation directory selected by `--directory` or prompt. |

Install commands use safe path resolution so component and asset destinations stay inside the Emulsify project root.

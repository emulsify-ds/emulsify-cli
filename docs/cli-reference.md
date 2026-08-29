# CLI Reference

Emulsify CLI installs as the `emulsify` binary.

```bash
emulsify
emulsify --help
emulsify <command> --help
```

The examples below reflect the command definitions in `src/index.ts` and the generated help from the built `dist/index.js` entry point.

## Commands

| Command                             | Alias                         | Description                                                      |
| ----------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `emulsify init [name] [path]`       |                               | Initialize an Emulsify project from a starter.                   |
| `emulsify audit [...args]`          |                               | Run the project-installed Emulsify Core audit.                   |
| `emulsify system list`              | `emulsify system ls`          | List built-in systems available for installation.                |
| `emulsify system install [name]`    |                               | Install or scaffold a system in the current Emulsify project.    |
| `emulsify component list`           | `emulsify component ls`       | List components available from the installed system and variant. |
| `emulsify component install [name]` | `emulsify component i [name]` | Install a component from the installed system and variant.       |
| `emulsify component create [name]`  | `emulsify component c [name]` | Generate a new local component in the current project.           |
| `emulsify cache clear`              |                               | Clear locally cached system repositories.                        |

## `init`

```bash
emulsify init [name] [path]
```

Options:

| Option                               | Description                                                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `-m, --machineName <machineName>`    | Machine-friendly project folder and config name. If omitted, the CLI derives it from the project name. Drupal machine names use underscores. |
| `-s, --starter <repository>`         | Starter Git repository to clone.                                                                                                             |
| `-c, --checkout <commit/branch/tag>` | Starter commit, branch, or tag to check out after clone.                                                                                     |
| `-p, --platform <platform>`          | Platform to use when auto-detection is unavailable or should be overridden. Built-in platforms are `drupal`, `wordpress`, and `none`.        |
| `-y, --yes`                          | Accept default values for missing init options without prompting.                                                                            |

When `--platform` is not provided and the platform cannot be detected, interactive terminals prompt with `drupal`, `wordpress`, and `none`.

WordPress auto-detection creates child themes inside the detected themes directory:

- Standard WordPress: `wp-content/themes/<machine-name>`
- Bedrock: `web/app/themes/<machine-name>`

The built-in WordPress starter is `https://github.com/emulsify-ds/emulsify-wordpress-starter`.

Examples:

```bash
emulsify init "My Project" ./projects --platform none
emulsify init "My Theme" ./web/themes/custom --platform drupal
emulsify init "My Theme" ./wp-content/themes --platform wordpress
emulsify init "My Theme" ./web/themes/custom --platform drupal --machineName my_custom_theme
emulsify init "My Project" ./projects --starter https://github.com/emulsify-ds/emulsify-starter --checkout main --platform none
```

## `audit`

```bash
emulsify audit [...args]
```

This command is a convenience façade for the `emulsify-audit` executable
declared by the selected project's installed `@emulsify/core` package. It
resolves Core from `--root <dir>` when supplied, or from the current directory,
then forwards every argument plus stdin, stdout, stderr, and the Core process
exit status without decoration.

```bash
emulsify audit --help
emulsify audit --json
emulsify audit --root /path/to/project --json --fail-on warn
```

Core must be installed in the selected project. `emulsify-audit` remains the
canonical Core-owned machine interface; Core owns its audit checks, findings,
JSON schema, documentation, output, and exit behavior. See the
[Emulsify Core audit documentation](https://github.com/emulsify-ds/emulsify-core/blob/develop/docs/audit.md)
for the current contract and options.

## `cache clear`

```bash
emulsify cache clear
```

Removes all locally cached repository entries under `~/.emulsify/cache`. The command reports the number of cache buckets and entries removed, and succeeds when the cache is already empty.

Options:

| Option      | Description                                       |
| ----------- | ------------------------------------------------- |
| `--dry-run` | Report cache contents without removing any files. |

Examples:

```bash
emulsify cache clear --dry-run
emulsify cache clear
```

## `system list`

```bash
emulsify system list
emulsify system ls
```

Lists the built-in system names and repositories known to this CLI version.

## `system install`

```bash
emulsify system install [name]
```

Run without `[name]` in an interactive terminal to choose from built-in systems, scaffold a new system definition, or cancel:

```text
? Choose a component system:
❯ compound
  emulsify-ui-kit
  create a new system
  cancel
```

Options:

| Option                               | Description                                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `-r, --repository <repository>`      | Install a system from a specific Git repository. Custom repository URLs must end in `.git`.                                                      |
| `-c, --checkout <commit/branch/tag>` | Checkout to use. This is required when `--repository` is used.                                                                                   |
| `-a, --all`                          | Install every component in the selected variant. Without this flag, only components marked `required: true` are installed during system install. |

Examples:

```bash
emulsify system install
emulsify system install compound
emulsify system install emulsify-ui-kit
emulsify system install compound --all
emulsify system install --repository https://github.com/example/example-system.git --checkout v1.0.0
```

Selecting `create a new system` writes `system.emulsify.json` in the current Emulsify project root. Complete the generated system name, repository, structures, variants, and components before using it to install or generate components.

System variant compatibility is selected from each variant's `platform` expression. Examples:

- `"platform": "wordpress"` matches WordPress projects.
- `"platform": "drupal || wordpress"` matches Drupal and WordPress projects.
- `"platform": "none"` is generic and can be installed by any concrete project platform.

Project configuration uses only concrete `project.platform` values: `drupal`, `wordpress`, or `none`. Only system variants use `||` expressions. A project with `project.platform: "none"` can install any component library system; when multiple variants are equally compatible, the CLI prompts in an interactive terminal or errors in non-interactive mode.

## `component list`

```bash
emulsify component list
emulsify component ls
```

Lists components available from the installed system and selected variant. Output uses the component structure followed by the component name, for example `atoms -> buttons`.

## `component install`

```bash
emulsify component install [name]
emulsify component i [name]
```

Options:

| Option        | Description                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `-f, --force` | Replace an existing component destination without prompting.                                        |
| `-a, --all`   | Install all available components instead of one named component.                                    |
| `--dry-run`   | Preview dependencies, destinations, overwrite behavior, and copy operations without changing files. |

Examples:

```bash
emulsify component install card
emulsify component install card --dry-run
emulsify component i accordion --force
emulsify component install --all
```

## `component create`

```bash
emulsify component create [name]
emulsify component c [name]
```

Options:

| Option                        | Description                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `-d, --directory <directory>` | Variant structure name where the component should be created.                         |
| `-f, --format <format>`       | Component format to generate. Supported values are `default` and `sdc`.               |
| `-y, --yes`                   | Replace an existing generated component without prompting.                            |
| `--dry-run`                   | Preview destination and generated files without writing, removing, or creating files. |

Examples:

```bash
emulsify component create promo-card --directory molecules --format default
emulsify component create promo-card --directory molecules --format default --dry-run
emulsify component c teaser --directory molecules --format sdc --yes
```

In a non-interactive environment, pass both `--directory` and `--format`; otherwise the command errors instead of waiting for prompts that cannot be answered.

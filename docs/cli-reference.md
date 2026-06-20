# CLI Reference

Emulsify CLI installs as the `emulsify` binary.

```bash
emulsify --help
emulsify <command> --help
```

The examples below reflect the command definitions in `src/index.ts` and the generated help from the built `dist/index.js` entry point.

## Commands

| Command                             | Alias                         | Description                                                      |
| ----------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `emulsify init [name] [path]`       |                               | Initialize an Emulsify project from a starter.                   |
| `emulsify system list`              | `emulsify system ls`          | List built-in systems available for installation.                |
| `emulsify system install [name]`    |                               | Install or scaffold a system in the current Emulsify project.    |
| `emulsify component list`           | `emulsify component ls`       | List components available from the installed system and variant. |
| `emulsify component install [name]` | `emulsify component i [name]` | Install a component from the installed system and variant.       |
| `emulsify component create [name]`  | `emulsify component c [name]` | Generate a new local component in the current project.           |

## `init`

```bash
emulsify init [name] [path]
```

Options:

| Option                               | Description                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `-m, --machineName <machineName>`    | Machine-friendly project folder and config name. If omitted, the CLI derives it from the project name. Drupal machine names use underscores.   |
| `-s, --starter <repository>`         | Starter Git repository to clone.                                                                                                               |
| `-c, --checkout <commit/branch/tag>` | Starter commit, branch, or tag to check out after clone.                                                                                       |
| `-p, --platform <platform>`          | Platform to use when auto-detection is unavailable or should be overridden. Built-in starters are currently available for `drupal` and `none`. |
| `-y, --yes`                          | Accept default values for missing init options without prompting.                                                                              |

When `--platform` is not provided and the platform cannot be detected, interactive terminals prompt with `drupal` and `none`.

Examples:

```bash
emulsify init "My Project" ./projects --platform none
emulsify init "My Theme" ./web/themes/custom --platform drupal
emulsify init "My Theme" ./web/themes/custom --platform drupal --machineName my_custom_theme
emulsify init "My Project" ./projects --starter https://github.com/emulsify-ds/emulsify-starter --checkout main --platform none
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

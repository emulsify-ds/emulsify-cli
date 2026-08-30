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
| `emulsify system create [name]`     |                               | Create a standalone, distributable component system.             |
| `emulsify system install [name]`    |                               | Install a system in the current Emulsify project.                |
| `emulsify system detach`            |                               | Detach the system and keep project components.                   |
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

## `system create`

```bash
emulsify system create [name]
```

Creates a standalone component-system repository. It does not require an
Emulsify project and does not change `project.emulsify.json`. The supplied name
is normalized to a lowercase, hyphenated machine name. The target is the
normalized name beneath the parent passed to `--directory`; for example,
`"My System" --directory ./systems` creates `./systems/my-system`.

Options:

| Option                                 | Description                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| `-d, --directory <directory>`          | Parent directory in which the normalized system directory is created.                |
| `-p, --platform <platform-expression>` | Variant target: `none`, a concrete platform, or a compound compatibility expression. |
| `--git`                                | Initialize a Git repository in the generated system.                                 |
| `--no-git`                             | Generate the system without initializing Git.                                        |
| `--homepage <url>`                     | Override the homepage metadata written to `system.emulsify.json`.                    |
| `--repository <url>`                   | Override the repository metadata written to `system.emulsify.json`.                  |
| `-y, --yes`                            | Accept defaults for every missing prompt value.                                      |

In an interactive terminal, missing name, parent directory, platform expression,
and Git choice are prompted. In a non-interactive environment, provide them as
arguments and flags or use `--yes`; the command exits with an actionable error
instead of waiting for input.

With `--yes`, missing values default to:

- Name: `custom-system`
- Parent directory: `./`
- Platform expression: `none`
- Git initialization: enabled

The generated homepage and repository metadata use placeholder example URLs
derived from the normalized name unless `--homepage` or `--repository` is
provided. Replace placeholders before publishing.

The command refuses to overwrite an existing target. A successful scaffold
contains:

```text
my-system/
├── .gitignore
├── LICENSE
├── README.md
├── system.emulsify.json
└── components/
    └── example-card/
        ├── example-card.scss
        ├── example-card.stories.js
        ├── example-card.twig
        └── example-card.yml
```

The generated `example-card` is marked as required, so installing the system
also proves that its component source layout is usable. `--git` additionally
creates the `.git/` metadata directory with `main` as the initial branch.

Examples:

```bash
emulsify system create
emulsify system create "My System" --directory ./systems --platform none --git
emulsify system create shared-system --directory ./systems --platform "drupal || wordpress" --no-git
emulsify system create my-system --yes
emulsify system create my-system --directory ./systems --platform drupal --git \
  --homepage https://design.example.com/my-system \
  --repository https://github.com/example/my-system.git
```

## `system install`

```bash
emulsify system install [name]
```

Run without a name or repository in an interactive terminal to start the guided
installer. The built-in path covers four decisions: source, component set,
installation scope, and final review.

The source picker presents human-readable system names and descriptions:

```text
Which system?
❯ Compound              Accessible, tested components. Drupal, WordPress, plain.
  Emulsify UI Kit       Broader design-system starter kit.
  Bring your own        Install from a git repository you control.
  ────────────
  Cancel
```

After the selected system is downloaded and validated, the component-set picker
shows each variant in plain language with its raw platform expression in
parentheses. Compatible choices are ordered first, and the best match for the
current project is marked `Recommended` and selected by default. Each choice
also shows its total component count and how many are essential.

The scope picker offers:

- `Essentials only` — install only components marked `required: true`.
- `Everything` — install every component in the selected component set.

Both choices include their component counts. The review then shows the selected
system and checkout, repository source, component set, scope, component and
asset counts, and their concrete destination paths. The CLI asks
for confirmation before changing `project.emulsify.json`, copying components or
assets, or running the project install hook. The selected repository may already
have been downloaded into the CLI cache so its configuration can be reviewed.

```text
Install a component system                                Step 4 of 4

  System         Compound  ·  v2.3.1
  Source         github.com/emulsify-ds/compound
  Component set  Drupal
  Scope          Essentials only
  Will install   5 components  →  components/
                 2 asset folders  →  assets/, src/vendor/

? Install now? (Y/n)
```

Pass `-y, --yes` to display this final review and accept it without opening the
confirmation prompt. It does not choose a missing source, component set, or
installation scope.

Selecting `Bring your own` adds prompts for a repository URL or local path and a
checkout (branch, tag, or commit); the displayed step total expands to include
them. Selecting `Cancel`, or declining the final review, reports `System install
cancelled.` and leaves the project configuration and destinations unchanged.

Supplying a built-in name or both custom-repository flags bypasses the guided
installer and preserves the direct command behavior. Variant compatibility is
resolved automatically unless `--variant` is supplied, and only essential
components are installed unless `--all` is supplied.

Options:

| Option                               | Description                                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `-r, --repository <repository>`      | Install from a remote Git repository or a local repository path. Remote URLs must end in `.git`.                                                 |
| `-c, --checkout <commit/branch/tag>` | Checkout to use. This is required when `--repository` is used.                                                                                   |
| `--variant <platform-expression>`    | Install the variant whose platform expression exactly matches this value. Quote compound expressions at the shell.                               |
| `-a, --all`                          | Install every component in the selected variant. Without this flag, only components marked `required: true` are installed during system install. |
| `-y, --yes`                          | Accept the final guided-install review without prompting. It does not supply any earlier wizard choice.                                          |

Prompts are never opened when standard input is not a TTY. A bare command fails
immediately with this guidance:

```text
No component system source was provided. Pass a built-in system name as the positional argument, or pass both --repository <repository> and --checkout <branch, tag, or commit>.
```

For scripts and CI, pass a built-in name or pass both `--repository` and
`--checkout`. Supplying only one custom-repository option also fails immediately
and names the missing flag. `--yes` does not make a bare command
non-interactive: the source, component set, and scope still require choices.

Examples:

```bash
emulsify system install
# Interactive wizard with no final confirmation prompt:
emulsify system install --yes
emulsify system install compound
emulsify system install emulsify-ui-kit
emulsify system install compound --all
emulsify system install --repository https://github.com/example/example-system.git --checkout v1.0.0
emulsify system install --repository https://github.com/example/example-system.git --checkout v1.0.0 --variant wordpress
emulsify system install --repository /absolute/path/to/local-system --checkout v1.0.0
```

System variant compatibility is selected from each variant's `platform` expression. Examples:

- `"platform": "wordpress"` matches WordPress projects.
- `"platform": "drupal || wordpress"` matches Drupal and WordPress projects.
- `"platform": "none"` is generic and can be installed by any concrete project platform.

Project configuration uses only concrete `project.platform` values: `drupal`, `wordpress`, or `none`. Only system variants use `||` expressions. A project with `project.platform: "none"` can install any component library system; when multiple variants are equally compatible, the CLI prompts in an interactive terminal or errors in non-interactive mode.

Pass `--variant` to choose an exact variant platform expression instead of automatic compatibility selection. Quote a shared expression at the shell, for example `--variant "drupal || wordpress"`.

## `system detach`

```bash
emulsify system detach
```

Detaches the configured component system from the current Emulsify project. The
command rewrites only `project.emulsify.json`, removing its top-level `system`
and `variant` entries while preserving every other configuration value.
Components, project assets, generated files, and the cached system repository
are not edited or removed.

Options:

| Option      | Description                                               |
| ----------- | --------------------------------------------------------- |
| `-y, --yes` | Confirm detachment without opening an interactive prompt. |

Interactive terminals ask for confirmation before changing the configuration.
Declining reports cancellation and leaves the project unchanged. When standard
input is not a TTY, omit `--yes` and the command fails immediately with a message
naming the flag instead of prompting or proceeding silently:

```bash
emulsify system detach --yes
```

The command also fails when no Emulsify project can be found or when the project
has no configured system; the latter is reported as a no-op rather than success.
After a successful detach, `emulsify system install` can configure a system
again. Use `emulsify cache clear` separately if all cached repositories should
be removed.

To turn refined project components into a system, detach first, run
`emulsify system create` to create a fresh repository, then move or copy the
preserved components into that scaffold and update its `system.emulsify.json`.
`system create` does not import project components automatically.

## `component list`

```bash
emulsify component list
emulsify component ls
emulsify component list --refresh
```

Lists components available from the installed system and selected variant. Output uses the component structure followed by the component name, for example `atoms -> buttons`.

Pass `--refresh` to check the system's remote ref before listing. Without it, the command validates and reuses the local cache without touching the network.

## `component install`

```bash
emulsify component install [name]
emulsify component i [name]
```

In an interactive terminal, omit `[name]` and `--all` to choose from the
components actually available in the installed system variant. The picker also
includes an explicit choice to install all available components.

Options:

| Option        | Description                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `-f, --force` | Replace an existing component destination without prompting.                                        |
| `-a, --all`   | Install all available components instead of one named component.                                    |
| `--dry-run`   | Preview dependencies, destinations, overwrite behavior, and copy operations without changing files. |
| `--refresh`   | Check the system's remote ref before reusing its local cache entry.                                 |

Examples:

```bash
emulsify component install card
emulsify component install card --refresh
emulsify component install card --dry-run
emulsify component i accordion --force
emulsify component install --all
```

When standard input is not a TTY, provide either `[name]` or `--all`; the CLI
exits with an actionable error instead of opening the picker. If a named
component destination already exists, the command also exits unless `--force`
is passed to replace it without an overwrite prompt.

## `component create`

```bash
emulsify component create [name]
emulsify component c [name]
```

Run without `[name]` in an interactive terminal to start the complete creation
wizard. The CLI prompts for the component name first, explains invalid names and
prompts again, then asks for any missing format and directory values. Supplying
any of those values on the command line skips its corresponding prompt.

Options:

| Option                        | Description                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `-d, --directory <directory>` | Variant structure name where the component should be created.                         |
| `-f, --format <default\|sdc>` | Component format to generate.                                                         |
| `-y, --yes`                   | Replace an existing generated component without prompting.                            |
| `--dry-run`                   | Preview destination and generated files without writing, removing, or creating files. |
| `--refresh`                   | Check the system's remote ref before reusing its local cache entry.                   |

Examples:

```bash
emulsify component create promo-card --directory molecules --format default
emulsify component create promo-card --directory molecules --format default --refresh
emulsify component create promo-card --directory molecules --format default --dry-run
emulsify component c teaser --directory molecules --format sdc --yes
```

When standard input is not a TTY, provide the positional `[name]` plus both
`--directory` and `--format`; otherwise the command exits with an actionable
error instead of waiting for prompts that cannot be answered. If the generated
component already exists, also pass `--yes` to replace it without an overwrite
prompt.

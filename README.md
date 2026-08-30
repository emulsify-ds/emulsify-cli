[![Emulsify Design System](https://user-images.githubusercontent.com/409903/170579210-327abcdd-2c98-4922-87bb-36446a4cc013.svg)](https://www.emulsify.info/)
![npm](https://img.shields.io/npm/dm/@emulsify/cli?style=flat-square)

# Emulsify CLI

Build and use component systems in Drupal, WordPress, or standalone front ends.

## Requirements

Emulsify CLI requires Node.js 24 or newer.

## Installation

Install Emulsify CLI globally from [npm](https://www.npmjs.com/package/@emulsify/cli):

```bash
npm install -g @emulsify/cli
```

Run the current command help at any time:

```bash
emulsify
emulsify --help
```

## Quick Start

Create a Drupal starter project, install a system, and add components:

```bash
emulsify init "My Theme" ./web/themes/custom --platform drupal
cd ./web/themes/custom/my_theme
emulsify system install
emulsify component list
emulsify component install card
emulsify component create promo-card --directory molecules --type twig
```

Built-in platforms are `drupal`, `wordpress`, and `none`. For WordPress child themes, use the WordPress platform and starter:

```bash
emulsify init "My Theme" ./wp-content/themes --platform wordpress
```

When WordPress is auto-detected, Emulsify initializes child themes into the detected themes directory, such as `wp-content/themes/my-theme` or `web/app/themes/my-theme` for Bedrock.

To author a standalone, distributable component system, run `system create`
outside or inside any project. The target directory is created beneath the
selected parent directory:

```bash
emulsify system create "My System" --directory ./systems --platform "drupal || wordpress" --git
```

This creates `./systems/my-system` with valid system and variant configuration,
an installable `example-card` component, repository documentation, a
`.gitignore`, and a license placeholder to replace before distribution.
Unless overridden, its required URL metadata uses obvious, schema-valid
`https://TODO.invalid/...` placeholders that must also be replaced before
publishing.

When components installed from another system have evolved into the basis of
your own, detach the configured system before authoring a replacement:

```bash
emulsify system detach
```

Detaching removes only the `system` and `variant` entries from
`project.emulsify.json`. Components, project assets, and the cached system
repository stay in place. Run `system create` to scaffold a new system
repository, then move or copy the preserved components into that scaffold and
update `system.emulsify.json`; `system create` does not import them
automatically.

Interactive terminals can run `emulsify component create` with no arguments to
walk through the component name, type, and directory prompts. The type picker
always offers Twig, offers Twig SDC in Drupal projects, and offers React and Web
Component scaffolds when the project's `package.json` declares
`@emulsify/core`. When a choice is unavailable, the wizard explains why; when
Twig is the only suitable choice, it skips the one-item prompt. Likewise,
`emulsify component install` with no name presents the components available in
the installed system variant plus an explicit choice to install all components.

To customize component scaffolds, copy the CLI's built-in templates into the
project, then edit the resulting files under `.cli/templates/`:

```bash
emulsify component eject-templates twig
```

Run the command without a type in an interactive terminal to select one or more
component types. Use `--all` to eject every type non-interactively. Existing
overrides are protected unless `--force` is passed.

Prompts only run when standard input is a TTY. In CI, scripts, and commands with
piped or redirected input, provide every required positional argument and flag;
the CLI exits with an actionable error instead of waiting for input:

```bash
emulsify init "My Theme" ./web/themes/custom --platform drupal --yes
emulsify system create my-system --directory ./systems --platform none --git
emulsify system install compound
emulsify component install card --force
# Or install every available component:
emulsify component install --all
emulsify component create promo-card --directory molecules --type twig --force
emulsify component eject-templates --all
emulsify system detach --yes
```

For component installation, provide either a component name or `--all`, and use
`--force` when an existing destination should be replaced. For component
creation, provide the positional name plus `--type` and `--directory`, and use
`--force` when an existing generated component should be replaced. The existing
`-y, --yes` form remains available as a compatibility alias. Explicit
`--type` values are honored even when project detection would hide that choice
from the wizard. The deprecated `--format default` and `--format sdc` forms
remain available as aliases for `--type twig` and `--type twig-sdc`,
respectively, and print a deprecation warning.
For template ejection, provide the component type or `--all` outside a TTY; use
`--dry-run` to preview paths and `--force` only when existing customizations
should be replaced.

## Documentation

Detailed documentation lives in [docs](./docs/README.md).

| Topic                                                                  | Use This When                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [CLI Reference](./docs/cli-reference.md)                               | Looking up commands, aliases, options, and examples.                            |
| [Project Initialization](./docs/project-initialization.md)             | Creating a new Emulsify project from a starter.                                 |
| [Systems](./docs/systems.md)                                           | Listing, installing, detaching, or authoring component systems.                 |
| [Components](./docs/components.md)                                     | Listing, installing, dry-running, or creating components.                       |
| [Project Configuration](./docs/configuration.md)                       | Understanding `project.emulsify.json`, variants, and structure mappings.        |
| [Component Template Overrides](./docs/component-template-overrides.md) | Ejecting and customizing files used by `emulsify component create`.             |
| [Hooks And Cache](./docs/hooks-and-cache.md)                           | Understanding starter hooks, system hooks, and local repository cache behavior. |
| [Development](./docs/development.md)                                   | Setting up this repository and running local checks.                            |
| [Release](./docs/release.md)                                           | Understanding CI, semantic-release, and npm publishing.                         |

## Command Overview

| Command                                     | Alias                         | Description                                                       |
| ------------------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `emulsify init [name] [path]`               |                               | Initializes an Emulsify project from a starter.                   |
| `emulsify audit [...args]`                  |                               | Runs the project-installed Emulsify Core audit.                   |
| `emulsify system list`                      | `emulsify system ls`          | Lists built-in systems available for installation.                |
| `emulsify system create [name]`             |                               | Creates a standalone component-system repository.                 |
| `emulsify system install [name]`            |                               | Installs a system in the current Emulsify project.                |
| `emulsify system detach`                    |                               | Detaches the system and keeps project components.                 |
| `emulsify component list`                   | `emulsify component ls`       | Lists components available from the installed system and variant. |
| `emulsify component install [name]`         | `emulsify component i [name]` | Installs one component from the installed system and variant.     |
| `emulsify component create [name]`          | `emulsify component c [name]` | Creates a local component in the current Emulsify project.        |
| `emulsify component eject-templates [type]` |                               | Writes editable built-in templates into the current project.      |
| `emulsify cache clear`                      |                               | Clears locally cached system repositories.                        |

`emulsify audit` is a convenience façade. The project-installed
`@emulsify/core` package remains the owner of the canonical `emulsify-audit`
machine interface, checks, findings, JSON schema, output, and exit behavior.
See the [CLI reference](./docs/cli-reference.md#audit) and
[Core audit documentation](https://github.com/emulsify-ds/emulsify-core/blob/develop/docs/audit.md).

## Contributors

See [Contributors](./docs/contributors.md).

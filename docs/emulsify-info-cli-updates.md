# Emulsify CLI Website Usage Copy

This file contains copy-ready usage content for the `emulsify.info` Emulsify CLI page. The fuller source documentation lives in the adjacent docs:

- [CLI Reference](./cli-reference.md)
- [Project Initialization](./project-initialization.md)
- [Systems](./systems.md)
- [Components](./components.md)
- [Component Template Overrides](./component-template-overrides.md)

## Installation

Emulsify CLI requires Node.js 24 or newer.

Install Emulsify CLI globally from npm:

```bash
npm install -g @emulsify/cli
```

## Commands

| Command                             | Alias                         | Description                                                       |
| ----------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `emulsify init [name] [path]`       |                               | Initializes an Emulsify project from a starter.                   |
| `emulsify system list`              | `emulsify system ls`          | Lists built-in systems available for installation.                |
| `emulsify system install [name]`    |                               | Installs a system in the current Emulsify project.                |
| `emulsify component list`           | `emulsify component ls`       | Lists components available from the installed system and variant. |
| `emulsify component install [name]` | `emulsify component i [name]` | Installs one component from the installed system and variant.     |
| `emulsify component create [name]`  | `emulsify component c [name]` | Creates a local component in the current Emulsify project.        |

Run `emulsify <command> --help` for current options.

## Initialize A Project

`emulsify init [name] [path]` clones a starter, writes `project.emulsify.json`, installs dependencies, runs the starter init hook when present, and removes the starter Git history.

Options:

- `--machineName <machineName>`: Sets the machine-friendly project name. When omitted, Emulsify CLI derives it from the project name.
- `--starter <repository>`: Uses a specific starter repository.
- `--checkout <commit/branch/tag>`: Checks out a specific starter commit, branch, or tag.
- `--platform <platform>`: Sets the project platform when auto-detection is unavailable or should be overridden. Built-in platforms are `drupal`, `wordpress`, and `none`.
- `--yes`: Accepts default init values for missing options without prompting.

Built-in starter repositories:

- `https://github.com/emulsify-ds/emulsify-starter`
- `https://github.com/emulsify-ds/emulsify-drupal-starter`
- `https://github.com/emulsify-ds/emulsify-wordpress-starter`

Examples:

```bash
emulsify init "My Project" ./projects --platform none
emulsify init "My Theme" ./web/themes/custom --platform drupal --yes
emulsify init "My Theme" ./wp-content/themes --platform wordpress
emulsify init "My Project" ./projects --platform none --starter https://github.com/emulsify-ds/emulsify-starter --checkout main
```

When WordPress is auto-detected, Emulsify initializes child themes into the detected themes directory, such as `wp-content/themes/<machine-name>` or `web/app/themes/<machine-name>` for Bedrock.

## Systems

`emulsify system list` lists the built-in systems that Emulsify CLI can install. `emulsify system ls` is the same command.

```bash
emulsify system list
emulsify system ls
```

Built-in systems in this CLI version:

- `compound`
- `emulsify-ui-kit`

`emulsify system install [name]` installs a system in the current Emulsify project. The command installs required components by default.

System variants can declare platform compatibility with values such as `"wordpress"`, `"drupal || wordpress"`, or generic `"none"`. Project configuration uses only concrete `project.platform` values: `drupal`, `wordpress`, or `none`.

Options:

- `--repository <repository>`: Installs a system from a specific Git repository. Custom repository URLs must end in `.git`.
- `--checkout <commit/branch/tag>`: Checks out a specific system commit, branch, or tag. This is required when `--repository` is used.
- `--all`: Installs all available components from the system instead of only required components.

Examples:

```bash
emulsify system install compound
emulsify system install compound --all
emulsify system install --repository https://github.com/example/example-system.git --checkout v1.0.0
```

## Components

`emulsify component list` lists components available from the installed system and variant. `emulsify component ls` is the same command.

```bash
emulsify component list
emulsify component ls
```

`emulsify component install [name]` installs one component from the installed system and variant. `emulsify component i [name]` is the same command.

Options:

- `--force`: Replaces an installed component.
- `--all`: Installs all available components instead of one named component.
- `--dry-run`: Previews planned component installs, dependencies, destinations, and overwrite behavior without copying or removing files.

Examples:

```bash
emulsify component install card
emulsify component install card --dry-run
emulsify component i accordion --force
emulsify component install --all
```

`emulsify component create [name]` creates a local component in the current Emulsify project. `emulsify component c [name]` is the same command.

Options:

- `--directory <directory>`: Sets the variant structure where the component is created.
- `--format <format>`: Sets the component format. Supported values are `default` and `sdc`.
- `--yes`: Replaces an existing component without an overwrite confirmation prompt.
- `--dry-run`: Previews the destination and generated files without writing, removing, or creating files.

In non-interactive environments, pass both `--directory` and `--format`.

Examples:

```bash
emulsify component create promo-card --directory molecules --format default
emulsify component create promo-card --directory molecules --format default --dry-run
emulsify component create teaser --directory molecules --format sdc --yes
emulsify component create teaser --directory molecules --format sdc --dry-run
```

## Component Template Overrides

Projects can override the built-in `component create` templates by adding component template override files under `.cli/templates/` at the Emulsify project root. Overrides replace only the known artifacts that Emulsify CLI already generates; they do not add extra files or change which files are created.

Default component overrides:

- `.cli/templates/default/component.twig`
- `.cli/templates/default/component.scss`
- `.cli/templates/default/component.yml`
- `.cli/templates/default/component.stories.js`

SDC component overrides:

- `.cli/templates/sdc/component.twig`
- `.cli/templates/sdc/component.scss`
- `.cli/templates/sdc/component.component.yml`
- `.cli/templates/sdc/component.js`
- `.cli/templates/sdc/component.stories.js`

Override files can use double-brace tokens:

- `{{ filename }}`
- `{{ className }}`
- `{{ camelName }}`
- `{{ snakeName }}`
- `{{ humanName }}`
- `{{ directory }}`
- `{{ format }}`

For each generated artifact, Emulsify CLI first checks for the matching override file. If the override is missing, the built-in template is used. If the override exists but is empty, the built-in template is used and a warning is logged. Unknown tokens are left unchanged and logged as warnings. Partial override sets are supported, so a project can override only `component.twig` and keep the built-in SCSS, data, and story templates.

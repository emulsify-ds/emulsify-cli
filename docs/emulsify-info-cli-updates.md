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
| `emulsify audit [...args]`          |                               | Runs the project-installed Emulsify Core audit.                   |
| `emulsify system list`              | `emulsify system ls`          | Lists built-in systems available for installation.                |
| `emulsify system install [name]`    |                               | Installs a system in the current Emulsify project.                |
| `emulsify component list`           | `emulsify component ls`       | Lists components available from the installed system and variant. |
| `emulsify component install [name]` | `emulsify component i [name]` | Installs one component from the installed system and variant.     |
| `emulsify component create [name]`  | `emulsify component c [name]` | Creates a local component in the current Emulsify project.        |

Run `emulsify <command> --help` for current options.

`emulsify audit [...args]` is a convenience façade for the
project-installed `@emulsify/core` package. It forwards arguments, standard
streams, and exit status to Core's `emulsify-audit` executable.
`emulsify-audit` remains the canonical Core-owned machine interface, including
its checks, findings, JSON schema, documentation, output, and exit behavior.
See the
[Emulsify Core audit documentation](https://github.com/emulsify-ds/emulsify-core/blob/develop/docs/audit.md).

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
- `--type <type>`: Sets the component type. Supported values are `twig`, `twig-sdc`, `react`, and `web-component`.
- `--format <format>`: Deprecated compatibility alias. `default` maps to `twig`; `sdc` maps to `twig-sdc`, and both print a warning.
- `--yes`: Replaces an existing component without an overwrite confirmation prompt.
- `--dry-run`: Previews the destination and generated files without writing, removing, or creating files.

In the interactive wizard, Twig is always available, Twig SDC is shown only
for Drupal projects, and React and Web Component are shown when the project's
`package.json` declares `@emulsify/core`. The wizard explains why choices were
omitted and skips the type prompt when Twig is the only suitable choice.
Explicit `--type` values are always honored; requesting React or Web Component
without a detected Core dependency warns and proceeds.

In non-interactive environments, pass both `--directory` and `--type`.

Examples:

```bash
emulsify component create promo-card --directory molecules --type twig
emulsify component create teaser --directory molecules --type twig-sdc --yes
emulsify component create promo-card --directory molecules --type react
emulsify component create promo-card --directory molecules --type web-component
emulsify component create promo-card --directory molecules --type twig --dry-run
```

Generated artifact sets:

- `twig`: `.twig`, `.scss`, `.yml`, and `.stories.js`.
- `twig-sdc`: `.twig`, `.scss`, `.component.yml`, `.js`, and `.stories.js`.
- `react`: `.jsx`, `.scss`, and `.stories.jsx`; stories use standard Storybook React support.
- `web-component`: `.js`, `.scss`, and `.stories.js`; stories use Emulsify Core's `renderWebComponent` helper.

React and Web Component scaffolds do not include a Twig file. Web Component
tag names must contain a hyphen. A hyphenated filename is used directly;
otherwise the project machine name is prefixed, so `card` in `acme-theme`
becomes `<acme-theme-card>`. The wizard confirms and can override the tag.
Non-interactive creation derives and validates it.

## Component Template Overrides

Projects can override the built-in `component create` templates by adding component template override files under `.cli/templates/` at the Emulsify project root. Overrides replace only the known artifacts that Emulsify CLI already generates; they do not add extra files or change which files are created.

Twig component overrides:

- `.cli/templates/twig/component.twig`
- `.cli/templates/twig/component.scss`
- `.cli/templates/twig/component.yml`
- `.cli/templates/twig/component.stories.js`

Twig SDC component overrides:

- `.cli/templates/twig-sdc/component.twig`
- `.cli/templates/twig-sdc/component.scss`
- `.cli/templates/twig-sdc/component.component.yml`
- `.cli/templates/twig-sdc/component.js`
- `.cli/templates/twig-sdc/component.stories.js`

React component overrides:

- `.cli/templates/react/component.jsx`
- `.cli/templates/react/component.scss`
- `.cli/templates/react/component.stories.jsx`

Web Component overrides:

- `.cli/templates/web-component/component.js`
- `.cli/templates/web-component/component.scss`
- `.cli/templates/web-component/component.stories.js`

For each Twig artifact, the CLI checks `twig/` and, if that artifact is absent,
the legacy `default/` alias. For Twig SDC it checks `twig-sdc/` and then the
legacy `sdc/` alias under the same rule. The fallback is resolved per artifact,
so partial legacy override sets continue working. If neither path contains the
artifact, the built-in template is used.

Canonical override files use namespaced tokens so ordinary Twig variables are
not rewritten by the CLI:

- `__EMULSIFY_filename__`
- `__EMULSIFY_className__`
- `__EMULSIFY_camelName__`
- `__EMULSIFY_pascalName__`
- `__EMULSIFY_snakeName__`
- `__EMULSIFY_humanName__`
- `__EMULSIFY_directory__`
- `__EMULSIFY_directoryTitle__`
- `__EMULSIFY_type__`
- `__EMULSIFY_tagName__`
- `__EMULSIFY_format__`
- `__EMULSIFY_formatLabel__`

`__EMULSIFY_type__` contains the canonical type.
`__EMULSIFY_tagName__` contains the validated Web Component tag and is empty
for the other types. For compatibility, `__EMULSIFY_format__` remains
`default` for Twig and `sdc` for Twig SDC; it contains `react` or
`web-component` for the new types. The legacy `default/` and `sdc/` aliases
continue to render the seven double-brace tokens supported in v2.3.

If an override is unavailable, the built-in template is used. If an override
exists but is empty, it is ignored and a warning is logged. Unknown tokens are
left unchanged and logged as warnings. Partial override sets are supported.

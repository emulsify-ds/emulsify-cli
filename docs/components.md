# Components

Component commands use the system and variant recorded in `project.emulsify.json`. Run them from the project root or any child directory inside an initialized Emulsify project.

## List Available Components

```bash
emulsify component list
emulsify component ls
```

The command loads the configured system, finds the selected variant, and prints each component as:

```text
<structure> -> <component-name>
```

Example:

```text
base -> 01-colors
atoms -> buttons
molecules -> card
```

## Install One Component

```bash
emulsify component install card
emulsify component i card
```

The command installs the named component from the cached system into the project-relative directory defined by the selected variant structure.

In an interactive terminal, you can omit the name:

```bash
emulsify component install
```

The CLI presents the components actually available in the installed system
variant, along with an explicit choice to install all available components.

If the component declares dependencies, those dependencies are installed too.

```json
{
  "name": "card",
  "structure": "molecules",
  "dependency": ["images", "text", "links", "buttons"]
}
```

Installing `card` also installs its dependencies.

## Overwrite Behavior

If the destination exists, `component install` prompts before replacing it.

```bash
emulsify component install card
```

Use `--force` to replace without prompting:

```bash
emulsify component install card --force
```

Use `--all` to install every component from the selected variant. This mode force-installs all component destinations.

```bash
emulsify component install --all
```

## Non-Interactive Installation

Prompts only run when standard input is a TTY. In CI, scripts, and commands with
piped or redirected input, provide either a component name or `--all`; otherwise
the command exits with an actionable error instead of waiting for input.

If a named component destination already exists, the non-interactive command
exits unless `--force` is passed to replace it without an overwrite prompt:

```bash
emulsify component install card --force
```

## Dry Runs

Use `--dry-run` to preview component installation without copying, removing, or overwriting files.

```bash
emulsify component install card --dry-run
emulsify component install --all --dry-run
```

Dry-run output includes:

| Output             | Meaning                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| Dependencies       | Components that will be installed because the target component depends on them. |
| Destination        | Project path where each component would be copied.                              |
| Destination exists | Whether the destination currently exists.                                       |
| Real run would     | Whether the real command would copy, replace, or prompt.                        |

## Create A Local Component

`component create` generates a new component from built-in templates or project-level template overrides.

In an interactive terminal, run it without a name to start the complete wizard:

```bash
emulsify component create
```

The CLI prompts for a component name first. Invalid names are explained and
prompted again, after which the CLI prompts for any missing format and directory
values.

```bash
emulsify component create promo-card --directory molecules --format default
emulsify component c teaser --directory molecules --format sdc
```

Component names may include letters, numbers, and single hyphens between words. The CLI derives reusable name forms from the input.

| Input           | Folder/File Prefix | CSS Class       | JavaScript Name | YAML Prefix     | Display Name    |
| --------------- | ------------------ | --------------- | --------------- | --------------- | --------------- |
| `featured-item` | `featured-item`    | `featured-item` | `featuredItem`  | `featured_item` | `Featured Item` |
| `featuredItem`  | `featured-item`    | `featured-item` | `featuredItem`  | `featured_item` | `Featured Item` |

The destination is:

```text
<project-root>/<structure.directory>/<component-filename>
```

For a Drupal variant structure named `base` with directory `components/00-base`, this command:

```bash
emulsify component create featured-item --directory base --format default
```

Creates:

```text
components/00-base/featured-item
```

## Generated Formats

Default components generate:

```text
<filename>.twig
<filename>.scss
<filename>.yml
<filename>.stories.js
```

SDC components generate:

```text
<filename>.twig
<filename>.scss
<filename>.component.yml
<filename>.js
<filename>.stories.js
```

## Create Dry Runs

Use `--dry-run` to preview component creation without writing files.

```bash
emulsify component create featured-item --directory base --format default --dry-run
emulsify component create featured-item --directory base --format sdc --dry-run
```

Dry-run output includes the selected format, structure path, parent directory, final destination, whether the destination exists, and generated file paths.

## Non-Interactive Creation

Prompts only run when standard input is a TTY. In CI, scripts, and commands with
piped or redirected input, provide the positional component name plus both
`--format` and `--directory`; otherwise the command exits with an actionable
error instead of waiting for input:

```bash
emulsify component create featured-item --directory base --format default
```

Use `--yes` when the command should replace an existing generated component without asking:

```bash
emulsify component create featured-item --directory base --format default --yes
```

## Template Overrides

Projects can override the generated files with `.cli/templates/<format>/...` files. See [Component Template Overrides](./component-template-overrides.md).

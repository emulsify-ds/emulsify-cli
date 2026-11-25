# Components

Component commands use the system and variant recorded in `project.emulsify.json`. Run them from the project root or any child directory inside an initialized Emulsify project.

## List Available Components

```bash
emulsify component list
emulsify component ls
```

The command loads the selected variant and groups components by structure.
Notes show required components and any component or npm dependencies.

```text
components  ·  3 components  ·  1 required
  button        required
  slider        npm swiper
  slider-story  needs slider
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

Use `--dry-run` to preview component and npm package installation without
making project changes.

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
| npm packages       | Packages that would be added, are already satisfied, or need attention.         |

## npm packages

A system can declare [npm packages for each component](./systems.md#system-repository-shape).
When you install a component, the CLI checks the packages declared by that
component and its component dependencies, including any component files you
choose to keep. An all-components install checks the entire variant.
`system install` checks the components included in the selected scope.

The CLI reports each package and the components that need it.

| Status                  | What it means                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Added                   | The CLI added the missing package to `dependencies` in the project's `package.json`.                                                |
| Already in package.json | An existing spec in `dependencies`, `devDependencies`, `optionalDependencies`, or `peerDependencies` fits the required range.       |
| Needs attention         | An existing spec falls outside the requirement, or the CLI cannot verify it. The CLI keeps the spec and prints a suggested command. |

For npm projects, the CLI runs `npm install` once when it adds packages. For
pnpm, Yarn, and Bun projects, it records the dependencies and prints the
matching install command for you to run. When the project has no
`packageManager` field, the CLI checks its lockfiles and defaults to npm
if it finds none.

A component that needs npm packages requires a valid `package.json` in the
project root. If `npm install` fails, the copied components and new dependency
entries stay in place. Run `npm install` in the project root to finish.

`--skip-npm` on either install command copies the components while reporting
their npm packages and printing a command you can run later. On
`component install`, `--dry-run` previews the package statuses and any missing
or invalid `package.json` alongside the planned component copies.

```bash
emulsify component install slider --dry-run
emulsify component install slider --skip-npm
```

npm can run the declared packages' lifecycle scripts. Use `--dry-run` or
`--skip-npm` to review the packages first.

## Create A Local Component

`component create` generates a new component from built-in templates or project-level template overrides.

In an interactive terminal, run it without a name to start the complete wizard:

```bash
emulsify component create
```

The CLI prompts for a component name first. Invalid names are explained and
prompted again, after which the CLI prompts for any missing type and directory
values.

The type choices adapt to the current project. Twig is always available.
`twig-sdc` appears only when `project.platform` is `drupal`, because Single
Directory Components are a Drupal feature. React and Web Component choices
appear when the project's `package.json` declares `@emulsify/core`, which
indicates that Core's Storybook workspace is available. The wizard explains why
it omitted choices, and it skips the type prompt entirely when Twig is the only
suitable option.

This filtering applies only to the wizard. An explicit `--type` is always
honored. If React or Web Component is requested without a detected Core
dependency, the CLI warns and generates the component so monorepos and unusual
install layouts are not blocked.

```bash
emulsify component create promo-card --directory molecules --type twig
emulsify component c teaser --directory molecules --type twig-sdc
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
emulsify component create featured-item --directory base --type twig
```

Creates:

```text
components/00-base/featured-item
```

## Generated Component Types

Choose a type based on how the component should render and, for Drupal SDC,
how it should be packaged:

| Type            | Use It For                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `twig`          | A standard Twig component that can be used across Emulsify platforms.                                |
| `twig-sdc`      | A Twig component packaged as a Drupal Single Directory Component.                                    |
| `react`         | A React component rendered with Storybook's standard React support.                                  |
| `web-component` | A browser-native custom element whose story uses Emulsify Core's `renderWebComponent` Storybook API. |

Twig components generate:

```text
<filename>.twig
<filename>.scss
<filename>.yml
<filename>.stories.js
```

Twig SDC components generate:

```text
<filename>.twig
<filename>.scss
<filename>.component.yml
<filename>.js
<filename>.stories.js
```

React components generate:

```text
<filename>.jsx
<filename>.scss
<filename>.stories.jsx
```

Web Components generate:

```text
<filename>.js
<filename>.scss
<filename>.stories.js
```

React and Web Component scaffolds do not generate Twig files.

### Web Component Tag Names

Custom element tag names must contain a hyphen. For a component whose derived
filename already contains one, that filename becomes the tag name. For example,
`featured-item` generates `<featured-item>`.

For a single-word component, the CLI prefixes the filename with the project's
machine name. In a project whose machine name is `acme-theme`, `card` generates
`<acme-theme-card>`. The interactive wizard confirms the derived tag name and
lets you override it. Pass `--tag-name <tag-name>` to set the tag explicitly:

```bash
emulsify component create card --directory base --type web-component --tag-name acme-card
```

In non-interactive mode, the CLI otherwise derives the value silently and
validates it before writing files. Use `--tag-name` when a project machine name
cannot produce a valid derived tag. Explicit and derived tags follow the same
browser-compatible validation rules, and `--tag-name` is rejected for types
other than `web-component`.

## Create Dry Runs

Use `--dry-run` to preview component creation without writing files.

```bash
emulsify component create featured-item --directory base --type twig --dry-run
emulsify component create featured-item --directory base --type twig-sdc --dry-run
```

Dry-run output includes the selected type, structure path, parent directory,
final destination, whether the destination exists, and generated file paths.

## Non-Interactive Creation

Prompts only run when standard input is a TTY. In CI, scripts, and commands with
piped or redirected input, provide the positional component name plus both
`--type` and `--directory`; otherwise the command exits with an actionable
error instead of waiting for input:

```bash
emulsify component create featured-item --directory base --type twig
```

For compatibility with existing scripts, deprecated `--format default` maps to
`--type twig` and `--format sdc` maps to `--type twig-sdc`. Both legacy forms
print a deprecation warning.

Use `--force` when the command should replace an existing generated component
without asking. The existing `-y, --yes` form remains available as a
compatibility alias.

```bash
emulsify component create featured-item --directory base --type twig --force
```

## Template Overrides

Start a project override from the CLI's actual built-in templates:

```bash
emulsify component eject-templates twig
```

In an interactive terminal, omit the type to select one or more types. In a
non-interactive environment, provide one of `twig`, `twig-sdc`, `react`, or
`web-component`, or pass `--all` to eject every type. Do not combine a type
with `--all`. The command protects existing customizations unless `--force` is
passed, and `--dry-run` previews every destination without writing files.

Edit the resulting `.cli/templates/<type>/...` files. Then use `component
create` normally. See
[Component Template Overrides](./component-template-overrides.md) for template
resolution rules and supported tokens.

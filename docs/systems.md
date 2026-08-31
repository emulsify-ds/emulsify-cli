# Systems

An Emulsify system is a repository of reusable components, global assets, structure definitions, and platform variants. A project must install one system before `component list`, `component install`, or `component create` can load variant-aware component information.

## List Systems

```bash
emulsify system list
emulsify system ls
```

Built-in systems in this CLI version:

| Name              | Repository                                           |
| ----------------- | ---------------------------------------------------- |
| `compound`        | `https://github.com/emulsify-ds/compound.git`        |
| `emulsify-ui-kit` | `https://github.com/emulsify-ds/emulsify-ui-kit.git` |

The list is currently hard-coded in the CLI. Future versions may resolve systems from a registry. Installation still depends on the variants defined by the selected system's `system.emulsify.json`.

## Install A System

Run `system install` from inside an Emulsify project.

```bash
emulsify system install
```

With no name or repository options in an interactive terminal, the CLI opens a
guided installer. Its source picker includes the two built-in systems, a custom
source, and a safe exit:

```text
Which system?
❯ Compound              Accessible, tested components. Drupal, WordPress, plain.
  Emulsify UI Kit       Broader design-system starter kit.
  Bring your own        Install from a git repository you control.
  ────────────
  Cancel
```

The built-in path has four decisions:

1. **System/source.** Choose Compound, Emulsify UI Kit, or another repository.
2. **Component set.** Choose a system variant. The CLI displays a plain-language
   label and the raw platform expression, puts compatible choices first, and
   marks the best match for the current project as `Recommended`. Component and
   essential counts appear on every choice.
3. **Installation scope.** Choose `Essentials only` to install components marked
   `required: true`, or `Everything` to install every component. Both choices
   show how many components they install.
4. **Review.** Check the system and checkout, repository source, component set,
   selected scope, component and asset counts, and their concrete destination
   paths before confirming.

The repository is downloaded and its configuration validated before the
component-set and review screens can be built. This may populate the isolated
Emulsify cache, but the CLI does not update `project.emulsify.json`, copy project
files, or run the project install hook until the final review is confirmed.

The final screen makes those project changes concrete before asking for
confirmation:

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

Use `-y, --yes` to render and accept that final review without opening the
confirmation prompt. It supplies no earlier answer: source, component set, and
scope choices are still required, so the guided installer still needs a TTY.

Choosing `Cancel` at the source picker, or declining the final review, exits
without changing project configuration or destinations:

```text
System install cancelled.
```

Choosing `Bring your own` inserts two additional steps for the repository URL or
local path and the checkout (branch, tag, or commit). The wizard's displayed
step total expands for this path rather than continuing to say four steps.

For a built-in system, the command:

1. Finds and validates the nearest `project.emulsify.json`.
2. Resolves the named system repository.
3. Checks out the latest Git tag when the built-in system reference does not specify a checkout.
4. Clones the system into the local Emulsify cache.
5. Reads and validates `system.emulsify.json` from the cached system.
6. Selects the reviewed component set in guided mode, or resolves the best compatible variant for `project.platform` in direct mode. `--variant` selects an exact expression in direct mode.
7. Selects essential or all components.
8. Presents and confirms the review in guided mode.
9. Writes `system` and `variant` entries into `project.emulsify.json`.
10. Installs the selected components and variant-level general files and directories.

If you already know the system name, pass it directly:

```bash
emulsify system install compound
emulsify system install emulsify-ui-kit
```

An explicit built-in name bypasses the wizard. This is the form to use in a
script or CI job. It selects the best compatible component set automatically and
installs only essential components unless flags override those choices.

Use `--all` to install every component in the selected variant during system installation:

```bash
emulsify system install compound --all
```

## Install A Custom System

Choose `Bring your own` in the guided installer to be prompted for the
repository and checkout, or use `--repository` and `--checkout` together for a
direct install.

```bash
emulsify system install \
  --repository https://github.com/example/example-system.git \
  --checkout v1.0.0 \
  --variant wordpress
```

Remote custom-system URLs must end in `.git`, because the CLI parses the system name from the repository filename. You can also pass an ordinary relative or absolute path to a local Git repository without a `.git` suffix:

```bash
emulsify system install \
  --repository /absolute/path/to/example-system \
  --checkout v1.0.0
```

Omit `--variant` to use automatic platform compatibility selection. Pass it to select an exact variant platform expression; quote shared expressions such as `--variant "drupal || wordpress"`.

Prefer tags or commit hashes for `--checkout` so subsequent installs use the same system version.

## Non-Interactive Installation

Every prompt is gated behind an interactive TTY. Bare `system install` fails
immediately in CI, when piped, or when standard input is redirected, with this
actionable message:

```text
No component system source was provided. Pass a built-in system name as the positional argument, or pass both --repository <repository> and --checkout <branch, tag, or commit>.
```

Use a positional built-in name or provide both custom source flags:

```bash
emulsify system install compound
emulsify system install compound --variant drupal --all
emulsify system install \
  --repository https://github.com/example/example-system.git \
  --checkout v1.0.0 \
  --variant wordpress
```

Providing `--repository` without `--checkout`, or `--checkout` without
`--repository`, exits non-zero and identifies the missing flag. Explicit source
commands do not open the guided review: compatible component-set selection and
the essentials-only default remain deterministic unless `--variant` or `--all`
is passed. Because `--yes` only accepts the final guided review, it does not
supply a missing source or make bare `system install --yes` valid outside a TTY.

## Detach A System

Detach a system when components installed from it have been refined into the
basis of a new system:

```bash
emulsify system detach
```

The command removes only the top-level `system` and `variant` entries from the
nearest `project.emulsify.json`. It does not edit or remove components, project
assets, generated files, or any other configuration. The cached system clone is
also retained, making it quick to install the same system again. Use
`emulsify cache clear` separately when every cached repository should be
removed.

Interactive terminals ask for confirmation before writing. Declining leaves the
project unchanged. In CI, scripts, and terminals without an interactive input,
pass `--yes`; without it, the command fails immediately and names the required
flag:

```bash
emulsify system detach --yes
```

The command reports the detached system by name and confirms that project
components remain in place. With the system and variant references gone,
`emulsify system install` can configure a system again.

For the refine-then-publish workflow:

1. Install a system and refine its copied components in the project.
2. Run `emulsify system detach`; the refined files remain byte-for-byte intact.
3. Run `emulsify system create` to scaffold a new system repository.
4. Move or copy the preserved components into the scaffold, replace the example
   component, and update the variant mappings and component definitions in
   `system.emulsify.json`.
5. Commit, tag, and install the new repository in another project.

`system create` creates a fresh scaffold and does not import components from the
detached project automatically.

## Author A Standalone System

`system create` generates a complete, distributable system repository. It is a standalone command: run it inside or outside an Emulsify project, and it will not read or update `project.emulsify.json`.

```bash
emulsify system create [name]
```

In an interactive terminal, omit values to walk through prompts for the system name, target parent directory, platform targets, and Git initialization. Names are normalized to lowercase, hyphenated machine names. The `--directory` option is a parent directory, so this command creates `./systems/my-system`:

```bash
emulsify system create "My System" \
  --directory ./systems \
  --platform "drupal || wordpress" \
  --git
```

Use `--homepage` and `--repository` to write real project metadata at creation time:

```bash
emulsify system create my-system \
  --directory ./systems \
  --platform drupal \
  --git \
  --homepage https://design.example.org/my-system \
  --repository https://github.com/acme/my-system.git
```

Without those overrides, the metadata defaults to `https://TODO.invalid/<name>` and `https://TODO.invalid/<name>.git`. The reserved, non-resolving host keeps the scaffold schema-valid while making the unfinished metadata obvious. Replace these placeholders before publishing. The generated `LICENSE` is also a placeholder; choose a license appropriate for the system before distribution.

Use `--no-git` instead of `--git` when another tool will initialize the repository. In non-interactive environments, supply the positional name, `--directory`, `--platform`, and either `--git` or `--no-git`, or use `--yes`. `--yes` supplies these defaults for anything omitted:

| Value              | Default         |
| ------------------ | --------------- |
| Name               | `custom-system` |
| Parent directory   | `./`            |
| Platform           | `none`          |
| Git initialization | Enabled         |

The command never merges into or overwrites an existing target. If the normalized target directory already exists, choose another name or parent directory.

Pass `--dry-run` to preview the normalized target, generated files, and Git
initialization without creating directories or files. An occupied target is
reported as a condition that a real run would refuse.

### Generated Repository Anatomy

The scaffold has a valid `system.emulsify.json`, repository guidance, and one real component that can be installed immediately:

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

When Git initialization is enabled, `.git/` is also created with `main` as the initial branch. The generated configuration follows this shape:

```json
{
  "name": "my-system",
  "homepage": "https://TODO.invalid/my-system",
  "repository": "https://TODO.invalid/my-system.git",
  "structure": [
    {
      "name": "components",
      "description": "Reusable components provided by this system"
    }
  ],
  "variants": [
    {
      "platform": "drupal || wordpress",
      "structureImplementations": [
        {
          "name": "components",
          "directory": "components"
        }
      ],
      "components": [
        {
          "name": "example-card",
          "structure": "components",
          "description": "Example card included with the generated system",
          "required": true
        }
      ]
    }
  ]
}
```

`structure` declares the system's logical component groups. Each variant's `structureImplementations` maps those groups to source directories in the repository. Here the `components` structure maps directly to `components`, so the `example-card` source resolves to `components/example-card`. Because the component is marked `required: true`, `system install` copies it without needing `--all`.

The example provides Twig, Sass, YAML data, and Storybook story files. Customize or replace it, then keep the component entries and on-disk directories in sync as the library grows.

### Choose Platform Targets

Use `none` for a platform-neutral system, a concrete target such as `drupal` or `wordpress`, or a compatibility expression for a shared implementation:

```bash
emulsify system create generic-system --directory ./systems --platform none --git
emulsify system create drupal-system --directory ./systems --platform drupal --git
emulsify system create shared-system --directory ./systems --platform "drupal || wordpress" --git
emulsify system create preview-system --directory ./systems --platform none --git --dry-run
```

Quote expressions containing `||` so the shell passes the whole value to the CLI. The generated variant stores the normalized expression in `system.emulsify.json`; installation uses it when selecting a variant for the project's concrete platform.

### Test A Scaffold Locally

Commit and tag the generated repository before installing it. Local installs accept an ordinary filesystem path, so this workflow does not require a remote host:

```bash
emulsify system create my-system \
  --directory /tmp/emulsify-systems \
  --platform none \
  --git
cd /tmp/emulsify-systems/my-system
git add .
git commit -m "feat: create component system"
git tag v0.1.0

cd /path/to/emulsify-project
emulsify system install \
  --repository /tmp/emulsify-systems/my-system \
  --checkout v0.1.0
emulsify component list
```

Installing the scaffold records the system and selected variant in `project.emulsify.json` and installs its required `example-card` under the mapped `components` directory. This local round trip is a useful validation before publishing.

### Publish And Install A Release

Before publishing, replace the placeholder homepage, repository, license, and example content if you did not supply final values during creation. Commit the finished repository, create a stable tag, and push both to your Git host:

```bash
git remote add origin https://github.com/acme/my-system.git
git add .
git commit -m "feat: publish initial system"
git tag v1.0.0
git push -u origin HEAD
git push origin v1.0.0
```

Consumers can install the tagged release from an Emulsify project. Remote custom repository URLs must end in `.git`:

```bash
emulsify system install \
  --repository https://github.com/acme/my-system.git \
  --checkout v1.0.0
```

Use immutable tags or commit hashes for published integrations. Create a new tag for later releases so consumers can choose when to upgrade.

## Project Config After Install

After a successful install, `project.emulsify.json` includes system and variant data:

```json
{
  "project": {
    "platform": "drupal",
    "name": "My Theme",
    "machineName": "my_theme"
  },
  "starter": {
    "repository": "https://github.com/emulsify-ds/emulsify-drupal-starter"
  },
  "system": {
    "repository": "https://github.com/emulsify-ds/compound.git",
    "checkout": "v1.0.0"
  },
  "variant": {
    "platform": "drupal",
    "structureImplementations": [
      {
        "name": "base",
        "directory": "components/00-base"
      }
    ]
  }
}
```

The exact checkout, selected variant `platform` string, and structure mappings come from the installed system. If the selected system variant used `"platform": "drupal || wordpress"`, that original expression is stored in the project `variant.platform` value so later component commands can rehydrate the same variant.

## System Repository Shape

A system repository must contain `system.emulsify.json` at its root. The schema requires:

| Field        | Required | Purpose                                                                |
| ------------ | -------- | ---------------------------------------------------------------------- |
| `name`       | Yes      | System machine name.                                                   |
| `homepage`   | Yes      | Documentation, styleguide, or example URL.                             |
| `repository` | Yes      | System repository URL.                                                 |
| `structure`  | Yes      | Named structural groups, such as `base` or `molecules`.                |
| `variants`   | No       | Platform-specific implementations, components, files, and directories. |

Each variant used by the CLI must include:

| Field                      | Required | Purpose                                                       |
| -------------------------- | -------- | ------------------------------------------------------------- |
| `platform`                 | Yes      | Variant platform compatibility expression.                    |
| `structureImplementations` | Yes      | Mapping from structure names to project-relative directories. |
| `components`               | Yes      | Installable component definitions.                            |
| `directories`              | No       | General directories copied during system install.             |
| `files`                    | No       | General files copied during system install.                   |

## Variant Platform Compatibility

System variants can target one platform or multiple compatible platforms:

```json
{ "platform": "wordpress" }
{ "platform": "drupal || wordpress" }
{ "platform": "none" }
```

Supported platform tokens are `drupal`, `wordpress`, and `none`.

When commands read an installed system, variants with platform expressions the current CLI does not recognize are skipped. The CLI emits one warning listing every skipped expression and continues when a usable variant remains; if none remains, the error lists the expressions so you can distinguish a typo from a system that may require a newer CLI. System installation remains strict and rejects unsupported platform expressions.

`none` on a variant means generic. A variant with `"platform": "none"` can be installed by any concrete project platform.

Project configuration is different: `project.platform` is always a concrete value (`drupal`, `wordpress`, or `none`). Do not put `||` expressions in `project.platform`; only system variants use compatibility expressions.

When installing a system, the CLI prefers:

1. An exact platform match.
2. An expression containing the concrete project platform, such as `drupal || wordpress`.
3. A generic `none` variant.

A project with `project.platform: "none"` can install any component library system. If more than one variant is equally compatible and no single best match is obvious, the CLI prompts in an interactive terminal or fails with a clear non-interactive error.

Minimal example:

```json
{
  "name": "example-system",
  "homepage": "https://example.com/example-system",
  "repository": "https://github.com/example/example-system.git",
  "structure": [
    {
      "name": "base",
      "description": "Base components"
    }
  ],
  "variants": [
    {
      "platform": "drupal || wordpress",
      "structureImplementations": [
        {
          "name": "base",
          "directory": "components/00-base"
        }
      ],
      "components": [
        {
          "name": "button",
          "structure": "base",
          "required": true
        }
      ]
    }
  ]
}
```

The component folder in the system repository must match the variant structure and component name. For the example above, the cached source path is `components/00-base/button`.

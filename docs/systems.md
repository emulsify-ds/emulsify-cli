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

In an interactive terminal, the CLI prompts for a system:

```text
? Choose a component system:
❯ compound
  emulsify-ui-kit
  cancel
```

Choosing `compound` or `emulsify-ui-kit` installs that built-in system. Choosing `cancel` exits without changing files:

```text
System install cancelled.
```

For a built-in system, the command:

1. Finds and validates the nearest `project.emulsify.json`.
2. Resolves the named system repository.
3. Checks out the latest Git tag when the built-in system reference does not specify a checkout.
4. Clones the system into the local Emulsify cache.
5. Reads and validates `system.emulsify.json` from the cached system.
6. Selects the best compatible variant for `project.platform`, or the exact expression passed with `--variant`.
7. Writes `system` and `variant` entries into `project.emulsify.json`.
8. Installs components marked `required: true`.
9. Installs variant-level general files and directories.

If you already know the system name, pass it directly:

```bash
emulsify system install compound
emulsify system install emulsify-ui-kit
```

Use `--all` to install every component in the selected variant during system installation:

```bash
emulsify system install compound --all
```

## Install A Custom System

Use `--repository` and `--checkout` together.

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

Without those overrides, the metadata defaults to `https://example.com/<name>` and `https://github.com/example/<name>.git`. Replace these placeholders before publishing. The generated `LICENSE` is also a placeholder; choose a license appropriate for the system before distribution.

Use `--no-git` instead of `--git` when another tool will initialize the repository. In non-interactive environments, supply the positional name, `--directory`, `--platform`, and either `--git` or `--no-git`, or use `--yes`. `--yes` supplies these defaults for anything omitted:

| Value              | Default         |
| ------------------ | --------------- |
| Name               | `custom-system` |
| Parent directory   | `./`            |
| Platform           | `none`          |
| Git initialization | Enabled         |

The command never merges into or overwrites an existing target. If the normalized target directory already exists, choose another name or parent directory.

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
  "homepage": "https://example.com/my-system",
  "repository": "https://github.com/example/my-system.git",
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

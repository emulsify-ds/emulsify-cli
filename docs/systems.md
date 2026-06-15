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

## Install A Built-In System

Run `system install` from inside an Emulsify project.

```bash
emulsify system install compound
```

The command:

1. Finds and validates the nearest `project.emulsify.json`.
2. Resolves the named system repository.
3. Checks out the latest Git tag when the built-in system reference does not specify a checkout.
4. Clones the system into the local Emulsify cache.
5. Reads and validates `system.emulsify.json` from the cached system.
6. Selects the variant that matches `project.platform`.
7. Writes `system` and `variant` entries into `project.emulsify.json`.
8. Installs components marked `required: true`.
9. Installs variant-level general files and directories.

Use `--all` to install every component in the selected variant during system installation:

```bash
emulsify system install compound --all
```

## Install A Custom System

Use `--repository` and `--checkout` together.

```bash
emulsify system install \
  --repository https://github.com/example/example-system.git \
  --checkout v1.0.0
```

Custom system repository URLs must end in `.git`, because the CLI parses the system name from the repository filename.

Prefer tags or commit hashes for `--checkout` so subsequent installs use the same system version.

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

The exact checkout and structure mappings come from the installed system.

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

| Field                      | Required | Purpose                                                                 |
| -------------------------- | -------- | ----------------------------------------------------------------------- |
| `platform`                 | Yes      | Variant platform. Built-in schemas currently allow `none` and `drupal`. |
| `structureImplementations` | Yes      | Mapping from structure names to project-relative directories.           |
| `components`               | Yes      | Installable component definitions.                                      |
| `directories`              | No       | General directories copied during system install.                       |
| `files`                    | No       | General files copied during system install.                             |

To be installable, a system must include a variant whose `platform` matches the current project's `project.platform`.

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
      "platform": "drupal",
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

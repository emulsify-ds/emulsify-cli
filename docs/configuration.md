# Project Configuration

Emulsify CLI stores project state in `project.emulsify.json`. Commands search for this file from the current working directory upward, so CLI commands can be run from the project root or a child directory.

## Required Initial Configuration

`emulsify init` writes the required project and starter sections.

```json
{
  "project": {
    "platform": "drupal",
    "name": "My Theme",
    "machineName": "my_theme"
  },
  "starter": {
    "repository": "https://github.com/emulsify-ds/emulsify-drupal-starter"
  }
}
```

| Field                 | Required | Description                                                                                 |
| --------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `project.platform`    | Yes      | Concrete platform name for starter and variant selection: `drupal`, `wordpress`, or `none`. |
| `project.name`        | Yes      | Human-facing project name provided during init.                                             |
| `project.machineName` | Yes      | Machine-friendly folder/config name.                                                        |
| `starter.repository`  | Yes      | Starter repository used to create the project.                                              |

`project.platform` never uses compatibility expressions. Values such as `drupal || wordpress` are valid only on system variant `platform` fields.

## System And Variant Configuration

`emulsify system install` adds system and variant sections.

```json
{
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

| Field                              | Required After System Install | Description                                                                                                                         |
| ---------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `system.repository`                | Yes                           | Git repository containing the selected system. Must be a URL ending in `.git` for commands that parse the system name.              |
| `system.checkout`                  | Yes                           | Commit, branch, or tag used for the cached system.                                                                                  |
| `variant.platform`                 | Yes                           | Selected system variant platform string. It may be concrete, such as `wordpress`, or an expression such as `drupal \|\| wordpress`. |
| `variant.structureImplementations` | Yes                           | Project-relative directories for each named system structure.                                                                       |

Component commands require both `system` and `variant` to be present.

Variant compatibility examples:

```json
{ "platform": "wordpress" }
{ "platform": "drupal || wordpress" }
{ "platform": "none" }
```

`variant.platform: "none"` is generic and can be selected by any concrete project platform. A project with `project.platform: "none"` can install any compatible component library system; if multiple variants are equally compatible, the CLI prompts in an interactive terminal or errors in non-interactive mode.

## Structure Implementations

Structure implementations tell the CLI where installed or generated components belong.

```json
{
  "name": "base",
  "directory": "components/00-base"
}
```

For an installable system component:

```json
{
  "name": "promo",
  "structure": "base"
}
```

The destination is:

```text
<project-root>/components/00-base/promo
```

For `component create`, the `--directory` option takes the structure implementation name, not the filesystem path:

```bash
emulsify component create promo --directory base --format default
```

## Validation

The CLI validates project configuration with JSON Schema when loading `project.emulsify.json`. Invalid configuration causes commands to fail before installing or generating files.

Common validation issues:

| Issue                                                                           | Fix                                                                                             |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Unknown top-level properties                                                    | Remove properties that are not defined by the schema.                                           |
| Missing `project`, `project.platform`, `project.name`, or `project.machineName` | Re-run init or restore the required fields.                                                     |
| Missing `starter.repository`                                                    | Restore the starter repository field.                                                           |
| Component commands fail because `system` or `variant` is missing                | Run `emulsify system install <name>` from the project.                                          |
| Variant structure name does not match a component structure                     | Update the system variant so every component structure has a matching structure implementation. |

## Editing Configuration

Manual edits are safe when they preserve the schema and match the installed system. Be careful changing:

| Field                              | Risk                                                                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `system.checkout`                  | The local cache path depends on checkout. Changing it may cause the CLI to clone or load a different system version.                                       |
| `system.repository`                | Component commands parse the system name from this URL and expect a `.git` suffix.                                                                         |
| `variant.structureImplementations` | Install and create destinations are calculated from these directories.                                                                                     |
| `project.platform`                 | System install selects variants from this concrete value. Existing system and variant config may no longer match. Do not change it to a `\|\|` expression. |

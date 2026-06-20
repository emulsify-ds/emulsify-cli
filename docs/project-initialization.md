# Project Initialization

Use `emulsify init` to create a new Emulsify project from a starter repository.

```bash
emulsify init [name] [path]
```

The command clones a starter, writes `project.emulsify.json`, installs dependencies, runs the starter init hook when present, removes the starter `.git` directory, and prints next-step guidance.

## Platform And Starter Resolution

The CLI tries to determine the platform from the current working directory before prompting or using defaults.

| Detection                                                               | Result                                                                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Drupal Composer project with `extra.drupal-scaffold.locations.web-root` | Platform `drupal`, target parent `<web-root>/themes/custom`.                            |
| Existing Emulsify project found by `project.emulsify.json`              | Platform `none`, target parent `<project-root>/web/themes/custom`.                      |
| No detectable platform                                                  | Use `--platform`, prompt in an interactive terminal, or use `--yes` to accept defaults. |

When the platform cannot be detected and stdin is a TTY, the prompt choices are:

```text
? Platform:
❯ drupal
  none
```

Built-in starter repositories:

| Platform | Repository                                               | Checkout |
| -------- | -------------------------------------------------------- | -------- |
| `none`   | `https://github.com/emulsify-ds/emulsify-starter`        | `main`   |
| `drupal` | `https://github.com/emulsify-ds/emulsify-drupal-starter` | `main`   |

You can override starter resolution with `--starter` and `--checkout`.

## Interactive Output

Interactive init asks for missing values, then prints compact next steps.

```text
✔ Project name: britty
✔ Target directory: ./
✔ Platform: drupal
[====================] 100% initialization complete

Created an Emulsify project in britty.

Install the Drupal integration module:
  composer require drupal/emulsify_tools
  drush en emulsify_tools -y

Next, choose a component system:
  emulsify system install
```

For platform `none`, the Drupal integration module reminder is omitted:

```text
Next, choose a component system:
  emulsify system install
```

## Target Directory

The `[path]` argument is the parent directory. The CLI creates the project inside that parent using the machine name.

```bash
emulsify init "Marketing Site" ./projects --platform none
```

Creates:

```text
./projects/marketing-site
```

Drupal machine names use underscores:

```bash
emulsify init "My Theme" ./web/themes/custom --platform drupal
```

Creates:

```text
./web/themes/custom/my_theme
```

If the target already exists, initialization stops with an error and does not overwrite the directory.

## Machine Names

If `--machineName` is omitted, the CLI derives one from the project name by removing non-alphanumeric characters, replacing spaces, and lowercasing the result.

| Platform | Project Name     | Derived Machine Name |
| -------- | ---------------- | -------------------- |
| `none`   | `Marketing Site` | `marketing-site`     |
| `drupal` | `My Theme`       | `my_theme`           |

Use `--machineName` when the folder name or Drupal theme machine name must be exact.

```bash
emulsify init "My Theme" ./web/themes/custom --platform drupal --machineName custom_theme
```

## Non-Interactive Initialization

In non-TTY environments, the command does not prompt. Provide the needed values as arguments and flags.

```bash
emulsify init "Build Theme" ./web/themes/custom --platform drupal --yes
```

With `--yes`, missing values use the current defaults:

| Value         | Default         |
| ------------- | --------------- |
| Project name  | `emulsifyTheme` |
| Target parent | `./`            |
| Platform      | `drupal`        |

Explicit arguments and flags still take precedence over `--yes` defaults.

In non-interactive mode, provide `--platform drupal` or `--platform none` when auto-detection is unavailable.

## Custom Starter

Use a custom starter when the built-in starter list does not match the project.

```bash
emulsify init "Client Theme" ./web/themes/custom \
  --platform drupal \
  --starter https://github.com/example/client-starter \
  --checkout v1.2.0
```

If `--checkout` is omitted, the starter repository default branch is cloned.

## Generated Project Configuration

After a Drupal init, the generated `project.emulsify.json` looks like this:

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

Systems and variants are added later by `emulsify system install`.

## Starter Init Hook

If the cloned starter contains `.cli/init.js`, the CLI runs it with Node.js after dependencies install and before the starter `.git` directory is removed. The hook process runs with its working directory set to the hook file directory.

Starter hooks are useful for one-time project setup that belongs to the starter rather than the CLI.

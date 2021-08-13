# Emulsify CLI Usage

This project is a command line interface for working with Emulsify. It has a few primary responsibilities:

- Make initializing Emulsify projects very simple.
- Allow developers to select an Emulsify system (such as [Compound](https://github.com/emulsify-ds/compound)).
- Give developers the ability to pull in components from the system they're using, when/if they need them.

## Projects, Systems and Variants

You will see the terms "Projects", "Systems" and "Variants" used throughout this documentation, so it's important for you to understand what they mean.

- **Project**: an implementation of an Emulsify starter, such as [emulsify-drupal](https://github.com/emulsify-ds/emulsify-drupal).
- **System**: a design system that defines components, and assets. Emulsify projects opt into using systems using cli commands. Once a system has been selected for a project, the system will mandate how components are organized, install required components/assets, and give developers the ability to find and install non-required components.
- **Variant**: systems may have as many variants as they want. For example, a system might have a Drupal variant, a WordPress variant, and a React variant. The system is the same (imagine Material-UI is a system), but each variant may define different types of components, or have different organization patterns that are compatible with different platforms.

## Using the CLI

### Init

The cli exposes an init command that allows developers to easily create an Emulsify project.

When the init command is run, it will attempt to detect the platform you're using, and use that to choose a starter (such as [emulsify-drupal](https://github.com/emulsify-ds/emulsify-drupal). However, you can use the command options to specify any platform, starter, and starter version/branch/tag. If the cli cannot determine the platform you're using, it will instruct you to provide those details yourself.

```bash
emulsify init --help
Usage: emulsify init [options] <name> [path]

Initialize an Emulsify project

Arguments:
  name                                  Name of the Emulsify project you are initializing. This should be a proper name, such as "Carmen Sandiego".
  path                                  Path to the folder in which you would like to to create your Emulsify project. For example, "./themes" will
                                        result in the Emulsify project being placed in ./themes/{name}

Options:
  -m --machineName <machineName>        Machine-friendly name of the project you are initializing. If not provided, this will be automatically
                                        generated.
  -s --starter <repository>             Git repository of the Emulsify starter you would like to use, such as the Emulsify Drupal theme:
                                        https://github.com/emulsify-ds/emulsify-drupal.git
  -c --checkout <commit/branch/tag>     Commit, branch or tag of the base repository that should be checked out
  -p --platform <drupal/wordpress/etc>  Name of the platform Emulsify is being within. In some cases, Emulsify is able to automatically detect this. If
                                        it is not, Emulsify will prompt you to specify.
  -h, --help                            display help for command

```

Example usage:

```bash
cd ~/projects/my-drupal-codebase
emuslify init "Theme Name"

# If you are not relying on the cli to detect the platform, and use a starter:
emulsify init "Theme Name" ./web/themes/custom/theme-name --starter https://github.com/emulsify-ds/emulsify-drupal.git --checkout 2.x --platform drupal
```

## System

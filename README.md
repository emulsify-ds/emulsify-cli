[![Emulsify Design System](https://user-images.githubusercontent.com/409903/170579210-327abcdd-2c98-4922-87bb-36446a4cc013.svg)](https://www.emulsify.info/)
![npm](https://img.shields.io/npm/dm/@emulsify/cli?style=flat-square)

# Emulsify CLI

Command line interface for Emulsify projects.

## Installation

Emulsify CLI requires Node 24 or newer.

Install Emulsify CLI globally from [npm](https://www.npmjs.com/package/@emulsify/cli):

```bash
npm install -g @emulsify/cli
```

## Usage

Run `emulsify --help` for the current command list.

### Commands

| Command                             | Alias                         | Description                                                       |
| ----------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `emulsify init [name] [path]`       |                               | Initializes an Emulsify project from a starter.                   |
| `emulsify system list`              | `emulsify system ls`          | Lists built-in systems available for installation.                |
| `emulsify system install [name]`    |                               | Installs a system in the current Emulsify project.                |
| `emulsify component list`           | `emulsify component ls`       | Lists components available from the installed system and variant. |
| `emulsify component install [name]` | `emulsify component i [name]` | Installs one component from the installed system and variant.     |
| `emulsify component create [name]`  | `emulsify component c [name]` | Creates a local component in the current Emulsify project.        |

### Initialize A Project

`emulsify init [name] [path]` clones a starter, writes the project configuration, installs dependencies, runs the starter init hook when present, and removes the starter Git history.

Options:

- `--machineName <machineName>`: Sets the machine-friendly project name. When omitted, Emulsify CLI derives it from the project name.
- `--starter <repository>`: Uses a specific starter repository.
- `--checkout <commit/branch/tag>`: Checks out a specific starter commit, branch, or tag.
- `--platform <platform>`: Sets the project platform when auto-detection is unavailable or should be overridden. For Drupal projects, pass `drupal`.
- `--yes`: Accepts default init values for missing options without prompting.

Current starter repositories:

- `https://github.com/emulsify-ds/emulsify-starter`
- `https://github.com/emulsify-ds/emulsify-drupal-starter`

Examples:

```bash
emulsify init "My Project" ./projects
emulsify init "My Theme" ./web/themes/custom --platform drupal --yes
emulsify init "My Project" ./projects --starter https://github.com/emulsify-ds/emulsify-starter --checkout main
```

### Systems

`emulsify system list` lists the built-in systems that Emulsify CLI can install. `emulsify system ls` is the same command.

```bash
emulsify system list
emulsify system ls
```

`emulsify system install [name]` installs a system in the current Emulsify project. Use `compound` to install the built-in Compound system. The command installs required components by default.

Options:

- `--repository <repository>`: Installs a system from a specific Git repository.
- `--checkout <commit/branch/tag>`: Checks out a specific system commit, branch, or tag. This is required when `--repository` is used.
- `--all`: Installs all available components from the system instead of only required components.

Examples:

```bash
emulsify system install compound
emulsify system install compound --all
emulsify system install --repository https://github.com/example/example-system.git --checkout v1.0.0
```

### Components

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
emulsify component install button
emulsify component install card --dry-run
emulsify component i card --force
emulsify component install --all
```

`emulsify component create [name]` creates a local component in the current Emulsify project. `emulsify component c [name]` is the same command.

Options:

- `--directory <directory>`: Sets the variant structure directory where the component is created.
- `--format <format>`: Sets the component format. Supported values are `default` and `sdc`.
- `--yes`: Replaces an existing component without an overwrite confirmation prompt.
- `--dry-run`: Previews the destination and generated files without writing, removing, or creating files.

In non-interactive environments, pass both `--directory` and `--format`.

Examples:

```bash
emulsify component create card --directory base --format default
emulsify component create card --directory base --format default --dry-run
emulsify component create teaser --directory molecules --format sdc --yes
emulsify component create teaser --directory molecules --format sdc --dry-run
```

### Component Template Overrides

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

For each generated artifact, Emulsify CLI first checks for the matching override file. If the override is missing, the built-in template is used. If the override exists but is empty, the built-in template is used and a warning is logged. Unknown tokens are left unchanged and logged as warnings. Partial override sets are supported, so a project can override only `component.twig` and keep the built-in SCSS, data, and story templates. Extra arbitrary files are not generated by component template overrides.

For more documentation, see the [Emulsify CLI usage documentation](https://www.emulsify.info/docs/supporting-projects/emulsify-cli/emulsify-cli-usage).

## Development

Emulsify CLI is developed using TypeScript. You can find all of the source files in the `src` directory, which is organized in the following manner:

- `src/index.ts` - uses Commander to compose the CLI.
- `src/handlers` - contains all functions that handle CLI commands, such as `emulsify init`.
- `src/lib` - general definitions and logging tools.
- `src/schemas` - contains JSON-Schema files that describe project, system, and variant configuration. These schema files are used to generate TypeScript types.
- `src/scripts` - holds utility scripts for the project.
- `src/types` - type modules live here, auto-generated ones are prefixed with an underscore (`_`).
- `src/util` - contains utility functions that are used in handlers to do various things, such as caching systems and resolving component template overrides.

### Setup

- Install the version of Node specified in this project's `.nvmrc` file. If you are using nvm, run `nvm use`.
- Clone this repository into a directory of your choosing.
- In the directory, run `npm install`.
- Build the project: `npm run build`, or watch: `npm run watch`.
- To test the CLI, run: `npm link`.

### Scripts

- `npm run build`: builds the project based on the configuration in `tsconfig.dist.json`.
- `npm run build-schema-types`: Compiles the JSON Schema definitions within this project into TypeScript types.
- `npm run watch`: watches the codebase, and re-compiles every time a change is made.
- `npm run format`: uses prettier to format all ts files within the codebase.
- `npm run lint`: runs the Jest test suite via the `test` script.
- `npm run test`: runs Jest on the codebase. You can specify a path to a single test, and add any flags supported by Jest's CLI.
- `npm run type`: uses typescript to check all type signatures.
- `npm run twatch`: runs Jest without coverage, in verbose and watch mode. This is useful for running a single test during active development.
- `npm run semantic-release`: publishes a release using `release.config.cjs`.

## Deployment

This project is automatically built and deployed to npm via the release GitHub Actions workflow. Pushes to `main` run `npm run build` and then `npm run semantic-release`.

### Contributors

<table>
<tr>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/patrickocoffeyo>
            <img src=https://avatars.githubusercontent.com/u/1107871?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Patrick Coffey/>
            <br />
            <sub style="font-size:14px"><b>Patrick Coffey</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/ModulesUnraveled>
            <img src=https://avatars.githubusercontent.com/u/1663810?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Brian Lewis/>
            <br />
            <sub style="font-size:14px"><b>Brian Lewis</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/amazingrando>
            <img src=https://avatars.githubusercontent.com/u/409903?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Randy Oest/>
            <br />
            <sub style="font-size:14px"><b>Randy Oest</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/callinmullaney>
            <img src=https://avatars.githubusercontent.com/u/369018?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Callin Mullaney/>
            <br />
            <sub style="font-size:14px"><b>Callin Mullaney</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/JeffTomlinson>
            <img src=https://avatars.githubusercontent.com/u/2602202?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Jeff Tomlinson/>
            <br />
            <sub style="font-size:14px"><b>Jeff Tomlinson</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/mikeethedude>
            <img src=https://avatars.githubusercontent.com/u/15275301?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=mikeethedude/>
            <br />
            <sub style="font-size:14px"><b>mikeethedude</b></sub>
        </a>
    </td>
</tr>
<tr>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/robherba>
            <img src=https://avatars.githubusercontent.com/u/9342274?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Roberto Hernández Badilla/>
            <br />
            <sub style="font-size:14px"><b>Roberto Hernández Badilla</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/fertant>
            <img src=https://avatars.githubusercontent.com/u/3853492?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Andrii Shutov/>
            <br />
            <sub style="font-size:14px"><b>Andrii Shutov</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/nJim>
            <img src=https://avatars.githubusercontent.com/u/9594124?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Jim Vomero/>
            <br />
            <sub style="font-size:14px"><b>Jim Vomero</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/calebtr-metro>
            <img src=https://avatars.githubusercontent.com/u/43386533?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Caleb Tucker-Raymond/>
            <br />
            <sub style="font-size:14px"><b>Caleb Tucker-Raymond</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/karldivad>
            <img src=https://avatars.githubusercontent.com/u/13474855?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Carlos Valencia Rivero/>
            <br />
            <sub style="font-size:14px"><b>Carlos Valencia Rivero</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/iryston>
            <img src=https://avatars.githubusercontent.com/u/1258460?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Igor R. Plity/>
            <br />
            <sub style="font-size:14px"><b>Igor R. Plity</b></sub>
        </a>
    </td>
</tr>
<tr>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/ryanhagerty>
            <img src=https://avatars.githubusercontent.com/u/8405274?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Ryan Hagerty/>
            <br />
            <sub style="font-size:14px"><b>Ryan Hagerty</b></sub>
        </a>
    </td>
</tr>
</table>

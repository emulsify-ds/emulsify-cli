[![Emulsify Design System](https://user-images.githubusercontent.com/409903/170579210-327abcdd-2c98-4922-87bb-36446a4cc013.svg)](https://www.emulsify.info/)
![npm](https://img.shields.io/npm/dm/@emulsify/cli?style=flat-square)
# emulsify-cli

Command line interface for Emulsify.

## Installation

This project is deployed to [npm](https://www.npmjs.com/package/@emulsify/cli). In order to use this CLI, install it as a global dependency:

```bash
npm install -g @emulsify/cli
```

## Usage

For more information on how to use emulsify-cli, please see the [usage documentation](https://www.emulsify.info/docs/supporting-projects/emulsify-cli/emulsify-cli-usage).

## Development

Emulsify-cli is developed using TypeScript. You can find all of the source files in the `src` directory, which is organized in the following manner:

- `src/index.ts` - uses Commander to compose the CLI.
- `src/handlers` - contains all functions that handle CLI commands, such as `emulsify init`.
- `src/lib` - general definitions and logging tools.
- `src/schemas` - contains JSON-Schema files that describe project, system, and variant configuration. These schema files are used to generate TypeScript types.
- `src/scripts` - holds utility scripts for the project.
- `src/types` - type modules live here, auto-generated ones are prefixed with an underscore (`_`).
- `src/util` - contains utility functions that are used in handlers to do various things, such as caching systems.

### Setup

- Install the version of node as specified in this project's `.nvmrc` file. If you are using nvm, simply run `nvm use`.
- Clone this repository into a directory of your choosing.
- In the directory, run `npm install`.
- Build the project: `npm run build`, or watch: `npm run watch`.
- To test the CLI, run: `npm link`.

### Scripts

- `npm run build`: builds the project based on the configuration in `tsconfig.dist.json`.
- `npm run build-schema-types`: Compiles the json-schema definitions within this project into ts types.
- `npm run watch`: watches the codebase, and re-compiles every time a change is made.
- `npm run format`: uses prettier to format all ts files within the codebase.
- `npm run lint`: uses eslint to lint the codebase.
- `npm run test`: runs Jest on the codebase. You can specify a path to a single test, and add any flags supported by Jest's CLI.
- `npm run type`: uses typescript to check all type signatures.
- `npm run twatch`: runs Jest without coverage, in verbose and watch mode. This is useful for running a single test during active development.

## Deployment

This project is automatically built and deployed to NPM via a GitHub Actions workflow. In order to deploy changes merged into the `develop` branch, simply merge `develop` into `main`, and call it a day.

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
            <img src=https://avatars.githubusercontent.com/u/9342274?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Roberto Henández Badilla/>
            <br />
            <sub style="font-size:14px"><b>Roberto Henández Badilla</b></sub>
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

[![Emulsify Design System](https://user-images.githubusercontent.com/409903/170579210-327abcdd-2c98-4922-87bb-36446a4cc013.svg)](https://www.emulsify.info/)

# emulsify-cli

Command line interface for Emulsify.

## Installation

This project is deployed to [npm](https://www.npmjs.com/package/@emulsify/cli). In order to use this CLI, install it as a global dependency:

```bash
npm install -g @emulsify/cli
```

## Usage

For more information on how to use emulsify-cli, please see the [usage documentation](https://docs.emulsify.info/supporting-projects/emulsify-cli/emulsify-cli-usage).

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

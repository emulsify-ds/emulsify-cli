# emulsify-cli

Command line interface for Emulsify.

## Development

### Setup

- Install the version of node as specified in this project's `.nvmrc` file. If you are using nvm, simply run `nvm use`.
- Clone this repository into a directory of your choosing.
- In the directory, run `npm install`.

### Scripts

- `npm run build`: builds the project based on the configuration in `tsconfig.dist.json`.
- `npm run format`: uses prettier to format all ts files within the codebase.
- `npm run lint`: uses eslint to lint the codebase.
- `npm run test`: runs Jest on the codebase. You can specify a path to a single test, and add any flags supported by Jest's CLI.
- `npm run type`: uses typescript to check all type signatures.
- `npm run twatch`: runs Jest without coverage, in verbose and watch mode. This is useful for running a single test during active development.

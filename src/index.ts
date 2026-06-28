#!/usr/bin/env node
import { program } from 'commander';
import withProgressBar from './handlers/hofs/withProgressBar.js';
import init from './handlers/init.js';
import systemList from './handlers/systemList.js';
import systemInstall from './handlers/systemInstall.js';
import componentList from './handlers/componentList.js';
import componentInstall from './handlers/componentInstall.js';
import componentCreate from './handlers/componentCreate.js';
import CliError from './lib/CliError.js';
import log from './lib/log.js';
import { createRequire } from 'module';
import { cyan, green } from 'colorette';
import boxen from 'boxen';

const packageInfo = createRequire(import.meta.url)('../package.json');

function getRootHelp(): string {
  return [
    `${packageInfo.productName} ${packageInfo.version}`,
    '',
    'Create Emulsify projects, choose component systems, install components, and generate local components.',
    '',
    'Usage:',
    '  emulsify',
    '  emulsify --help',
    '  emulsify <command> --help',
    '  emulsify init [name] [path] [options]',
    '  emulsify system install [name] [options]',
    '  emulsify component <command> [options]',
    '',
    'Common workflow:',
    '  emulsify init',
    '  emulsify system install',
    '  emulsify component list',
    '  emulsify component install <name>',
    '  emulsify component create <name>',
    '',
    'Commands:',
    '  init [name] [path]',
    '    Create a project from a starter repository. Prompts for project name, target directory,',
    '    and platform when values are missing in an interactive terminal.',
    '    Options:',
    '      -m, --machineName <machineName>     Set the project folder/config machine name.',
    '      -s, --starter <repository>          Use a custom starter repository.',
    '      -c, --checkout <commit/branch/tag>  Checkout for the starter repository.',
    '      -p, --platform <none|drupal|wordpress>',
    '                                           Select the project platform when auto-detection is unavailable.',
    '                                           Built-in platforms: drupal, wordpress, none.',
    '      -y, --yes                           Accept defaults for missing init values without prompting.',
    '',
    '  system list',
    '    List built-in component systems available for installation. Alias: system ls.',
    '',
    '  system install [name]',
    '    Install a built-in or repository-backed component system. With no name or repository in',
    '    an interactive terminal, prompts for compound, emulsify-ui-kit, create a new system,',
    '    or cancel.',
    '    Options:',
    '      -r, --repository <repository>       Install from a custom system repository ending in .git.',
    '      -c, --checkout <commit/branch/tag>  Checkout to use with --repository.',
    '      -a, --all                           Install every component in the selected variant.',
    '',
    '  component list',
    '    List components available from the installed system and selected variant. Alias: component ls.',
    '',
    '  component install [name]',
    '    Install one component, dependencies, or all components from the installed system. Alias: component i.',
    '    Options:',
    '      -f, --force                         Replace an existing component destination.',
    '      -a, --all                           Install all available components.',
    '          --dry-run                       Preview installs without writing files.',
    '',
    '  component create [name]',
    '    Generate a new local component in this project. Alias: component c.',
    '    Options:',
    '      -d, --directory <directory>         Variant structure where the component should be created.',
    '      -f, --format <default|sdc>          Component format to generate.',
    '      -y, --yes                           Replace existing generated components without prompting.',
    '          --dry-run                       Preview generated files without writing them.',
    '',
    '  help [command]',
    '    Show help for a command.',
    '',
    'Global options:',
    '  -c, --checkout <commit/branch/tag>      Shared checkout option for commands that clone repositories.',
    '  -V, --version                           Show the installed CLI version.',
    '  -h, --help                              Show this help output.',
    '',
  ].join('\n');
}

// Main program commands.
program
  .name('emulsify')
  .enablePositionalOptions()
  .option(
    '-c --checkout <commit/branch/tag>',
    'Commit, branch or tag of the base repository that should be checked out',
  );

program
  .command('init [name] [path]')
  .description('Create a new Emulsify project from a starter repository')
  .option(
    '-m --machineName <machineName>',
    'Machine-friendly project folder and config name. If omitted, this is generated from the project name.',
  )
  .option('-s --starter <repository>', 'Starter Git repository to clone.')
  .option(
    '-c --checkout <commit/branch/tag>',
    'Starter commit, branch, or tag to check out after clone.',
  )
  .option(
    '-p --platform <none|drupal|wordpress>',
    'Project platform to use when auto-detection is unavailable or should be overridden.',
  )
  .option(
    '-y --yes',
    'Accept default init values for any missing options without prompting.',
  )
  .action(withProgressBar(init));

// System sub-commands.
const system = program
  .command('system')
  .description('List, install, or scaffold component systems');
system
  .command('list')
  .description('List built-in systems available for installation')
  .alias('ls')
  .action(systemList);
system
  .command('install [name]')
  .description(
    'Install a component system, prompt for a system, or scaffold a local system definition',
  )
  .option(
    '-r --repository <repository>',
    'Git repository containing the system to install. Custom repository URLs must end in .git.',
  )
  .option(
    '-c --checkout <commit/branch/tag>',
    'Commit, branch, or tag to check out. Required when --repository is used.',
  )
  .option(
    '-a --all',
    'Install every component in the selected variant. Without this flag, only required components are installed.',
  )
  .action(systemInstall);

// Component sub-commands.
const component = program
  .command('component')
  .description('List, install, or create components');
component
  .command('list')
  .description(
    'List components available from the installed system and variant',
  )
  .alias('ls')
  .action(componentList);
component
  .command('install [name]')
  .description('Install one component from the installed system and variant')
  .option('-f --force', 'Replace an existing component destination.')
  .option(
    '-a --all',
    'Install all available components instead of one named component.',
  )
  .option(
    '--dry-run',
    'Preview component installs without copying or removing files.',
  )
  .alias('i')
  .action(componentInstall);
component
  .command('create [name]')
  .option(
    '-d --directory <directory>',
    'Variant structure name where the component should be created.',
  )
  .option(
    '-f --format <format>',
    'Component format to generate. Supported values: default, sdc.',
  )
  .option(
    '-y --yes',
    'Skip overwrite confirmation prompts and replace existing components.',
  )
  .option(
    '--dry-run',
    'Preview generated component files without writing or removing files.',
  )
  .alias('c')
  .description('Generate a new local component in the current project')
  .action(componentCreate);

/*
 * Generate a styled version message using boxen and colorette.
 * This displays the product name and version in a visually appealing format.
 *
 *  ╭ Emulsify CLI ──────╮
 *  |                    │
 *  │   Version: 2.0.0   │
 *  │                    │
 *  ╰────────────────────╯
 */
const title = cyan(packageInfo.productName);
const message = `Version: ${green(packageInfo.version)}`;

const boxedMessage = boxen(message, {
  title: title,
  backgroundColor: 'black',
  borderStyle: 'round',
  borderColor: 'blue',
  padding: 1,
  margin: 1,
});

program.version(boxedMessage);
const rootHelpRequested =
  process.argv.length <= 2 ||
  (process.argv.length === 3 &&
    ['--help', '-h', 'help'].includes(process.argv[2]));

if (rootHelpRequested) {
  process.stdout.write(getRootHelp());
  process.exit(0);
}

try {
  await program.parseAsync(process.argv);
} catch (err) {
  // Expected CliError failures map their message and exitCode to the process;
  // unexpected failures still produce a message and a default non-zero exit.
  if (err instanceof CliError) {
    log('error', err.message);
    process.exitCode = err.exitCode;
  } else {
    const message = err instanceof Error ? err.message : String(err);
    log('error', message);
    process.exitCode = 1;
  }
}

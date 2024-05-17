#!/usr/bin/env node
import { program } from 'commander';
import withProgressBar from './handlers/hofs/withProgressBar';
import init from './handlers/init';
import systemList from './handlers/systemList';
import systemInstall from './handlers/systemInstall';
import componentList from './handlers/componentList';
import componentInstall from './handlers/componentInstall';

// Main program commands.
program
  .enablePositionalOptions()
  .option(
    '-c --checkout <commit/branch/tag>',
    'Commit, branch or tag of the base repository that should be checked out'
  );

program
  .command('init <name> [path]', {
    isDefault: true,
  })
  .description('Initialize an Emulsify project')
  .option(
    '-m --machineName <machineName>',
    'Machine-friendly name of the project you are initializing. If not provided, this will be automatically generated.'
  )
  .option(
    '-s --starter <repository>',
    'Git repository of the Emulsify starter you would like to use, such as the Emulsify Drupal theme: https://github.com/emulsify-ds/emulsify-drupal.git'
  )
  .option(
    '-c --checkout <commit/branch/tag>',
    'Commit, branch or tag of the base repository that should be checked out'
  )
  .option(
    '-p --platform <drupal/wordpress/etc>',
    'Name of the platform Emulsify is being within. In some cases, Emulsify is able to automatically detect this. If it is not, Emulsify will prompt you to specify.'
  )
  .action(withProgressBar(init));

// System sub-commands.
const system = program
  .command('system')
  .description(
    'Parent command that contains sub-commands pertaining to systems'
  );
system
  .command('list')
  .description(
    'Lists all of the available systems that Emulsify supports out-of-the-box'
  )
  .alias('ls')
  .action(systemList);
system
  .command('install [name]')
  .description(
    'Install a system within an Emulsify project. You must specify either the name of an out-of-the-box system (such as compound), or a link to a git repository containing the system you want to install'
  )
  .option(
    '-r --repository <repository>',
    'Git repository containing the system you would like to install'
  )
  .option(
    '-c --checkout <commit/branch/tag>',
    'Commit, branch or tag of the base repository that should be checked out. MUST be provided if you are passing along a repository (-r or --repository). Tags or commit hashes are strongly preferable, because you want to ensure that you are using the same version of the system every time you install components, etc'
  )
  .option(
    '-a --all',
    'Use this to install all available components within the specified system. Without this flag, only the required system components will be installed.'
  )
  .action(systemInstall);

// Component sub-commands.
const component = program.command(
  'component',
  'Parent command that contains sub-commands pertaining to components'
);
component
  .command('list')
  .description(
    'Lists all of the components that are available for installation within your project based on the system and variant you selected'
  )
  .alias('ls')
  .action(componentList);
component
  .command('install [name]')
  .description(
    "Install a component from within the current project's system and variant"
  )
  .option(
    '-f --force',
    'Use this to overwrite a component that is already installed'
  )
  .option(
    '-a --all',
    'Use this to install all available components, rather than specifying a single component to install'
  )
  .alias('i')
  .action(componentInstall);

// Because './package.json' is outside of our defined rootDir of ./src
// in tsconfig, we need to disable the next line.
// eslint-disable-next-line
program.version(require('./package.json').version);
void program.parseAsync(process.argv);

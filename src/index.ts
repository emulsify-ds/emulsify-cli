#!/usr/bin/env node
import { program } from 'commander';
import init from './handlers/init';
import systemList from './handlers/systemList';
import systemInstall from './handlers/systemInstall';
import componentList from './handlers/componentList';
import componentInstall from './handlers/componentInstall';

// Main program commands.
program
  .command('init <name> [path]')
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
  .description('Initialize an Emulsify project', {
    name:
      'Name of the Emulsify project you are initializing. This should be a proper name, such as "Carmen Sandiego".',
    path:
      'Path to the folder in which you would like to to create your Emulsify project. For example, "./themes" will result in the Emulsify project being placed in ./themes/{name}',
  })
  .action(init);

// System sub-commands.
const system = program
  .command('system')
  .description(
    'Parent command that contains sub-commands pertaining to systems'
  );
system
  .command('list')
  .alias('ls')
  .description(
    'Lists all of the available systems that Emulsify supports out-of-the-box'
  )
  .action(systemList);
system
  .command('install [name]')
  .option(
    '-r --repository <repository>',
    'Git repository containing the system you would like to install'
  )
  .option(
    '-c --checkout <commit/branch/tag>',
    'Commit, branch or tag of the base repository that should be checked out. MUST be provided if you are passing along a repository (-r or --repository). Tags or commit hashes are strongly preferable, because you want to ensure that you are using the same version of the system every time you install components, etc'
  )
  .description(
    'Install a system within an Emulsify project. You must specify either the name of an out-of-the-box system (such as compound), or a link to a git repository containing the system you want to install',
    {
      name: 'Name of the out-of-the-box system you would like to install',
    }
  )
  .action(systemInstall);

// Component sub-commands.
const component = program
  .command('component')
  .description(
    'Parent command that contains sub-commands pertaining to components'
  );
component
  .command('list')
  .alias('ls')
  .description(
    'Lists all of the components that are available for installation within your project based on the system and variant you selected'
  )
  .action(componentList);
component
  .command('install [name]')
  .option(
    '-f --force',
    'Use this to overwrite a component that is already installed'
  )
  .alias('i')
  .description(
    "Install a component from within the current project's system and variant"
  )
  .action(componentInstall);

void program.parseAsync(process.argv);

#!/usr/bin/env node
import { program } from 'commander';
import init from './handlers/init';
import systemList from './handlers/systemList';
import systemInstall from './handlers/systemInstall';

// Main program commands.
program
  .command('init <name> [path]')
  .option(
    '-s --starter <repository>',
    'Git repository of the Emulsify starter you would like to use, such as the Emulsify Drupal theme: https://github.com/emulsify-ds/emulsify-drupal.git'
  )
  .option(
    '-c --checkout <commit/branch/tag>',
    'Commit, branch or tag of the base repository that should be checked out'
  )
  .description('Initialize an Emulsify project', {
    name: 'Name of the Emulsify project you are initializing',
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
  .option(
    '-v --variant <name>',
    'Name of the variant you would like to use. If this is not provided, the Emulsify CLI will attempt to detect a variant based on the type project you are within'
  )
  .description(
    'Install a system within an Emulsify project. You must specify either the name of an out-of-the-box system (such as compound), or a link to a git repository containing the system you want to install',
    {
      name: 'Name of the out-of-the-box system you would like to install',
    }
  )
  .action(systemInstall);

void program.parseAsync(process.argv);

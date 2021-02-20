#!/usr/bin/env node
import { program } from 'commander';
import init from './handlers/init';

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

void program.parseAsync(process.argv);

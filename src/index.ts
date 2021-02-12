#!/usr/bin/env node
import { program } from 'commander';
import init from './handlers/init';

program
  .command('init <name> [path]')
  .description('Initialize an Emulsify project.', {
    name: 'Name of the Emulsify project you are initializing.',
    path:
      'Path to the folder in which you would like to to create your Emulsify project.',
  })
  .action(init);

program.parse();

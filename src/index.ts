#!/usr/bin/env node
import { program } from 'commander';
import withProgressBar from './handlers/hofs/withProgressBar.js';
import init from './handlers/init.js';
import systemList from './handlers/systemList.js';
import systemInstall from './handlers/systemInstall.js';
import systemCreate from './handlers/systemCreate.js';
import systemDetach from './handlers/systemDetach.js';
import componentList from './handlers/componentList.js';
import componentInstall from './handlers/componentInstall.js';
import componentCreate from './handlers/componentCreate.js';
import componentEjectTemplates from './handlers/componentEjectTemplates.js';
import audit from './handlers/audit.js';
import cacheClear from './handlers/cacheClear.js';
import CliError from './lib/CliError.js';
import log from './lib/log.js';
import getRootHelp from './lib/rootHelp.js';
import getTerminalColors, {
  terminalSupportsColor,
} from './lib/terminalColors.js';
import { isExitPromptError } from './util/prompt/index.js';
import { createRequire } from 'module';
import boxen from 'boxen';

const packageInfo = createRequire(import.meta.url)('../package.json');

// Main program commands.
program.name('emulsify').enablePositionalOptions();

program
  .command('init [name] [path]')
  .description('Create a new Emulsify project from a starter repository')
  .option(
    '-m, --machineName <machineName>',
    'Machine-friendly project folder and config name. If omitted, this is generated from the project name.',
  )
  .option('-s, --starter <repository>', 'Starter Git repository to clone.')
  .option(
    '-c, --checkout <commit/branch/tag>',
    'Starter commit, branch, or tag to check out after clone.',
  )
  .option(
    '-p, --platform <none|drupal|wordpress>',
    'Project platform to use when auto-detection is unavailable or should be overridden.',
  )
  .option(
    '-y, --yes',
    'Accept default init values for any missing options without prompting.',
  )
  .action(withProgressBar(init));

program
  .command('audit [args...]')
  .description('Run the project-installed Emulsify Core audit')
  .allowUnknownOption()
  .helpOption(false)
  .passThroughOptions()
  .action((args: string[]) => audit(args));

// System sub-commands.
const system = program
  .command('system')
  .description('List, create, install, or detach component systems');
system
  .command('list')
  .description('List built-in systems available for installation')
  .alias('ls')
  .action(systemList);
system
  .command('create [name]')
  .description('Scaffold a standalone component-system repository')
  .option(
    '-d, --directory <directory>',
    'Parent directory in which to create the new system repository.',
  )
  .option(
    '-p, --platform <platform-expression>',
    'Platform compatibility expression for the first variant.',
  )
  .option('--git', 'Initialize a Git repository on branch main.')
  .option('--no-git', 'Do not initialize a Git repository.')
  .option(
    '--homepage <url>',
    'Homepage URI; overrides the generated TODO.invalid placeholder.',
  )
  .option(
    '--repository <url>',
    'Repository URI; overrides the generated TODO.invalid placeholder.',
  )
  .option(
    '-y, --yes',
    'Accept defaults for all missing system scaffold values without prompting.',
  )
  .option(
    '--dry-run',
    'Preview the system scaffold without creating files or initializing Git.',
  )
  .action(systemCreate);
system
  .command('install [name]')
  .description('Install a component system or open the guided installer')
  .option(
    '-r, --repository <repository>',
    'Git repository containing the system to install. Remote URLs must end in .git; local paths are accepted.',
  )
  .option(
    '-c, --checkout <commit/branch/tag>',
    'Commit, branch, or tag to check out. Required when --repository is used.',
  )
  .option(
    '--variant <platform-expression>',
    'Exact system variant platform expression to install.',
  )
  .option(
    '-a, --all',
    'Install every component in the selected variant. Without this flag, only required components are installed.',
  )
  .option(
    '-y, --yes',
    'Accept the final guided-install review without prompting.',
  )
  .action(systemInstall);
system
  .command('detach')
  .description('Detach the configured system and keep project components')
  .option('-y, --yes', 'Detach without prompting for confirmation.')
  .action(systemDetach);

// Component sub-commands.
const component = program
  .command('component')
  .description('List, install, create, or customize components');
component
  .command('list')
  .description(
    'List components available from the installed system and variant',
  )
  .option(
    '--refresh',
    'Check the configured system remote before reusing its local cache entry.',
  )
  .alias('ls')
  .action(componentList);
component
  .command('install [name]')
  .description('Install one component from the installed system and variant')
  .option('-f, --force', 'Replace an existing component destination.')
  .option(
    '-a, --all',
    'Install all available components instead of one named component.',
  )
  .option(
    '--dry-run',
    'Preview component installs without copying or removing files.',
  )
  .option(
    '--refresh',
    'Check the configured system remote before reusing its local cache entry.',
  )
  .alias('i')
  .action(componentInstall);
component
  .command('create [name]')
  .option(
    '-d, --directory <directory>',
    'Variant structure name where the component should be created.',
  )
  .option(
    '-t, --type <twig|twig-sdc|react|web-component>',
    'Component implementation type to generate.',
  )
  .option(
    '--tag-name <tag-name>',
    'Custom element tag name for a Web Component.',
  )
  .option(
    '-f, --format <default|sdc>',
    'Deprecated alias: default maps to twig and sdc maps to twig-sdc.',
  )
  .option(
    '--force',
    'Replace an existing generated component without prompting.',
  )
  .option(
    '-y, --yes',
    'Compatibility alias for --force when replacing an existing component.',
  )
  .option(
    '--dry-run',
    'Preview generated component files without writing or removing files.',
  )
  .option(
    '--refresh',
    'Check the configured system remote before reusing its local cache entry.',
  )
  .alias('c')
  .description('Generate a new local component in the current project')
  .action(componentCreate);
component
  .command('eject-templates [type]')
  .description('Write editable copies of the built-in component templates')
  .option('-a, --all', 'Eject templates for every supported component type.')
  .option(
    '-f, --force',
    'Replace existing template files in the selected type set.',
  )
  .option(
    '--dry-run',
    'Preview template destinations and conflicts without writing files.',
  )
  .action(componentEjectTemplates);

// Cache sub-commands.
const cache = program
  .command('cache')
  .description('Inspect or clear locally cached repositories');
cache
  .command('clear')
  .description('Remove all locally cached Emulsify repositories')
  .option('--dry-run', 'Report cache contents without removing files.')
  .action(cacheClear);

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
const { cyan, green } = getTerminalColors();
const title = cyan(packageInfo.productName);
const message = `Version: ${green(packageInfo.version)}`;

const boxedMessage = boxen(message, {
  title: title,
  borderStyle: 'round',
  padding: 1,
  margin: 1,
  ...(terminalSupportsColor()
    ? { backgroundColor: 'black', borderColor: 'blue' }
    : {}),
});

program.version(boxedMessage);
const rootHelpRequested =
  process.argv.length <= 2 ||
  (process.argv.length === 3 &&
    ['--help', '-h', 'help'].includes(process.argv[2]));

if (rootHelpRequested) {
  process.stdout.write(
    getRootHelp({
      colors: getTerminalColors(),
      columns:
        process.stdout.isTTY === true ? process.stdout.columns : undefined,
      description: packageInfo.description,
      productName: packageInfo.productName,
      version: packageInfo.version,
    }),
  );
  process.exit(0);
}

try {
  await program.parseAsync(process.argv);
} catch (err) {
  // Ctrl-C is an expected prompt cancellation, not a command failure.
  if (isExitPromptError(err)) {
    log('info', 'Cancelled.');
    process.exitCode = 130;
  }
  // Expected CliError failures map their message and exitCode to the process;
  // unexpected failures still produce a message and a default non-zero exit.
  else if (err instanceof CliError) {
    log('error', err.message);
    process.exitCode = err.exitCode;
  } else {
    const message = err instanceof Error ? err.message : String(err);
    log('error', message);
    process.exitCode = 1;
  }
}

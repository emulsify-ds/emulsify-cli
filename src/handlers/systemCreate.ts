import type { Platform, PlatformExpression } from '@emulsify-cli/config';
import type { CreateSystemHandlerOptions } from '@emulsify-cli/handlers';
import type { ErrorObject } from 'ajv';

import { checkbox, confirm, input } from '@inquirer/prompts';
import { existsSync, promises as fs } from 'fs';
import { dirname, join, resolve } from 'path';
import { simpleGit } from 'simple-git';

import CliError from '../lib/CliError.js';
import log from '../lib/log.js';
import { EMULSIFY_SYSTEM_CONFIG_FILE } from '../lib/constants.js';
import strToMachineName from '../util/strToMachineName.js';
import safeResolveWithin from '../util/fs/safeResolveWithin.js';
import writeToJsonFile from '../util/fs/writeToJsonFile.js';
import { normalizePlatformExpression } from '../util/platform/platformCompatibility.js';
import { runPrompt } from '../util/prompt/index.js';
import buildSystemScaffold from '../util/system/buildSystemScaffold.js';
import validateSystemConfig from '../util/system/validateSystemConfig.js';

const DEFAULT_SYSTEM_NAME = 'custom-system';
const DEFAULT_TARGET_DIRECTORY = './';
const DEFAULT_PLATFORM: Platform = 'none';

const PLATFORM_CHOICES: { name: string; value: Platform; checked?: boolean }[] =
  [
    {
      name: 'Generic / no platform',
      value: 'none',
      checked: true,
    },
    { name: 'Drupal', value: 'drupal' },
    { name: 'WordPress', value: 'wordpress' },
  ];

/**
 * Convert a human-readable system name into its repository/config identity.
 */
export function normalizeSystemName(name: string): string {
  const trimmedName = name?.trim() || '';
  const machineName = strToMachineName(
    trimmedName.replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' '),
  );

  if (machineName.length < 3) {
    throw new CliError(
      'System name must contain at least three letters or numbers. Pass the [name] positional argument or use --yes for the default.',
    );
  }

  return machineName;
}

function validatePromptedSystemName(name: string): true | string {
  try {
    normalizeSystemName(name);
    return true;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function normalizeRequestedPlatform(platform: string): PlatformExpression {
  try {
    return normalizePlatformExpression(platform) as PlatformExpression;
  } catch {
    throw new CliError(
      `Unsupported platform expression "${platform}". Pass --platform with none, drupal, wordpress, or a supported expression such as "drupal || wordpress".`,
    );
  }
}

function formatValidationErrors(
  errors: ErrorObject[] | null | undefined,
): string {
  return (
    errors
      ?.map(
        ({ instancePath, message }) =>
          `${instancePath || '/'} ${message || 'is invalid'}`,
      )
      .join('; ') || 'unknown schema validation error'
  );
}

/**
 * Handler for `emulsify system create [name]`.
 */
export default async function systemCreate(
  name: string | void,
  options: CreateSystemHandlerOptions = {},
): Promise<void> {
  const acceptDefaults = options.yes === true;

  let requestedName = name?.trim();
  if (!requestedName) {
    requestedName = await runPrompt({
      prompt: () =>
        input({
          message: 'System name:',
          default: DEFAULT_SYSTEM_NAME,
          validate: validatePromptedSystemName,
        }),
      nonInteractive: {
        error:
          'System name is required in non-interactive mode. Pass the [name] positional argument or use --yes.',
      },
      accept: { when: acceptDefaults, value: DEFAULT_SYSTEM_NAME },
    });
  }
  const systemName = normalizeSystemName(requestedName);

  let targetParent = options.directory?.trim();
  if (!targetParent) {
    targetParent = await runPrompt({
      prompt: () =>
        input({
          message: 'Target directory:',
          default: DEFAULT_TARGET_DIRECTORY,
          validate: (value) =>
            value.trim().length > 0 || 'Target directory cannot be empty.',
        }),
      nonInteractive: {
        error:
          'Target directory is required in non-interactive mode. Pass --directory <directory> or use --yes.',
      },
      accept: { when: acceptDefaults, value: DEFAULT_TARGET_DIRECTORY },
    });
  }

  let platform = options.platform
    ? normalizeRequestedPlatform(options.platform)
    : undefined;
  if (!platform) {
    const platforms = await runPrompt<Platform[]>({
      prompt: () =>
        checkbox({
          message: 'Platform targets:',
          choices: PLATFORM_CHOICES,
          validate: (values) =>
            values.length > 0 || 'Select at least one platform target.',
        }),
      nonInteractive: {
        error:
          'A platform target is required in non-interactive mode. Pass --platform <platform-expression> or use --yes.',
      },
      accept: { when: acceptDefaults, value: [DEFAULT_PLATFORM] },
    });
    platform = normalizeRequestedPlatform(platforms.join(' || '));
  }

  let initializeGit = options.git;
  if (initializeGit === undefined) {
    initializeGit = await runPrompt({
      prompt: () =>
        confirm({
          message: 'Initialize a Git repository?',
          default: true,
        }),
      nonInteractive: {
        error:
          'Git initialization choice is required in non-interactive mode. Pass --git or --no-git, or use --yes.',
      },
      accept: { when: acceptDefaults, value: true },
    });
  }

  const target = join(resolve(targetParent), systemName);
  if (existsSync(target)) {
    throw new CliError(
      `The system target is already occupied: ${target}. Choose another parent directory with --directory.`,
    );
  }

  const scaffold = buildSystemScaffold({
    name: systemName,
    platform,
    homepage: options.homepage || `https://TODO.invalid/${systemName}`,
    repository: options.repository || `https://TODO.invalid/${systemName}.git`,
  });
  const validation = await validateSystemConfig(scaffold.systemConfig);
  if (!validation.valid) {
    throw new CliError(
      `Unable to create an invalid system scaffold: ${formatValidationErrors(validation.errors)}`,
    );
  }

  try {
    await fs.mkdir(target, { recursive: true });
    await Promise.all([
      writeToJsonFile(
        join(target, EMULSIFY_SYSTEM_CONFIG_FILE),
        scaffold.systemConfig,
      ),
      ...scaffold.files.map(async ({ path, contents }) => {
        const destination = safeResolveWithin(
          target,
          path,
          'System scaffold file',
        );
        await fs.mkdir(dirname(destination), { recursive: true });
        await fs.writeFile(destination, contents, { encoding: 'utf-8' });
      }),
    ]);

    if (initializeGit) {
      await simpleGit(target).init(false, { '--initial-branch': 'main' });
    }
  } catch (error) {
    throw new CliError(
      `Unable to create the system in ${target}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  log('success', `Created the ${systemName} system in ${target}.`);
  if (initializeGit) {
    log(
      'info',
      'Git was initialized on branch main. Review the generated metadata, then commit the scaffold before installing it.',
    );
  }
}

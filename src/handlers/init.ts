import { join } from 'path';
import { existsSync, promises as fs } from 'fs';
import { simpleGit } from 'simple-git';
import ProgressBar from 'progress';
import { input, select } from '@inquirer/prompts';

import type {
  EmulsifyProjectConfiguration,
  Platform,
} from '@emulsify-cli/config';
import type { InitHandlerOptions } from '@emulsify-cli/handlers';
import {
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_PROJECT_HOOK_INIT,
  EMULSIFY_PROJECT_HOOK_FOLDER,
} from '../lib/constants.js';
import getPlatformInfo from '../util/platform/getPlatformInfo.js';
import getAvailableStarters from '../util/getAvailableStarters.js';
import loadJsonFile from '../util/fs/loadJsonFile.js';
import writeToJsonFile from '../util/fs/writeToJsonFile.js';
import strToMachineName from '../util/strToMachineName.js';
import installDependencies from '../util/project/installDependencies.js';
import executeScript from '../util/fs/executeScript.js';
import getInitSuccessMessageForPlatform from '../util/platform/getInitSuccessMessageForPlatform.js';
import log from '../lib/log.js';
import CliError from '../lib/CliError.js';
import { isPlatform } from '../util/platform/platformCompatibility.js';
import { runPrompt } from '../util/prompt/index.js';

const git = simpleGit();

export const DIRECTORY = 1;
const DEFAULT_PROJECT_NAME = 'emulsifyTheme';
const DEFAULT_PLATFORM: Platform = 'drupal';
const PLATFORM_CHOICES = [
  'drupal',
  'wordpress',
  'none',
] as const satisfies readonly Platform[];

type InitializationPhase =
  | 'cloning the starter'
  | 'reading the starter project configuration'
  | 'writing the project configuration'
  | 'installing dependencies'
  | 'executing the starter init hook'
  | 'removing the starter Git metadata';

function isAlreadyExistsError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'EEXIST'
  );
}

async function rollbackFailedInitialization(
  target: string,
  phase: InitializationPhase,
  error: unknown,
): Promise<CliError> {
  const failure = `Unable to initialize project while ${phase}: ${String(error)}`;

  try {
    await fs.rm(target, { recursive: true, force: true });

    return new CliError(
      `${failure}. Removed the incomplete target "${target}".`,
    );
  } catch (cleanupError) {
    return new CliError(
      `${failure}. Automatic cleanup of the incomplete target "${target}" also failed: ${String(cleanupError)}. Remove it manually before retrying.`,
    );
  }
}

/**
 * Handler for the initialization command.
 *
 * @param name name of the project being initialized.
 * @param targetDirectory relative path to the directory in which the project must be initialized.
 * @param options commander options object.
 * @param options.starter path to at git repository containing an Emulsify starter, such as the Emulsify Drupal theme.
 * @param options.checkout commit, branch, or tag to checkout after cloning the starter repository.
 * @param options.platform platform to use when auto-detection is unavailable or should be overridden.
 * @param options.machineName machine-friendly project folder/config name.
 * @param options.yes whether to accept defaults for missing values without prompting.
 *
 * @throws {CliError} if required project information cannot be determined or initialization fails.
 */
export default function init(progress: InstanceType<typeof ProgressBar>) {
  return async (
    name?: string,
    targetDirectory?: string,
    options?: InitHandlerOptions,
  ): Promise<void> => {
    // Load information about the project and platform.
    const { name: autoPlatformName, emulsifyParentDirectory } =
      (await getPlatformInfo()) || {};
    const isDetectedDrupalProject = autoPlatformName === 'drupal';
    const acceptDefaults = options?.yes === true;

    // Prompts are skipped in non-TTY runs; --yes accepts prompt defaults and
    // explicit flags/arguments always take precedence.
    let projectName = name || options?.machineName;
    if (!projectName) {
      projectName = await runPrompt({
        prompt: () =>
          input({
            message: 'Project name:',
            default: DEFAULT_PROJECT_NAME,
          }),
        nonInteractive: {
          error:
            'Unable to determine the project name. Please provide a valid project name.',
        },
        accept: {
          when: acceptDefaults,
          value: DEFAULT_PROJECT_NAME,
        },
      });
    }

    if (!projectName) {
      throw new CliError(
        'Unable to determine the project name. Please provide a valid project name.',
      );
    }

    let targetParent = targetDirectory || emulsifyParentDirectory;
    if (!targetParent) {
      targetParent = await runPrompt<string | undefined>({
        prompt: () =>
          input({
            message: 'Target directory:',
            default: './',
          }),
        // Preserve the existing error ordering: platform validation occurs
        // before the missing target is reported below.
        nonInteractive: { value: undefined },
        accept: { when: acceptDefaults, value: './' },
      });
    }

    // If no platform name is given, and none can be detected, exit and error.
    const requestedPlatformName = options?.platform || autoPlatformName;
    let platformName = isPlatform(requestedPlatformName)
      ? requestedPlatformName
      : undefined;
    if (requestedPlatformName && !platformName) {
      throw new CliError(
        `Unsupported platform "${requestedPlatformName}". Supported platforms are "none", "drupal", and "wordpress".`,
      );
    }
    if (!platformName) {
      platformName = await runPrompt({
        prompt: () =>
          select({
            message: 'Platform:',
            choices: PLATFORM_CHOICES,
            default: DEFAULT_PLATFORM,
          }),
        nonInteractive: {
          error:
            'Unable to determine which platform you are installing Emulsify within. Please specify a platform (such as "drupal" or "wordpress") by passing a -p or --platform flag with your init command.',
        },
        accept: { when: acceptDefaults, value: DEFAULT_PLATFORM },
      });
    }

    if (!platformName) {
      throw new CliError(
        'Unable to determine which platform you are installing Emulsify within. Please specify a platform (such as "drupal" or "wordpress") by passing a -p or --platform flag with your init command.',
      );
    }

    progress.tick(10, {
      message: `using starter for ${platformName} as the selected platform, validating config`,
    });

    // Choose a folder name. If no machineName is given, create one using the project name.
    const machineName =
      options?.machineName || strToMachineName(projectName, platformName);

    // Collection information about the starter kit, such as the target directory,
    // starter repository, and checkout version.
    const starters = getAvailableStarters();
    const starter = starters.find((s) => s.platform === platformName);

    const target = targetParent ? join(targetParent, machineName) : undefined;

    const repository = options?.starter || starter?.repository;
    const checkout =
      options?.checkout || (options?.starter ? undefined : starter?.checkout);

    if (!target) {
      throw new CliError(
        'Unable to find a directory to put Emulsify in. Please specify a directory using the "path" argument: emulsify init myTheme ./themes',
      );
    }

    if (!repository) {
      throw new CliError(
        `Unable to find an Emulsify starter for your project. Please specify one using the --starter flag: emulsify init myTheme --starter ${
          getAvailableStarters()[0].repository
        }`,
      );
    }

    if (existsSync(target)) {
      throw new CliError(`The intended target is already occupied: ${target}`);
    }

    // Reserve the target atomically before cloning so rollback only ever
    // removes a directory created by this command run. Git can clone into an
    // existing empty directory.
    try {
      await fs.mkdir(target);
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        throw new CliError(
          `The intended target is already occupied: ${target}`,
        );
      }

      throw new CliError(
        `Unable to initialize project while creating the target directory "${target}": ${String(error)}`,
      );
    }

    let phase: InitializationPhase = 'cloning the starter';

    try {
      progress.tick(10, { message: 'validation complete, cloning starter' });

      // Clone the Emulsify starter into the target directory, and checkout
      // the correct tag/branch/commit.
      await git.clone(
        repository,
        target,
        checkout
          ? {
              '--branch': checkout,
            }
          : {},
      );

      // Preserve starter-provided settings while replacing the values that
      // describe this concrete generated project.
      phase = 'reading the starter project configuration';
      const configPath = join(target, EMULSIFY_PROJECT_CONFIG_FILE);
      const starterConfig =
        await loadJsonFile<Partial<EmulsifyProjectConfiguration>>(configPath);

      phase = 'writing the project configuration';
      await writeToJsonFile<EmulsifyProjectConfiguration>(configPath, {
        ...starterConfig,
        project: {
          ...starterConfig?.project,
          platform: platformName,
          name: projectName,
          machineName,
        },
        starter: {
          ...starterConfig?.starter,
          repository,
        },
      });

      progress.tick(30, {
        message:
          'starter cloned, installing dependencies (this will take a moment)',
      });

      // Install project dependencies.
      phase = 'installing dependencies';
      await installDependencies(target);

      progress.tick(40, {
        message: 'dependencies installed, executing init script',
      });

      // Execute the init script, if one exists.
      const initPath = join(
        target,
        EMULSIFY_PROJECT_HOOK_FOLDER,
        EMULSIFY_PROJECT_HOOK_INIT,
      );
      if (existsSync(initPath)) {
        phase = 'executing the starter init hook';
        await executeScript(initPath);
      }

      // Remove the .git directory, as this is a starter kit. This step
      // should happen after dependencies are installed, and init scripts are
      // executed, otherwise git-reliant dev deps in the starter may error out.
      phase = 'removing the starter Git metadata';
      await fs.rm(join(target, '.git'), { recursive: true });
    } catch (e) {
      throw await rollbackFailedInitialization(target, phase, e);
    }

    // The filesystem transaction is complete. Keep display-only work outside
    // the rollback boundary so a terminal/logging failure cannot delete a
    // successfully initialized project.
    progress.tick(10, {
      message: 'init script executed, initialization complete',
    });

    log('success', `Created an Emulsify project in ${target}.`);
    getInitSuccessMessageForPlatform(platformName, target, {
      includeDrupalInstallReminder:
        isDetectedDrupalProject && platformName === 'drupal',
    }).map(({ method, message }) => log(method, message));
  };
}

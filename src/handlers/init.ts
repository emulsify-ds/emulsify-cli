import { join } from 'path';
import { existsSync, promises as fs } from 'fs';
import simpleGit from 'simple-git';
import ProgressBar from 'progress';
import inquirer from 'inquirer';
import { AnyQuestion } from 'inquirer/dist/cjs/types/types.js';

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
import writeToJsonFile from '../util/fs/writeToJsonFile.js';
import strToMachineName from '../util/strToMachineName.js';
import installDependencies from '../util/project/installDependencies.js';
import executeScript from '../util/fs/executeScript.js';
import getInitSuccessMessageForPlatform from '../util/platform/getInitSuccessMessageForPlatform.js';
import log from '../lib/log.js';
import { EXIT_ERROR } from '../lib/constants.js';

const git = simpleGit();

export const DIRECTORY = 1;
export const questions: AnyQuestion<String>[] = [
  {
    type: 'input',
    name: 'name',
    message: 'Project name:',
    default: 'emulsifyTheme',
  },
  {
    type: 'input',
    name: 'targetDirectory',
    message: 'Target directory:',
    default: './',
  },
  {
    type: 'input',
    name: 'platform',
    message: 'Platform:',
    default: 'drupal',
  },
];

/**
 * Handler for the initialization command.
 *
 * @param name name of the project being initialized.
 * @param targetDirectory relative path to the directory in which the project must be initialized.
 * @param options commander options object.
 * @param options.starter path to at git repository containing an Emulsify starter, such as the Emulsify Drupal theme.
 * @param options.checkout commit, branch, or tag to checkout after cloning the starter repository.
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

    if (typeof name === 'undefined') {
      questions[DIRECTORY].default = emulsifyParentDirectory;
      const response = await inquirer.prompt(questions as any);
      if (response?.targetDirectory) targetDirectory = response.targetDirectory;
      if (response?.platform) options = { platform: response.platform };
      if (response?.name) name = response.name;
    }
    if (!name) {
      return log(
        'error',
        'Unable to determine the project name. Please provide a valid project name.',
        EXIT_ERROR,
      );
    }

    // If no platform name is given, and none can be detected, exit and error.
    const platformName = (options?.platform || autoPlatformName) as
      | Platform
      | undefined;
    if (!platformName) {
      return log(
        'error',
        'Unable to determine which platform you are installing Emulsify within. Please specify a platform (such as "drupal" or "wordpress") by passing a -p or --platform flag with your init command.',
        EXIT_ERROR,
      );
    }

    progress.tick(10, {
      message: `using starter for ${platformName} as the selected platform, validating config`,
    });

    // Choose a folder name. If no machineName is given, create one using the project name.
    const machineName =
      options?.machineName || strToMachineName(name, platformName);

    // Collection information about the starter kit, such as the target directory,
    // starter repository, and checkout version.
    const starters = getAvailableStarters();
    const starter = starters.find((s) => s.platform === platformName);

    const targetParent = targetDirectory || emulsifyParentDirectory;
    const target = targetParent ? join(targetParent, machineName) : undefined;

    const repository = options?.starter || starter?.repository;
    const checkout = options?.checkout || starter?.checkout;

    if (!target) {
      return log(
        'error',
        'Unable to find a directory to put Emulsify in. Please specify a directory using the "path" argument: emulsify init myTheme ./themes',
        EXIT_ERROR,
      );
    }

    if (!repository) {
      return log(
        'error',
        `Unable to find an Emulsify starter for your project. Please specify one using the --starter flag: emulsify init myTheme --starter ${
          getAvailableStarters()[0].repository
        }`,
        EXIT_ERROR,
      );
    }

    if (existsSync(target)) {
      return log(
        'error',
        `The intended target is already occupied: ${target}`,
        EXIT_ERROR,
      );
    }

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

      // Construct an Emulsify configuration object.
      await writeToJsonFile<EmulsifyProjectConfiguration>(
        join(target, EMULSIFY_PROJECT_CONFIG_FILE),
        {
          project: {
            platform: platformName,
            name,
            machineName,
          },
          starter: { repository },
        },
      );

      progress.tick(30, {
        message:
          'starter cloned, installing dependencies (this will take a moment)',
      });

      // Install project dependencies.
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
        await executeScript(initPath);
      }

      // Remove the .git directory, as this is a starter kit. This step
      // should happen after dependencies are installed, and init scripts are
      // executed, otherwise git-reliant dev deps in the starter may error out.
      await fs.rm(join(target, '.git'), { recursive: true });

      progress.tick(10, {
        message: 'init script executed, initialization complete',
      });

      log('success', `Created an Emulsify project in ${target}.`);
      getInitSuccessMessageForPlatform(platformName, target).map(
        ({ method, message }) => log(method, message),
      );
    } catch (e) {
      log(
        'error',
        `Unable to pull down ${repository}: ${String(e)}`,
        EXIT_ERROR,
      );
    }
  };
}

import R from 'ramda';
import { join } from 'path';
import { existsSync, promises as fs } from 'fs';
import simpleGit from 'simple-git';

import type { EmulsifyProjectConfiguration } from '@emulsify-cli/config';
import type { InitHandlerOptions } from '@emulsify-cli/handlers';
import {
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_PROJECT_HOOK_INIT,
  EMULSIFY_PROJECT_HOOK_FOLDER,
} from '../lib/constants';
import getPlatformInfo from '../util/platform/getPlatformInfo';
import getAvailableStarters from '../util/getAvailableStarters';
import writeToJsonFile from '../util/fs/writeToJsonFile';
import strToMachineName from '../util/strToMachineName';
import installDependencies from '../util/project/installDependencies';
import executeScript from '../util/fs/executeScript';
import log from '../lib/log';
import { EXIT_ERROR } from '../lib/constants';

const git = simpleGit();

/**
 * Handler for the initalization command.
 *
 * @param name name of the project being initialized.
 * @param targetDirectory relative path to the directory in which the project must be initialized.
 * @param options commander options object.
 * @param options.starter path to at git repository containing an Emulsify starter, such as the Emulsify Drupal theme.
 * @param options.checkout commit, branch, or tag to checkout after cloning the starter repository.
 */
export default async function init(
  name: string,
  targetDirectory?: string,
  options?: InitHandlerOptions
): Promise<void> {
  // Load information about the project and platform.
  const { name: autoPlatformName, emulsifyParentDirectory } =
    (await getPlatformInfo()) || {};

  // If no platform name is given, and none can be detected, exit and error.
  const platformName = options?.platform || autoPlatformName;
  if (!platformName) {
    return log(
      'error',
      'Unable to determine which platform you are installing Emulsify within. Please specify a platform (such as "drupal" or "wordpress") by passing a -p or --platform flag with your init command.',
      EXIT_ERROR
    );
  }

  // Choose a folder name. If no machineName is given, create one using the project name.
  const machineName = options?.machineName || strToMachineName(name);

  // Collection information about the starter kit, such as the target directory,
  // starter repository, and checkout version.
  const starters = getAvailableStarters();
  const starter = starters.find(R.propEq('platform')(platformName));

  const targetParent = targetDirectory || emulsifyParentDirectory;
  const target = targetParent ? join(targetParent, machineName) : undefined;

  const repository = options?.starter || starter?.repository;
  const checkout = options?.checkout || starter?.checkout;

  if (!target) {
    return log(
      'error',
      'Unable to find a directory to put Emulsify in. Please specify a directory using the "path" argument: emulsify init myTheme ./themes',
      EXIT_ERROR
    );
  }

  if (!repository) {
    return log(
      'error',
      `Unable to find an Emulsify starter for your project. Please specify one using the --starter flag: emulsify init myTheme --starter ${
        getAvailableStarters()[0].repository
      }`,
      EXIT_ERROR
    );
  }

  if (existsSync(target)) {
    return log(
      'error',
      `The intended target is already occupied: ${target}`,
      EXIT_ERROR
    );
  }

  try {
    // Clone the Emulsify starter into the target directory, and checkout
    // the correct tag/branch/commit.
    await git.clone(
      repository,
      target,
      checkout
        ? {
            '--branch': checkout,
          }
        : {}
    );

    // Remove the .git directory, as this is a starter kit.
    await fs.rmdir(join(target, '.git'), { recursive: true });

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
      }
    );

    // Install project dependencies.
    await installDependencies(target);

    // Execute the init script, if one exists.
    const initPath = join(
      target,
      EMULSIFY_PROJECT_HOOK_FOLDER,
      EMULSIFY_PROJECT_HOOK_INIT
    );
    if (existsSync(initPath)) {
      await executeScript(initPath);
    }

    log('success', `Created an Emulsify project in ${target}.`);
    log(
      'info',
      `Emulsify does not come with components by default.\nPlease use "emulsify system install" to select a design system you'd like to use.\nDoing so will install the system's default components, and allow you to install any other components made available by the design system.\nTo see a list of out-of-the-box design systems, run: "emulsify system ls"`
    );
  } catch (e) {
    log('error', `Unable to pull down ${repository}: ${String(e)}`, EXIT_ERROR);
  }
}

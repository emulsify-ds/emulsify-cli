import R from 'ramda';
import { join } from 'path';
import { existsSync, promises as fs } from 'fs';
import simpleGit from 'simple-git';

import type { EmulsifyProjectConfiguration } from '@emulsify-cli/config';
import type { InitHandlerOptions } from '@emulsify-cli/handlers';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../lib/constants';
import getPlatformInfo from '../util/platform/getPlatformInfo';
import getAvailableStarters from '../util/getAvailableStarters';
import writeToJsonFile from '../util/fs/writeToJsonFile';
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
  const { name: platformName, emulsifyParentDirectory } =
    (await getPlatformInfo()) || {};

  const starters = getAvailableStarters();
  const starter = starters.find(R.propEq('platform')(platformName));

  const targetParent = targetDirectory || emulsifyParentDirectory;
  const target = targetParent ? join(targetParent, name) : undefined;

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
        starter: { repository },
      }
    );

    log('success', `Created an Emulsify project in ${target}.`);
    log(
      'info',
      `Emulsify does not come with components by default.\nPlease use "emulsify system install" to select a design system you'd like to use.\nDoing so will install the system's default components, and allow you to install any other components made available by the design system.\nTo see a list of out-of-the-box design systems, run: "emulsify system ls"`
    );
  } catch (e) {
    log('error', `Unable to pull down ${repository}: ${String(e)}`, EXIT_ERROR);
  }
}

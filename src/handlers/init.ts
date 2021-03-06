import R from 'ramda';
import { join } from 'path';
import { existsSync } from 'fs';

import type { EmulsifyProjectConfiguration } from '@emulsify-cli/config';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../lib/constants';
import cloneRepository from '../util/cloneRepository';
import getPlatformInfo from '../util/platform/getPlatformInfo';
import getAvailableStarters from '../util/getAvailableStarters';
import writeToJsonFile from '../util/fs/writeToJsonFile';
import log from '../lib/log';
import { EXIT_ERROR } from '../lib/constants';

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
  options?: {
    starter?: string | void;
    checkout?: string | void;
  }
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
    // Clone the Emulsify starter into the target directory.
    await cloneRepository(repository, target, {
      checkout,
      shallow: true,
      removeGitAfterClone: true,
    });

    // Construct an Emulsify configuration object.
    await writeToJsonFile<EmulsifyProjectConfiguration>(
      join(target, EMULSIFY_PROJECT_CONFIG_FILE),
      {
        starter: { repository },
      }
    );

    log('success', `Created an Emulsify project in ${target}. Enjoy!`);
  } catch (e) {
    log('error', `Unable to pull down ${repository}: ${String(e)}`, EXIT_ERROR);
  }
}

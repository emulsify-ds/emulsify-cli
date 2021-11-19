import type { InstallSystemHandlerOptions } from '@emulsify-cli/handlers';
import type { GitCloneOptions } from '@emulsify-cli/git';
import type { EmulsifySystem } from '@emulsify-cli/config';

import R from 'ramda';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  EXIT_ERROR,
  EMULSIFY_SYSTEM_CONFIG_FILE,
  EMULSIFY_PROJECT_HOOK_FOLDER,
  EMULSIFY_PROJECT_HOOK_SYSTEM_INSTALL,
} from '../lib/constants';
import log from '../lib/log';
import getAvailableSystems from '../util/system/getAvailableSystems';
import getGitRepoNameFromUrl from '../util/getGitRepoNameFromUrl';
import cloneIntoCache from '../util/cache/cloneIntoCache';
import getCachedItemCheckout from '../util/cache/getCachedItemCheckout';
import installComponentFromCache from '../util/project/installComponentFromCache';
import installGeneralAssetsFromCache from '../util/project/installGeneralAssetsFromCache';
import getJsonFromCachedFile from '../util/cache/getJsonFromCachedFile';
import setEmulsifyConfig from '../util/project/setEmulsifyConfig';
import getEmulsifyConfig from '../util/project/getEmulsifyConfig';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath';
import executeScript from '../util/fs/executeScript';
import systemSchema from '../schemas/system.json';
import variantSchema from '../schemas/variant.json';

/**
 * Helper function that uses InstallSystemHandlerOptions input to determine what
 * system should be installed, if any.
 *
 * @param options InstallSystemHandlerOptions object.
 *
 * @returns GitCloneOptions or void, if no valid system could be found using the input.
 */
export async function getSystemRepoInfo(
  name: string | void,
  { repository, checkout }: InstallSystemHandlerOptions
): Promise<(GitCloneOptions & { name: string }) | void> {
  // If a repository and checkout were specified, use that to return system information.
  if (repository && checkout) {
    const repoName = getGitRepoNameFromUrl(repository);
    if (repoName) {
      return {
        name: repoName,
        repository,
        checkout,
      };
    }
  }

  // If a name was provided, attempt to find an out-of-the-box system with
  // the name, and use it to return system information.
  if (name) {
    const system = (await getAvailableSystems()).find(R.propEq('name', name));
    if (system) {
      return {
        name,
        repository: system.repository,
        checkout: system.checkout,
      };
    }
  }
}

/**
 * Handler for the `system install` command.
 *
 * @param name optional string containing the name of the system that should be installed.
 * @param options InstallSystemHandlerOptions object containing configuration for the installation.
 * @param options.repository optional string containing a git URL to a repository containing the system that should be installed.
 * @param options.checkout optional string containing the commit/branch/tag of the system that should be used.
 */
export default async function systemInstall(
  name: string | void,
  options: InstallSystemHandlerOptions
): Promise<void> {
  // @TODO: extract some of this into a common util.
  // Attempt to load emulsify config. If none is found, this is not an Emulsify project.
  const projectConfig = await getEmulsifyConfig();
  if (!projectConfig) {
    return log(
      'error',
      'No Emulsify project detected. You must run this command within an existing Emulsify project. For more information about creating Emulsify projects, run "emulsify init --help"',
      EXIT_ERROR
    );
  }

  if (projectConfig.system) {
    return log(
      'error',
      'You have already selected a system within this Emulsify project.',
      EXIT_ERROR
    );
  }

  // Attempt to load system information, and exit with a log message
  // if a valid system was not found.
  const repo = await getSystemRepoInfo(name, options);
  if (!repo) {
    return log(
      'error',
      'Unable to download specified system. You must either specify a valid name of an out-of-the-box system using the --name flag, or specify a valid repository and branch/tag/commit using the --repository and --checkout flags.',
      EXIT_ERROR
    );
  }

  // Clone the system into the cache.
  await cloneIntoCache('systems', [repo.name])({
    repository: repo.repository,
    checkout: repo.checkout,
  });

  // Load the system configuration file.
  const systemConf: EmulsifySystem | void = await getJsonFromCachedFile(
    'systems',
    [repo.name],
    EMULSIFY_SYSTEM_CONFIG_FILE
  );

  // If there is no configuration file within the system, error.
  if (!systemConf) {
    return log(
      'error',
      `The system you attempted to install (${repo.name}) is invalid, as it does not contain a valid configuration file.`,
      EXIT_ERROR
    );
  }

  // Validate the system configuration file.
  try {
    const ajv = new Ajv();
    // This is unfortunate...
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore The ajv-formats typing is bad :(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    addFormats(ajv, ['uri']);
    ajv.addSchema(variantSchema, 'variant.json');
    const validate = ajv.compile(systemSchema);

    if (!validate(systemConf)) {
      throw validate.errors;
    }
  } catch (e) {
    // We're logging to the console here instead of our normal logging mechanism
    // in order to have more readable output from the AJV validation.
    console.error('System configuration errors:', e);
    return log(
      'error',
      `The system install failed due to the validation errors reported above. Please fix the the errors in the "${systemConf.name}" configuration and try again.`,
      EXIT_ERROR
    );
  }

  // Extract the variant name, and error if no variant is determinable.
  const variantName: string | void =
    options.variant || projectConfig.project.platform;
  if (!variantName) {
    return log(
      'error',
      'Unable to determine a variant for the specified system. Please either pass in a valid variant using the --variant flag.',
      EXIT_ERROR
    );
  }

  // @TODO: clone variants into their own cache bucket if a reference is provided.
  const variantConf = systemConf.variants?.find(
    ({ platform }) => platform === variantName
  );
  if (!variantConf) {
    return log(
      'error',
      `Unable to find a variant (${variantName}) within the system (${systemConf.name}). Please check your Emulsify project config and make sure the project.platform value is correct, or select a system with a variant that is compatible with the platform you are using.`,
      EXIT_ERROR
    );
  }

  // Update emulsify project config.
  try {
    // If no checkout was passed along, and the default checkout was used, fetch it
    // it can be stored in the project config.
    let checkout = repo.checkout;
    if (!checkout) {
      checkout = await getCachedItemCheckout('systems', [repo.name]);
    }

    await setEmulsifyConfig({
      system: {
        repository: repo.repository,
        checkout,
      },
      // @TODO: Because we don't yet support referenced variants, for now we only
      // pass in the platform name.
      variant: {
        platform: variantConf.platform,
        structureImplementations: variantConf.structureImplementations,
      },
    });
  } catch (e) {
    return log(
      'error',
      'Unable to update your Emulsify project configuration.',
      EXIT_ERROR
    );
  }

  try {
    // Install all required components.
    const requiredComponents = variantConf.components.filter(
      ({ required }) => required === true
    );
    for (const component of requiredComponents) {
      await installComponentFromCache(
        systemConf,
        variantConf,
        component.name,
        true
      );
    }

    // Install all global files and folders.
    await installGeneralAssetsFromCache(systemConf, variantConf);

    // Execute system install hook.
    const path = findFileInCurrentPath(EMULSIFY_SYSTEM_CONFIG_FILE);
    const hookPath = path
      ? join(
          path,
          EMULSIFY_PROJECT_HOOK_FOLDER,
          EMULSIFY_PROJECT_HOOK_SYSTEM_INSTALL
        )
      : undefined;
    if (hookPath && existsSync(hookPath)) {
      await executeScript(hookPath);
    }
  } catch (e) {
    return log(
      'error',
      `Unable to install system assets and/or required components: ${R.toString(
        e
      )}`,
      EXIT_ERROR
    );
  }

  return log(
    'success',
    `Successfully installed the ${systemConf.name} system using the ${variantConf.platform} variant.`,
    EXIT_ERROR
  );
}

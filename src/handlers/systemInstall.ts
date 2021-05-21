import type { InstallSystemHandlerOptions } from '@emulsify-cli/handlers';
import type { GitCloneOptions } from '@emulsify-cli/git';
import type { EmulsifySystem } from '@emulsify-cli/config';

import R from 'ramda';
import { EXIT_ERROR, EMULSIFY_SYSTEM_CONFIG_FILE } from '../lib/constants';
import log from '../lib/log';
import getAvailableSystems from '../util/system/getAvailableSystems';
import getGitRepoNameFromUrl from '../util/getGitRepoNameFromUrl';
import cloneIntoCache from '../util/cache/cloneIntoCache';
import installComponentFromCache from '../util/project/installComponentFromCache';
import installGeneralAssetsFromCache from '../util/project/installGeneralAssetsFromCache';
import getJsonFromCachedFile from '../util/cache/getJsonFromCachedFile';
import setEmulsifyConfig from '../util/project/setEmulsifyConfig';
import getEmulsifyConfig from '../util/project/getEmulsifyConfig';

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
) {
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
    await setEmulsifyConfig({
      system: {
        repository: repo.repository,
        checkout: repo.checkout as string | undefined,
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
      await installComponentFromCache(systemConf, variantConf, component.name);
    }

    // Install all global files and folders.
    await installGeneralAssetsFromCache(systemConf, variantConf);
  } catch (e) {
    return log(
      'error',
      `Unable to install system assets and/or required components: ${e}`,
      EXIT_ERROR
    );
  }

  return log(
    'success',
    `Successfully installed the ${systemConf.name} system using the ${variantConf.platform} variant.`,
    EXIT_ERROR
  );
}

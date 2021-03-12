import type { InstallSystemHandlerOptions } from '@emulsify-cli/handlers';
import type { GitCloneOptions } from '@emulsify-cli/git';

import R from 'ramda';
import getAvailableSystems from '../util/system/getAvailableSystems';
import getGitRepoNameFromUrl from '../util/getGitRepoNameFromUrl';
import log from '../lib/log';
import { EXIT_ERROR } from '../lib/constants';
import cloneIntoCache from '../util/cache/cloneIntoCache';

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

  return;
}

/**
 * Handler for the `system install` command.
 */
export default async function systemInstall(
  name: string | void,
  options: InstallSystemHandlerOptions
) {
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
  await cloneIntoCache(
    'systems',
    repo.name
  )({
    repository: repo.repository,
    checkout: repo.checkout,
  });

  // Find variant.
  //   - variant specified? Use that.
  //   - Otherwise, detect version using `getPlatformInfo()`.
  //   - Check the system to make sure the variant exists.
  //   - No valid variant? ERROR.

  // Clone valid variant
  // Update emulsify.config.json with system and variant details
  // Scaffold structure
  // Pull in required components
  // @TODO health check?
}

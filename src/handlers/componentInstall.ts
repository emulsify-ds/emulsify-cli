import log from '../lib/log';
import {
  EXIT_ERROR,
  EMULSIFY_SYSTEM_CONFIG_FILE,
  EMULSIFY_PROJECT_CONFIG_FILE,
} from '../lib/constants';
import type { EmulsifySystem } from '@emulsify-cli/config';
import getGitRepoNameFromUrl from '../util/getGitRepoNameFromUrl';
import getEmulsifyConfig from '../util/project/getEmulsifyConfig';
import getJsonFromCachedFile from '../util/cache/getJsonFromCachedFile';
import installComponentFromCache from '../util/project/installComponentFromCache';
import cloneIntoCache from '../util/cache/cloneIntoCache';

/**
 * Handler for the `component install` command.
 */
export default async function componentInstall(name: string): Promise<void> {
  const emulsifyConfig = await getEmulsifyConfig();
  if (!emulsifyConfig) {
    return log(
      'error',
      'No Emulsify project detected. You must run this command within an existing Emulsify project. For more information about creating Emulsify projects, run "emulsify init --help"',
      EXIT_ERROR
    );
  }

  // If there is no system or variant config, exit with a helpful message.
  if (!emulsifyConfig.system || !emulsifyConfig.variant) {
    return log(
      'error',
      'You must select and install a system before you can install components. To see a list of out-of-the-box systems, run "emulsify system list". You can install a system by running "emulsify system install [name]"',
      EXIT_ERROR
    );
  }

  // Parse the system name from the system repository path.
  const systemName = getGitRepoNameFromUrl(emulsifyConfig.system.repository);
  if (!systemName) {
    return log(
      'error',
      `The system specified in your project configuration is not valid. Please make sure your ${EMULSIFY_PROJECT_CONFIG_FILE} file contains a system.repository value that is a valid git url`,
      EXIT_ERROR
    );
  }

  // Make sure the given system is installed and has the correct branch/commit/tag checked out.
  try {
    await cloneIntoCache('systems', [systemName])(emulsifyConfig.system);
  } catch (e) {
    return log(
      'error',
      'The system specified in your project configuration is not clone-able, or has an invalid checkout value.',
      EXIT_ERROR
    );
  }

  // Load the system configuration file.
  const systemConf: EmulsifySystem | void = await getJsonFromCachedFile(
    'systems',
    [systemName],
    EMULSIFY_SYSTEM_CONFIG_FILE
  );

  // If no systemConf is present, error with a helpful message.
  // @TODO: We definitely need a mechanism to pull in the system, cache it, and make sure it's
  // checked out version is correct. This should likely be done with a HOF that can be applied
  // to any command handler: R.compose(withCachedSystem, withEmulsifySystemRequirement)(componentInstall).
  if (!systemConf) {
    return log(
      'error',
      `Unable to load configuration for the ${systemName} system. Please make sure the system is installed.`,
      EXIT_ERROR
    );
  }

  const variantName = emulsifyConfig.variant.platform;
  const variantConf = systemConf.variants?.find(
    ({ platform }) => platform === variantName
  );

  if (!variantConf) {
    return log(
      'error',
      `Unable to find configuration for the variant ${variantName} within the system ${systemName}.`,
      EXIT_ERROR
    );
  }

  await installComponentFromCache(systemConf, variantConf, name);
  return log(
    'success',
    `Success! The ${name} component has been added to your project.`
  );
}

/**
 * @file Shared loader for handlers that require an installed Emulsify system.
 */

import type {
  EmulsifyProjectConfiguration,
  EmulsifySystem,
  EmulsifyVariant,
} from '@emulsify-cli/config';
import {
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_SYSTEM_CONFIG_FILE,
} from '../../lib/constants.js';
import CliError from '../../lib/CliError.js';
import cloneIntoCache from '../../util/cache/cloneIntoCache.js';
import getJsonFromCachedFile from '../../util/cache/getJsonFromCachedFile.js';
import getGitRepoNameFromUrl from '../../util/getGitRepoNameFromUrl.js';
import getEmulsifyConfig from '../../util/project/getEmulsifyConfig.js';
import {
  selectCompatiblePlatformVariant,
  selectExactPlatformVariant,
} from '../../util/platform/platformCompatibility.js';

type EmulsifyProjectConfigurationWithSystem = EmulsifyProjectConfiguration & {
  system: NonNullable<EmulsifyProjectConfiguration['system']>;
  variant: NonNullable<EmulsifyProjectConfiguration['variant']>;
};

export type EmulsifySystemContext = {
  emulsifyConfig: EmulsifyProjectConfigurationWithSystem;
  systemName: string;
  systemConf: EmulsifySystem;
  variantConf: EmulsifyVariant;
};

/**
 * Error thrown when a handler requires an installed Emulsify system, but the
 * current project or cached system state does not satisfy that requirement.
 */
export class EmulsifySystemError extends CliError {
  constructor(message: string) {
    super(message);
    this.name = 'EmulsifySystemError';
  }
}

/**
 * Load and validate the current project's configured Emulsify system and variant.
 *
 * @param actionLabel words describing the handler action for the system requirement guidance, such as "install components".
 *
 * @returns {EmulsifySystemContext} { emulsifyConfig, systemName, systemConf, variantConf } for the configured system and variant.
 *
 * @throws {EmulsifySystemError} if no Emulsify project configuration can be found.
 * @throws {EmulsifySystemError} if the project configuration does not include both a system and variant.
 * @throws {Error} if the configured system repository URL is malformed before a repository name can be parsed.
 * @throws {EmulsifySystemError} if the configured system repository does not contain a parseable repository name.
 * @throws {EmulsifySystemError} if the configured system cannot be cloned or checked out from cache.
 * @throws {EmulsifySystemError} if the cached system configuration cannot be loaded.
 * @throws {EmulsifySystemError} if the configured variant cannot be found within the cached system configuration.
 *
 * @example
 * const { systemConf, variantConf } = await withEmulsifySystem('install components');
 */
export async function withEmulsifySystem(
  actionLabel: string,
): Promise<EmulsifySystemContext> {
  const emulsifyConfig = await getEmulsifyConfig();
  if (!emulsifyConfig) {
    throw new EmulsifySystemError(
      'No Emulsify project detected. You must run this command within an existing Emulsify project. For more information about creating Emulsify projects, run "emulsify init --help"',
    );
  }

  const systemReference = emulsifyConfig.system;
  const variantReference = emulsifyConfig.variant;
  if (!systemReference || !variantReference) {
    throw new EmulsifySystemError(
      `You must select and install a system before you can ${actionLabel}. To see a list of out-of-the-box systems, run "emulsify system list". You can install a system by running "emulsify system install [name]"`,
    );
  }

  const systemName = getGitRepoNameFromUrl(systemReference.repository);
  if (!systemName) {
    throw new EmulsifySystemError(
      `The system specified in your project configuration is not valid. Please make sure your ${EMULSIFY_PROJECT_CONFIG_FILE} file contains a system.repository value that is a valid git url`,
    );
  }

  try {
    await cloneIntoCache('systems', [systemName])(systemReference);
  } catch {
    throw new EmulsifySystemError(
      'The system specified in your project configuration is not clone-able, or has an invalid checkout value.',
    );
  }

  const systemConf: EmulsifySystem | void = await getJsonFromCachedFile(
    'systems',
    [systemName],
    systemReference.checkout,
    EMULSIFY_SYSTEM_CONFIG_FILE,
  );

  if (!systemConf) {
    throw new EmulsifySystemError(
      `Unable to load configuration for the ${systemName} system. Please make sure the system is installed.`,
    );
  }

  const variantName = variantReference.platform;
  const exactVariantSelection = selectExactPlatformVariant(
    systemConf.variants,
    variantName,
  );
  const compatibleVariantSelection = selectCompatiblePlatformVariant(
    systemConf.variants,
    emulsifyConfig.project.platform,
  );
  const variantConf =
    exactVariantSelection.status === 'selected'
      ? exactVariantSelection.variant
      : compatibleVariantSelection.status === 'selected'
        ? compatibleVariantSelection.variant
        : undefined;
  if (!variantConf) {
    throw new EmulsifySystemError(
      `Unable to find configuration for the variant ${variantName} within the system ${systemName}.`,
    );
  }

  return {
    emulsifyConfig: {
      ...emulsifyConfig,
      system: systemReference,
      variant: variantReference,
    },
    systemName,
    systemConf,
    variantConf,
  };
}

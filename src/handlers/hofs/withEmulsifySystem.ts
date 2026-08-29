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
import log from '../../lib/log.js';
import cloneIntoCache from '../../util/cache/cloneIntoCache.js';
import getJsonFromCachedFile from '../../util/cache/getJsonFromCachedFile.js';
import getGitRepoNameFromUrl from '../../util/getGitRepoNameFromUrl.js';
import getEmulsifyConfig from '../../util/project/getEmulsifyConfig.js';
import {
  selectCompatiblePlatformVariant,
  selectExactPlatformVariant,
  tryParsePlatformExpression,
} from '../../util/platform/platformCompatibility.js';
import validateSystemConfig from '../../util/system/validateSystemConfig.js';

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

type PreparedCachedSystemConfig = {
  systemConfig: unknown;
  skippedPlatformExpressions: string[];
};

function prepareCachedSystemConfig(
  systemConfig: unknown,
): PreparedCachedSystemConfig {
  if (systemConfig === null || typeof systemConfig !== 'object') {
    return { systemConfig, skippedPlatformExpressions: [] };
  }

  const variants = (systemConfig as { variants?: unknown }).variants;
  if (!Array.isArray(variants)) {
    return { systemConfig, skippedPlatformExpressions: [] };
  }

  const skippedPlatformExpressions = new Set<string>();
  const supportedVariants = variants.filter((variant: unknown) => {
    if (variant === null || typeof variant !== 'object') {
      return true;
    }

    const platform = (variant as { platform?: unknown }).platform;
    if (typeof platform !== 'string') {
      return true;
    }

    if (tryParsePlatformExpression(platform)) {
      return true;
    }

    skippedPlatformExpressions.add(platform);
    return false;
  });

  return {
    systemConfig:
      skippedPlatformExpressions.size === 0
        ? systemConfig
        : { ...systemConfig, variants: supportedVariants },
    skippedPlatformExpressions: [...skippedPlatformExpressions],
  };
}

function formatPlatformExpressions(expressions: readonly string[]): string {
  return expressions.map((expression) => JSON.stringify(expression)).join(', ');
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
 * @throws {EmulsifySystemError} if the cached system configuration cannot be loaded or validated.
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

  const loadedSystemConf: unknown = await getJsonFromCachedFile({
    bucket: 'systems',
    itemPath: [systemName],
    repository: systemReference.repository,
    checkout: systemReference.checkout,
    fileName: EMULSIFY_SYSTEM_CONFIG_FILE,
  });

  if (!loadedSystemConf) {
    throw new EmulsifySystemError(
      `Unable to load configuration for the ${systemName} system. Please make sure the system is installed.`,
    );
  }

  let validation = await validateSystemConfig(loadedSystemConf);
  const { systemConfig, skippedPlatformExpressions } =
    prepareCachedSystemConfig(loadedSystemConf);
  if (skippedPlatformExpressions.length > 0) {
    validation = await validateSystemConfig(systemConfig);
  }

  if (!validation.valid) {
    throw new EmulsifySystemError(
      `The cached copy of the ${systemName} system is invalid. Run "emulsify cache clear" and retry this command to re-clone it. To reinstall the system instead, remove the existing system and variant entries from project.emulsify.json, then re-run "emulsify system install".`,
    );
  }

  const systemConf = validation.systemConfig;
  if (skippedPlatformExpressions.length > 0) {
    log(
      'warn',
      `Skipped variants in the ${systemName} system with platform expressions this CLI does not understand: ${formatPlatformExpressions(skippedPlatformExpressions)}. The system may require a newer Emulsify CLI or contain a typo.`,
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
    const skippedPlatformMessage =
      skippedPlatformExpressions.length > 0
        ? ` The CLI did not understand these variant platform expressions: ${formatPlatformExpressions(skippedPlatformExpressions)}. The system may require a newer Emulsify CLI or contain a typo.`
        : '';
    throw new EmulsifySystemError(
      `Unable to find configuration for the variant ${variantName} within the system ${systemName}.${skippedPlatformMessage}`,
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

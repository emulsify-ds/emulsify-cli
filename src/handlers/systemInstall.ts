import type { InstallSystemHandlerOptions } from '@emulsify-cli/handlers';
import type { GitCloneOptions } from '@emulsify-cli/git';
import type {
  EmulsifyProjectConfiguration,
  EmulsifySystem,
  Platform,
} from '@emulsify-cli/config';

import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { select } from '@inquirer/prompts';
import {
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_SYSTEM_CONFIG_FILE,
  EMULSIFY_PROJECT_HOOK_FOLDER,
  EMULSIFY_PROJECT_HOOK_SYSTEM_INSTALL,
} from '../lib/constants.js';
import log from '../lib/log.js';
import CliError from '../lib/CliError.js';
import getAvailableSystems from '../util/system/getAvailableSystems.js';
import getGitRepoNameFromUrl from '../util/getGitRepoNameFromUrl.js';
import cloneIntoCache from '../util/cache/cloneIntoCache.js';
import getCachedItemCheckout from '../util/cache/getCachedItemCheckout.js';
import getRepositoryLatestTag from '../util/getRepositoryLatestTag.js';
import installComponentFromCache from '../util/project/installComponentFromCache.js';
import installGeneralAssetsFromCache from '../util/project/installGeneralAssetsFromCache.js';
import getJsonFromCachedFile from '../util/cache/getJsonFromCachedFile.js';
import setEmulsifyConfig from '../util/project/setEmulsifyConfig.js';
import getEmulsifyConfig from '../util/project/getEmulsifyConfig.js';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath.js';
import executeScript from '../util/fs/executeScript.js';
import writeToJsonFile from '../util/fs/writeToJsonFile.js';
import {
  getVariantPlatformExpressions,
  isPlatform,
  selectCompatiblePlatformVariant,
  selectExactPlatformVariant,
} from '../util/platform/platformCompatibility.js';

const CREATE_NEW_SYSTEM_CHOICE = 'create a new system';
const CANCEL_SYSTEM_INSTALL_CHOICE = 'cancel';
const SYSTEM_INSTALL_ERROR =
  'Unable to download specified system. You must either specify a valid name of an out-of-the-box system using the --name flag, or specify a valid repository and branch/tag/commit using the --repository and --checkout flags.';

async function loadSchemas() {
  const [{ default: systemSchema }, { default: variantSchema }] =
    await Promise.all([
      import('../schemas/system.json', { with: { type: 'json' } }),
      import('../schemas/variant.json', { with: { type: 'json' } }),
    ]);

  return { systemSchema, variantSchema };
}

/**
 * Helper function that uses InstallSystemHandlerOptions input to determine what
 * system should be installed, if any.
 *
 * @param options InstallSystemHandlerOptions object.
 *
 * @returns GitCloneOptions or void, if no valid system could be found using the input.
 *
 * @throws {CliError} if an explicit repository URL is invalid.
 */
export async function getSystemRepoInfo(
  name: string | void,
  { repository, checkout }: InstallSystemHandlerOptions,
): Promise<(GitCloneOptions & { name: string }) | void> {
  // If a repository and checkout were specified, use that to return system information.
  if (repository && checkout) {
    try {
      const repoName = getGitRepoNameFromUrl(repository);
      if (repoName) {
        return {
          name: repoName,
          repository,
          checkout,
        };
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new CliError(error.message);
      } else {
        throw error;
      }
    }
  }

  // If a name was provided, attempt to find an out-of-the-box system with
  // the name, and use it to return system information.
  if (name) {
    const system = (await getAvailableSystems()).find((s) => s.name === name);
    if (system) {
      return {
        name,
        repository: system.repository,
        checkout: system.checkout,
      };
    }
  }
}

async function promptForSystemInstallChoice(): Promise<string | void> {
  const availableSystems = await getAvailableSystems();
  const selectedSystem = await select({
    message: 'Choose a component system:',
    choices: [
      ...availableSystems.map(({ name }) => name),
      CREATE_NEW_SYSTEM_CHOICE,
      CANCEL_SYSTEM_INSTALL_CHOICE,
    ],
  });

  if (selectedSystem === CANCEL_SYSTEM_INSTALL_CHOICE) {
    log('info', 'System install cancelled.');
    return;
  }

  return selectedSystem;
}

function getVariantSelectionErrorMessage(
  systemConf: EmulsifySystem,
  projectPlatform: Platform,
  requestedVariant: string | void,
): string {
  const availableVariants =
    getVariantPlatformExpressions(systemConf.variants).join(', ') || 'none';
  const requestedVariantMessage = requestedVariant
    ? ` matching "${requestedVariant}"`
    : '';

  return `Unable to find a compatible variant${requestedVariantMessage} for project platform "${projectPlatform}" within the system (${systemConf.name}). Available variant platform expressions: ${availableVariants}.`;
}

async function promptForVariantChoice<T extends { platform: string }>(
  variants: T[],
  projectPlatform: Platform,
  systemName: string,
): Promise<T> {
  const selectedPlatform = await select({
    message: `Choose a ${systemName} variant for project platform "${projectPlatform}":`,
    choices: variants.map(({ platform }) => platform),
  });
  return variants.find(({ platform }) => platform === selectedPlatform) as T;
}

async function resolveSystemVariant(
  systemConf: EmulsifySystem,
  projectPlatform: Platform,
  requestedVariant: string | void,
) {
  if (requestedVariant) {
    const selection = selectExactPlatformVariant(
      systemConf.variants,
      requestedVariant,
    );
    if (selection.status === 'selected') {
      return selection.variant;
    }

    if (selection.status === 'ambiguous' && process.stdin.isTTY === true) {
      return await promptForVariantChoice(
        selection.variants,
        projectPlatform,
        systemConf.name,
      );
    }

    throw new CliError(
      getVariantSelectionErrorMessage(
        systemConf,
        projectPlatform,
        requestedVariant,
      ),
    );
  }

  const selection = selectCompatiblePlatformVariant(
    systemConf.variants,
    projectPlatform,
  );
  if (selection.status === 'selected') {
    return selection.variant;
  }

  if (selection.status === 'ambiguous') {
    if (process.stdin.isTTY === true) {
      return await promptForVariantChoice(
        selection.variants,
        projectPlatform,
        systemConf.name,
      );
    }

    const compatibleVariants = selection.variants
      .map(({ platform }) => platform)
      .join(', ');
    throw new CliError(
      `Multiple compatible variants were found for project platform "${projectPlatform}" within the system (${systemConf.name}): ${compatibleVariants}. Run this command in an interactive terminal or specify a variant.`,
    );
  }

  throw new CliError(
    getVariantSelectionErrorMessage(systemConf, projectPlatform, undefined),
  );
}

function getCustomSystemPlatform(platform: string): Platform {
  return isPlatform(platform) ? platform : 'none';
}

function buildCustomSystemDefinition(platform: Platform): EmulsifySystem {
  return {
    name: 'custom-system',
    homepage: 'https://example.com/custom-system',
    repository: 'https://github.com/example/custom-system.git',
    structure: [
      {
        name: 'components',
        description: 'Project component library',
      },
    ],
    variants: [
      {
        platform,
        structureImplementations: [
          {
            name: 'components',
            directory: './src/components',
          },
        ],
        components: [],
      },
    ],
  };
}

async function scaffoldCustomSystemDefinition(
  projectConfig: EmulsifyProjectConfiguration,
): Promise<void> {
  const projectConfigPath = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);
  if (!projectConfigPath) {
    throw new CliError(
      `Unable to find ${EMULSIFY_PROJECT_CONFIG_FILE}. Run this command from within an Emulsify project.`,
    );
  }

  const systemConfigPath = join(
    dirname(projectConfigPath),
    EMULSIFY_SYSTEM_CONFIG_FILE,
  );
  if (existsSync(systemConfigPath)) {
    throw new CliError(
      `${EMULSIFY_SYSTEM_CONFIG_FILE} already exists. Remove or rename it before creating a new custom system definition.`,
    );
  }

  await writeToJsonFile<EmulsifySystem>(
    systemConfigPath,
    buildCustomSystemDefinition(
      getCustomSystemPlatform(projectConfig.project.platform),
    ),
  );

  log('success', `Created ${EMULSIFY_SYSTEM_CONFIG_FILE}.`);
  log(
    'info',
    'Add your real system name, repository, structures, variants, and components before using this system to install or generate components.',
  );
}

/**
 * Handler for the `system install` command.
 *
 * @param name optional string containing the name of the system that should be installed.
 * @param options InstallSystemHandlerOptions object containing configuration for the installation.
 * @param options.repository optional string containing a git URL to a repository containing the system that should be installed.
 * @param options.checkout optional string containing the commit/branch/tag of the system that should be used.
 *
 * @throws {CliError} if the project cannot install the requested system.
 */
export default async function systemInstall(
  name: string | void,
  options: InstallSystemHandlerOptions,
): Promise<void> {
  // Attempt to load emulsify config. If none is found, this is not an Emulsify project.
  const projectConfig = await getEmulsifyConfig();
  if (!projectConfig) {
    throw new CliError(
      'No Emulsify project detected. You must run this command within an existing Emulsify project. For more information about creating Emulsify projects, run "emulsify init --help"',
    );
  }

  if (projectConfig.system) {
    throw new CliError(
      'You have already selected a system within this Emulsify project.',
    );
  }

  // Attempt to load system information, and exit with a log message
  // if a valid system was not found.
  let selectedName = name;
  if (!selectedName && !options.repository && process.stdin.isTTY === true) {
    selectedName = await promptForSystemInstallChoice();
    if (!selectedName) {
      return;
    }

    if (selectedName === CREATE_NEW_SYSTEM_CHOICE) {
      await scaffoldCustomSystemDefinition(projectConfig);
      return;
    }
  }

  const repo = await getSystemRepoInfo(selectedName, options);
  if (!repo) {
    throw new CliError(SYSTEM_INSTALL_ERROR);
  }

  // Attempt to get latest tag if no branch was supplied.
  if (repo.checkout === undefined) {
    repo.checkout = await getRepositoryLatestTag(repo.repository);
  }

  // Clone the system into the cache.
  await cloneIntoCache('systems', [repo.name])({
    repository: repo.repository,
    checkout: repo.checkout,
  });

  // Load the system configuration file.
  const systemConf: EmulsifySystem | void = await getJsonFromCachedFile({
    bucket: 'systems',
    itemPath: [repo.name],
    repository: repo.repository,
    checkout: repo.checkout,
    fileName: EMULSIFY_SYSTEM_CONFIG_FILE,
  });

  // If there is no configuration file within the system, error.
  if (!systemConf) {
    throw new CliError(
      `The system you attempted to install (${repo.name}) is invalid, as it does not contain a valid configuration file.`,
    );
  }

  // Validate the system configuration file.
  try {
    const { systemSchema, variantSchema } = await loadSchemas();
    const ajv = new Ajv();
    // This is unfortunate...
    // @ts-ignore The ajv-formats typing is bad :(
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
    throw new CliError(
      `The system install failed due to the validation errors reported above. Please fix the the errors in the "${systemConf.name}" configuration and try again.`,
    );
  }

  const projectPlatform = projectConfig.project.platform;
  if (!isPlatform(projectPlatform)) {
    throw new CliError(
      'Unable to determine a variant for the specified system. Please either pass in a valid variant using the --variant flag.',
    );
  }

  // @TODO: clone variants into their own cache bucket if a reference is provided.
  const variantConf = await resolveSystemVariant(
    systemConf,
    projectPlatform,
    options.variant,
  );

  // Update emulsify project config.
  try {
    // If no checkout was passed along, and the default checkout was used, fetch it
    // it can be stored in the project config.
    let checkout = repo.checkout;
    if (!checkout) {
      checkout = await getCachedItemCheckout({
        bucket: 'systems',
        itemPath: [repo.name],
        repository: repo.repository,
        checkout: repo.checkout,
      });
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
    throw new CliError('Unable to update your Emulsify project configuration.');
  }

  try {
    // Install all required components or all available components.
    const componentsList = variantConf.components;
    const requiredComponents = componentsList.filter(
      ({ required }) => required === true,
    );

    for (const component of options.all ? componentsList : requiredComponents) {
      await installComponentFromCache(
        systemConf,
        variantConf,
        component.name,
        true,
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
          EMULSIFY_PROJECT_HOOK_SYSTEM_INSTALL,
        )
      : undefined;
    if (hookPath && existsSync(hookPath)) {
      await executeScript(hookPath);
    }
  } catch (e) {
    throw new CliError(
      `Unable to install system assets and/or required components: ${String(e)}`,
    );
  }

  return log(
    'success',
    `Successfully installed the ${systemConf.name} system using the ${variantConf.platform} variant.`,
  );
}

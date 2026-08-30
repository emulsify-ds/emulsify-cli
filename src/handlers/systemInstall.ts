import type { InstallSystemHandlerOptions } from '@emulsify-cli/handlers';
import type { GitCloneOptions } from '@emulsify-cli/git';
import type {
  EmulsifySystem,
  EmulsifyVariant,
  Platform,
} from '@emulsify-cli/config';
import type { EmulsifySystemReference } from '@emulsify-cli/internal';

import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { confirm, input, select, Separator } from '@inquirer/prompts';
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
import validateSystemConfig from '../util/system/validateSystemConfig.js';
import {
  getVariantPlatformExpressions,
  isPlatform,
  parsePlatformExpression,
  rankPlatformVariants,
  selectCompatiblePlatformVariant,
  selectExactPlatformVariant,
} from '../util/platform/platformCompatibility.js';
import { runPrompt } from '../util/prompt/index.js';
import buildSystemInstallPlan, {
  type SystemInstallPlan,
} from '../util/system/buildSystemInstallPlan.js';

const MISSING_SYSTEM_SOURCE_ERROR =
  'No component system source was provided. Pass a built-in system name as the positional argument, or pass both --repository <repository> and --checkout <branch, tag, or commit>.';
const INVALID_SYSTEM_SOURCE_ERROR =
  'Unable to resolve the requested component system source. Pass a valid built-in system name as the positional argument, or pass both --repository <repository> and --checkout <branch, tag, or commit>.';
const WIZARD_TITLE = 'Install a component system';

type BuiltInSourceChoice = {
  kind: 'built-in';
  reference: EmulsifySystemReference;
};

type CustomSourceChoice = {
  kind: 'custom';
};

type CancelSourceChoice = {
  kind: 'cancel';
};

type SystemSourceChoice =
  BuiltInSourceChoice | CustomSourceChoice | CancelSourceChoice;

function formatWizardHeader(step: number, total?: number): string {
  const progress = total ? `Step ${step} of ${total}` : `Step ${step}`;
  return `${WIZARD_TITLE.padEnd(60)}${progress}`;
}

function showWizardStep(step: number, total?: number): void {
  log('info', formatWizardHeader(step, total));
}

function formatChoice(label: string, description: string): string {
  return `${label.padEnd(22)}${description}`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatSystemLabel(name: string): string {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatPlatformLabel(expression: string): string {
  const platforms = parsePlatformExpression(expression).map((platform) => {
    if (platform === 'none') {
      return 'Platform-neutral';
    }
    if (platform === 'drupal') {
      return 'Drupal';
    }
    return 'WordPress';
  });

  if (platforms.length <= 1) {
    return platforms[0] || expression;
  }

  return `${platforms.slice(0, -1).join(', ')} and ${platforms.at(-1)}`;
}

function formatRepositorySource(repository: string): string {
  try {
    const url = new URL(repository);
    if (url.protocol === 'file:') {
      return decodeURIComponent(url.pathname).replace(/\.git\/?$/, '');
    }
    if (url.host) {
      return `${url.host}${url.pathname}`.replace(/\.git\/?$/, '');
    }
  } catch {
    // Local paths and SCP-style Git URLs are formatted below.
  }

  const scpStyle = repository.match(/^(?:[^@\s]+@)?([^:]+):(.+)$/);
  if (scpStyle) {
    return `${scpStyle[1]}/${scpStyle[2]}`.replace(/\.git\/?$/, '');
  }

  return repository.replace(/\.git\/?$/, '');
}

function validateRepositoryInput(repository: string): true | string {
  try {
    return getGitRepoNameFromUrl(repository.trim())
      ? true
      : 'Enter a Git repository with a recognizable name.';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Helper function that uses InstallSystemHandlerOptions input to determine what
 * system should be installed, if any.
 *
 * @param options InstallSystemHandlerOptions object.
 *
 * @returns GitCloneOptions or void, if no valid system could be found using the input.
 *
 * @throws {CliError} if custom repository options are incomplete or invalid.
 */
export async function getSystemRepoInfo(
  name: string | void,
  { repository, checkout }: InstallSystemHandlerOptions,
): Promise<(GitCloneOptions & { name: string }) | void> {
  if (repository && !checkout) {
    throw new CliError(
      'The --repository option requires --checkout when installing a custom system.',
    );
  }

  if (checkout && !repository) {
    throw new CliError(
      'The --checkout option requires --repository when installing a custom system.',
    );
  }

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

async function promptForSystemInstallChoice(): Promise<
  BuiltInSourceChoice | CustomSourceChoice | void
> {
  const selectedSource = await runPrompt<SystemSourceChoice>({
    prompt: async () => {
      const availableSystems = await getAvailableSystems();
      showWizardStep(1);
      return select<SystemSourceChoice>({
        message: 'Which system?',
        choices: [
          ...availableSystems.map((reference) => ({
            name: formatChoice(reference.label, reference.description),
            value: { kind: 'built-in', reference } as BuiltInSourceChoice,
            short: reference.label,
          })),
          {
            name: formatChoice(
              'Bring your own',
              'Install from a git repository you control.',
            ),
            value: { kind: 'custom' } as CustomSourceChoice,
            short: 'Bring your own',
          },
          new Separator('────────────'),
          {
            name: 'Cancel',
            value: { kind: 'cancel' } as CancelSourceChoice,
          },
        ],
      });
    },
    nonInteractive: { error: MISSING_SYSTEM_SOURCE_ERROR },
  });

  if (selectedSource.kind === 'cancel') {
    log('info', 'System install cancelled.');
    return;
  }

  return selectedSource;
}

async function promptForCustomRepository(
  step: number,
  total: number,
): Promise<string> {
  return runPrompt({
    prompt: () => {
      showWizardStep(step, total);
      return input({
        message: 'Repository URL or local path:',
        validate: validateRepositoryInput,
      });
    },
    nonInteractive: {
      error:
        'A custom repository is required in non-interactive mode. Pass --repository <repository>.',
    },
  });
}

async function promptForCustomCheckout(
  step: number,
  total: number,
): Promise<string> {
  return runPrompt({
    prompt: () => {
      showWizardStep(step, total);
      return input({
        message: 'Checkout (branch, tag, or commit):',
        validate: (value) =>
          value.trim().length > 0 || 'Enter a branch, tag, or commit.',
      });
    },
    nonInteractive: {
      error:
        'A custom checkout is required in non-interactive mode. Pass --checkout <branch, tag, or commit>.',
    },
  });
}

function getVariantSelectionErrorMessage(
  systemConf: EmulsifySystem,
  projectPlatform: Platform,
  requestedVariant: string | void,
): string {
  const availableVariants = getVariantPlatformExpressions(systemConf.variants);
  const availableComponentSets = availableVariants.length
    ? availableVariants
        .map(
          (expression) => `${formatPlatformLabel(expression)} (${expression})`,
        )
        .join(', ')
    : 'none';

  if (requestedVariant) {
    return `The ${formatSystemLabel(systemConf.name)} system has no component set matching --variant "${requestedVariant}". Available component sets: ${availableComponentSets}.`;
  }

  return `The ${formatSystemLabel(systemConf.name)} system has no component set that works with this ${formatPlatformLabel(projectPlatform)} project. Available component sets: ${availableComponentSets}. Pass --variant <platform-expression> to choose one explicitly.`;
}

function getVariantPromptErrorMessage(systemConf: EmulsifySystem): string {
  const availableComponentSets = getVariantPlatformExpressions(
    systemConf.variants,
  )
    .map((expression) => `${formatPlatformLabel(expression)} (${expression})`)
    .join(', ');

  return `A component set choice is required in non-interactive mode. Pass --variant <platform-expression>. Available component sets: ${availableComponentSets || 'none'}.`;
}

async function promptForVariantChoice(
  variants: EmulsifyVariant[],
  projectPlatform: Platform,
  systemName: string,
  nonInteractiveError: string,
  wizardStep?: { step: number; total: number },
): Promise<EmulsifyVariant> {
  const rankedVariants = rankPlatformVariants(variants, projectPlatform);
  const recommendation = selectCompatiblePlatformVariant(
    variants,
    projectPlatform,
  );
  const recommendedVariants = new Set(
    recommendation.status === 'selected'
      ? [recommendation.variant]
      : recommendation.status === 'ambiguous'
        ? recommendation.variants
        : [],
  );
  const defaultChoice = rankedVariants.find(({ variant }) =>
    recommendedVariants.has(variant),
  )?.index;

  const selectedIndex = await runPrompt({
    prompt: () => {
      if (wizardStep) {
        showWizardStep(wizardStep.step, wizardStep.total);
      }
      return select({
        message: wizardStep
          ? 'Which component set?'
          : `Which ${formatSystemLabel(systemName)} component set should be used?`,
        choices: rankedVariants.map(({ variant, index }) => {
          const componentCount = variant.components.length;
          const requiredCount = variant.components.filter(
            ({ required }) => required === true,
          ).length;
          const counts = ` · ${pluralize(componentCount, 'component')}, ${pluralize(requiredCount, 'required component')}`;
          const recommended = recommendedVariants.has(variant)
            ? ' — Recommended'
            : '';

          return {
            name: `${formatPlatformLabel(variant.platform)} (${variant.platform})${recommended}${counts}`,
            value: index,
            short: formatPlatformLabel(variant.platform),
          };
        }),
        default: defaultChoice,
      });
    },
    nonInteractive: { error: nonInteractiveError },
  });
  return variants[selectedIndex];
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

    if (selection.status === 'ambiguous') {
      throw new CliError(
        `The ${formatSystemLabel(systemConf.name)} system defines more than one component set for --variant "${requestedVariant}". Ask the system maintainer to give each component set a unique platform expression.`,
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
    const compatibleComponentSets = selection.variants
      .map(({ platform }) => `${formatPlatformLabel(platform)} (${platform})`)
      .join(', ');
    return await promptForVariantChoice(
      selection.variants,
      projectPlatform,
      systemConf.name,
      `More than one ${formatSystemLabel(systemConf.name)} component set works equally well with this ${formatPlatformLabel(projectPlatform)} project: ${compatibleComponentSets}. Run this command in an interactive terminal, or pass --variant <platform-expression>.`,
    );
  }

  throw new CliError(
    getVariantSelectionErrorMessage(systemConf, projectPlatform, undefined),
  );
}

async function promptForInstallScope(
  variant: EmulsifyVariant,
  step: number,
  total: number,
): Promise<boolean> {
  const requiredComponentCount = variant.components.filter(
    ({ required }) => required === true,
  ).length;

  return runPrompt({
    prompt: () => {
      showWizardStep(step, total);
      return select({
        message: 'How much do you want to install?',
        choices: [
          {
            name: formatChoice(
              'Essentials only',
              pluralize(requiredComponentCount, 'required component'),
            ),
            value: false,
            short: 'Essentials only',
          },
          {
            name: formatChoice(
              'Everything',
              pluralize(variant.components.length, 'component'),
            ),
            value: true,
            short: 'Everything',
          },
        ],
        default: false,
      });
    },
    nonInteractive: {
      error:
        'Install scope is required in non-interactive mode. Pass --all to install every component, or provide a system name to install required components only.',
    },
  });
}

function formatDestinationList(destinations: string[]): string {
  return destinations.length > 0 ? destinations.join(', ') : 'none';
}

function formatDirectoryDestinations(destinations: string[]): string {
  return formatDestinationList(
    destinations.map((destination) =>
      destination === '.' || destination.endsWith('/')
        ? destination
        : `${destination}/`,
    ),
  );
}

export function formatSystemInstallReview(
  systemLabel: string,
  repository: string,
  checkout: string | void,
  variant: EmulsifyVariant,
  plan: SystemInstallPlan,
  installAll: boolean,
): string {
  const continuationIndent = '                 ';
  const installRows = [
    `${pluralize(plan.components.length, 'component')}  →  ${formatDirectoryDestinations(plan.componentParentDestinations)}`,
  ];

  if (plan.directoryAssetCount > 0) {
    installRows.push(
      `${pluralize(plan.directoryAssetCount, 'asset folder')}  →  ${formatDestinationList(plan.directoryAssetDestinations)}`,
    );
  }

  if (plan.fileAssetCount > 0) {
    installRows.push(
      `${pluralize(plan.fileAssetCount, 'asset file')}  →  ${formatDestinationList(plan.fileAssetDestinations)}`,
    );
  }

  return [
    `  System         ${systemLabel}${checkout ? `  ·  ${checkout}` : ''}`,
    `  Source         ${formatRepositorySource(repository)}`,
    `  Component set  ${formatPlatformLabel(variant.platform)}`,
    `  Scope          ${installAll ? 'Everything' : 'Essentials only'}`,
    `  Will install   ${installRows[0]}`,
    ...installRows.slice(1).map((row) => `${continuationIndent}${row}`),
  ].join('\n');
}

async function promptForInstallConfirmation(
  review: string,
  step: number,
  total: number,
  accept: boolean,
): Promise<boolean> {
  showWizardStep(step, total);
  log('info', `\n${review}\n`);

  return runPrompt({
    prompt: () =>
      confirm({
        message: 'Install now?',
        default: true,
      }),
    nonInteractive: {
      error:
        'Installation confirmation is required in non-interactive mode. Pass --yes to accept the reviewed installation.',
    },
    accept: {
      when: accept,
      value: true,
    },
  });
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
      'This Emulsify project already has a component system configured. Run "emulsify component list" to see what is available. To choose a different system, run "emulsify system detach" first.',
    );
  }

  const guidedInstall = !name && !options.repository && !options.checkout;
  let wizardStep = 1;
  let wizardTotalSteps = 0;
  let systemLabel: string | undefined;
  let repo: (GitCloneOptions & { name: string }) | void;

  if (guidedInstall) {
    const source = await promptForSystemInstallChoice();
    if (!source) {
      return;
    }

    if (source.kind === 'built-in') {
      const { reference } = source;
      systemLabel = reference.label;
      repo = {
        name: reference.name,
        repository: reference.repository,
        checkout: reference.checkout,
      };
      wizardTotalSteps = 2 + (options.variant ? 0 : 1) + (options.all ? 0 : 1);
    } else {
      wizardTotalSteps = 4 + (options.variant ? 0 : 1) + (options.all ? 0 : 1);
      const repository = (
        await promptForCustomRepository(++wizardStep, wizardTotalSteps)
      ).trim();
      const checkout = (
        await promptForCustomCheckout(++wizardStep, wizardTotalSteps)
      ).trim();
      repo = await getSystemRepoInfo(undefined, {
        ...options,
        repository,
        checkout,
      });
    }
  } else {
    repo = await getSystemRepoInfo(name, options);
  }

  if (!repo) {
    throw new CliError(INVALID_SYSTEM_SOURCE_ERROR);
  }

  if (guidedInstall) {
    log(
      'info',
      `Loading ${systemLabel || 'the component system'} from ${formatRepositorySource(repo.repository)}. This may take a moment…`,
    );
  }

  // Attempt to get latest tag if no branch was supplied.
  if (repo.checkout === undefined) {
    repo.checkout = await getRepositoryLatestTag(repo.repository);
  }

  // Clone the system into the cache.
  await cloneIntoCache('systems', [repo.name], { refresh: true })({
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
    const validation = await validateSystemConfig(systemConf);
    if (!validation.valid) {
      throw validation.errors;
    }
  } catch (e) {
    // We're logging to the console here instead of our normal logging mechanism
    // in order to have more readable output from the AJV validation.
    console.error('System configuration errors:', e);
    throw new CliError(
      `The system install failed due to the validation errors reported above. Please fix the errors in the "${systemConf.name}" configuration and try again.`,
    );
  }

  if (systemConf.name !== repo.name) {
    throw new CliError(
      `The repository was cached as "${repo.name}", but system.emulsify.json declares the system name "${systemConf.name}". These names must match so files can be installed safely. Rename the repository or update the system name, then retry.`,
    );
  }

  if (!repo.checkout) {
    repo.checkout = await getCachedItemCheckout({
      bucket: 'systems',
      itemPath: [repo.name],
      repository: repo.repository,
      checkout: repo.checkout,
    });
  }
  if (!repo.checkout) {
    throw new CliError(
      'Unable to determine which system checkout was loaded. Retry with --checkout <branch, tag, or commit>.',
    );
  }

  systemLabel ||= formatSystemLabel(systemConf.name);
  if (guidedInstall) {
    log('info', `Loaded ${systemLabel}  ·  ${repo.checkout}.`);
  }

  const projectPlatform = projectConfig.project.platform;
  if (!isPlatform(projectPlatform)) {
    throw new CliError(
      'This project does not declare a supported platform. Set project.platform in project.emulsify.json to none, drupal, or wordpress before installing a component system.',
    );
  }

  // @TODO: clone variants into their own cache bucket if a reference is provided.
  let variantConf: EmulsifyVariant;
  if (guidedInstall && !options.variant) {
    const compatibility = selectCompatiblePlatformVariant(
      systemConf.variants,
      projectPlatform,
    );
    if (compatibility.status === 'none') {
      throw new CliError(
        getVariantSelectionErrorMessage(systemConf, projectPlatform, undefined),
      );
    }

    variantConf = await promptForVariantChoice(
      systemConf.variants || [],
      projectPlatform,
      systemConf.name,
      getVariantPromptErrorMessage(systemConf),
      { step: ++wizardStep, total: wizardTotalSteps },
    );
  } else {
    variantConf = await resolveSystemVariant(
      systemConf,
      projectPlatform,
      options.variant,
    );
  }

  const installAll =
    guidedInstall && !options.all
      ? await promptForInstallScope(variantConf, ++wizardStep, wizardTotalSteps)
      : options.all === true;
  let componentsToInstall = installAll
    ? variantConf.components
    : variantConf.components.filter(({ required }) => required === true);

  if (guidedInstall) {
    const projectConfigPath = findFileInCurrentPath(
      EMULSIFY_PROJECT_CONFIG_FILE,
    );
    if (!projectConfigPath) {
      throw new CliError(
        'Unable to find the Emulsify project configuration for the installation review.',
      );
    }

    const plan = buildSystemInstallPlan(
      systemConf,
      variantConf,
      installAll,
      projectConfigPath,
    );
    componentsToInstall = plan.components;
    const confirmed = await promptForInstallConfirmation(
      formatSystemInstallReview(
        systemLabel,
        repo.repository,
        repo.checkout,
        variantConf,
        plan,
        installAll,
      ),
      ++wizardStep,
      wizardTotalSteps,
      options.yes === true,
    );
    if (!confirmed) {
      log('info', 'System install cancelled. No project files were changed.');
      return;
    }
  }

  // Update emulsify project config.
  try {
    await setEmulsifyConfig({
      system: {
        repository: repo.repository,
        checkout: repo.checkout,
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
    for (const component of componentsToInstall) {
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
    const projectConfigPath = findFileInCurrentPath(
      EMULSIFY_PROJECT_CONFIG_FILE,
    );
    const hookPath = projectConfigPath
      ? join(
          dirname(projectConfigPath),
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
    guidedInstall
      ? `Successfully installed the ${systemLabel} system using the ${formatPlatformLabel(variantConf.platform)} component set.`
      : `Successfully installed the ${systemConf.name} system using the ${variantConf.platform} variant.`,
  );
}

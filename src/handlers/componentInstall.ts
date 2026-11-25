import { pathExists } from 'fs-extra';
import { confirm, select } from '@clack/prompts';
import log from '../lib/log.js';
import { note } from '../lib/session.js';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../lib/constants.js';
import CliError from '../lib/CliError.js';
import type { InstallComponentHandlerOptions } from '@emulsify-cli/handlers';
import type { EmulsifyVariant } from '@emulsify-cli/config';
import installComponentFromCache, {
  getComponentDestination,
} from '../util/project/installComponentFromCache.js';
import buildComponentDependencyList from '../util/project/buildComponentDependencyList.js';
import {
  applyComponentNpmInstall,
  formatAddedNpmPackages,
  formatComponentNpmInstall,
  prepareComponentNpmInstall,
} from '../util/project/installComponentNpmDependencies.js';
import catchLater from '../util/catchLater.js';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath.js';
import { requireInteractiveTerminal, runPrompt } from '../util/prompt/index.js';
import { withEmulsifySystem } from './hofs/withEmulsifySystem.js';

const INSTALL_ALL_COMPONENTS = Symbol('install all components');
const MISSING_COMPONENT_INSTALL_TARGET_ERROR =
  'Please specify a component to install, or pass --all to install all available components.';
type ComponentInstallSelection = string | typeof INSTALL_ALL_COMPONENTS;

type ComponentInstallPlanItem = {
  name: string;
  isDependency: boolean;
  destination: string;
  exists: boolean;
  action: string;
};

function getDryRunInstallAction(exists: boolean, force: boolean): string {
  if (!exists) {
    return 'copy component';
  }

  if (force) {
    return 'replace existing destination';
  }

  return 'prompt before replacing or skipping';
}

async function buildComponentInstallPlan(
  variant: EmulsifyVariant,
  componentNames: string[],
  rootComponentName: string | undefined,
  force: boolean,
  projectConfigPath: string | void,
): Promise<ComponentInstallPlanItem[]> {
  if (!projectConfigPath) {
    throw new CliError(
      'Unable to find an Emulsify project to preview component installation into.',
    );
  }

  const plan: ComponentInstallPlanItem[] = [];
  for (const componentName of componentNames) {
    const destination = getComponentDestination(
      variant,
      componentName,
      projectConfigPath,
    );
    const exists = await pathExists(destination);

    plan.push({
      name: componentName,
      isDependency: Boolean(
        rootComponentName && componentName !== rootComponentName,
      ),
      destination,
      exists,
      action: getDryRunInstallAction(exists, force),
    });
  }

  return plan;
}

function logComponentInstallDryRun(
  targetLabel: string,
  dependencies: string[],
  plan: ComponentInstallPlanItem[],
  npmPackages: string,
): void {
  const dependencyList =
    dependencies.length > 0
      ? dependencies.map((dependency) => `  - ${dependency}`).join('\n')
      : '  - none';
  const plannedInstalls = plan
    .map((item) =>
      [
        `  - ${item.name}${item.isDependency ? ` (dependency of "${targetLabel}")` : ''}`,
        `    Destination: ${item.destination}`,
        `    Destination exists: ${item.exists ? 'yes' : 'no'}`,
        `    Real run would: ${item.action}`,
      ].join('\n'),
    )
    .join('\n');

  log(
    'info',
    [
      `Dry run: component install "${targetLabel}"`,
      'Dependencies:',
      dependencyList,
      'Planned component installs:',
      plannedInstalls,
      'npm packages:',
      npmPackages,
      'No files were copied, removed, or overwritten.',
    ].join('\n'),
  );
}

/**
 * Handler for the `component install` command.
 *
 * @returns summary shown on the closing line of the session.
 *
 * @throws {CliError} if a component name is missing and all components were not requested.
 * @throws {CliError} if the current project does not have a usable system and variant configuration.
 * @throws {CliError} if the requested component cannot be found.
 * @throws {CliError} if any requested component or dependency fails to install.
 */
export default async function componentInstall(
  name: string | void,
  {
    force,
    all,
    dryRun,
    refresh,
    skipNpm = false,
  }: InstallComponentHandlerOptions,
): Promise<string> {
  let selectedName = name;
  let installAll = all === true;
  const needsSelection = !selectedName?.trim() && !installAll;

  // Preserve the fail-fast non-interactive path before loading or refreshing
  // the cached system. Interactive sessions need that system to build choices.
  if (needsSelection) {
    requireInteractiveTerminal(MISSING_COMPONENT_INSTALL_TARGET_ERROR);
  }

  // Load the configured system and variant before resolving component installs.
  const { systemConf, variantConf } = await withEmulsifySystem(
    'install components',
    { refresh },
  );

  if (needsSelection) {
    const selection = await runPrompt<ComponentInstallSelection>({
      prompt: () =>
        select<ComponentInstallSelection>({
          message: 'Choose a component to install',
          options: [
            // The structure reads as a hint so the list stays scannable when a
            // system offers many components.
            ...variantConf.components.map((component) => ({
              value: component.name,
              label: component.name,
              hint: component.structure,
            })),
            {
              value: INSTALL_ALL_COMPONENTS,
              label: 'Install all available components',
            },
          ],
        }),
      nonInteractive: { error: MISSING_COMPONENT_INSTALL_TARGET_ERROR },
    });

    if (selection === INSTALL_ALL_COMPONENTS) {
      installAll = true;
    } else {
      selectedName = selection;
    }
  }

  const rootComponentName = installAll ? undefined : selectedName || '';
  const componentNames = installAll
    ? variantConf.components.map(({ name }) => name)
    : buildComponentDependencyList(variantConf.components, rootComponentName!);
  if (!installAll && componentNames.length === 0) {
    throw new CliError(
      `Cannot find the definition for component "${rootComponentName}".\n\nRun "emulsify component list" to see the full list.`,
    );
  }

  const projectConfigPath = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);
  const selectedComponents = installAll
    ? variantConf.components
    : componentNames.map((name) =>
        variantConf.components.find((component) => component.name === name)!,
      );
  const npmPlan = await prepareComponentNpmInstall(
    systemConf.name,
    selectedComponents,
    projectConfigPath,
    Boolean(dryRun || skipNpm),
  );

  if (dryRun) {
    const dependencies = installAll
      ? []
      : componentNames.filter((dependency) => dependency !== rootComponentName);
    const plan = await buildComponentInstallPlan(
      variantConf,
      componentNames,
      rootComponentName,
      Boolean(installAll || force),
      projectConfigPath,
    );
    logComponentInstallDryRun(
      rootComponentName ?? 'all components',
      dependencies,
      plan,
      formatComponentNpmInstall(npmPlan, skipNpm ? 'skip' : 'preview'),
    );
    return 'Dry run complete';
  }

  const components: [string, boolean, Promise<void>][] = [];
  for (const componentName of componentNames) {
    const isDependency = !installAll && componentName !== rootComponentName;
    let currentForce = installAll || Boolean(force);
    const destination =
      !installAll && projectConfigPath
        ? getComponentDestination(variantConf, componentName, projectConfigPath)
        : undefined;

    if (destination && (await pathExists(destination)) && !currentForce) {
      const dependencyNote = isDependency
        ? ` (required by "${rootComponentName}")`
        : '';
      const overwriteMessage = `The component "${componentName}"${dependencyNote} already exists.`;
      currentForce = await runPrompt<boolean>({
        prompt: () =>
          confirm({
            message: `${overwriteMessage} Would you like to replace it?`,
            initialValue: false,
          }),
        nonInteractive: {
          error: `${overwriteMessage} Pass --force to replace existing components in non-interactive mode.`,
        },
      });
      if (!currentForce) {
        log('info', `Skipping installation of component "${componentName}".`);
        continue;
      }
    }

    components.push([
      componentName,
      isDependency,
      catchLater(
        installComponentFromCache(
          systemConf,
          variantConf,
          componentName,
          currentForce,
        ),
      ),
    ]);
  }

  const installed: string[] = [];
  const installedDeps: string[] = [];
  const failedDeps: string[] = [];
  const failureMessages: string[] = [];

  for (const [cname, isDependency, promise] of components) {
    try {
      await promise;
      installed.push(cname);
      if (isDependency) {
        installedDeps.push(cname);
      } else {
        log(
          'success',
          `Success! The ${cname} component has been added to your project.`,
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failureMessages.push(`Unable to install ${cname}: ${msg}`);
      if (isDependency) {
        failedDeps.push(cname);
      }
    }
  }

  if (installedDeps.length > 0) {
    const depList = installedDeps.map((d) => `  → ${d}`).join('\n');
    note(depList, 'Also installed');
  }

  if (failedDeps.length > 0) {
    const failList = failedDeps.map((d) => `  → ${d}`).join('\n');
    log(
      'warn',
      `The following dependencies could not be installed:\n${failList}`,
    );
  }

  if (failureMessages.length > 0) {
    throw new CliError(failureMessages.join('\n'));
  }

  const added = await applyComponentNpmInstall(npmPlan, skipNpm);
  const summary =
    installed.length === 0
      ? 'No components were installed'
      : `Installed ${installed.length} component${installed.length === 1 ? '' : 's'}`;
  return added ? `${summary} · ${formatAddedNpmPackages(added)}` : summary;
}

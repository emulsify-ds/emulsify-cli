import { pathExists } from 'fs-extra';
import { confirm } from '@inquirer/prompts';
import log from '../lib/log.js';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../lib/constants.js';
import CliError from '../lib/CliError.js';
import type { InstallComponentHandlerOptions } from '@emulsify-cli/handlers';
import type { EmulsifyVariant } from '@emulsify-cli/config';
import installComponentFromCache, {
  getComponentDestination,
} from '../util/project/installComponentFromCache.js';
import buildComponentDependencyList from '../util/project/buildComponentDependencyList.js';
import catchLater from '../util/catchLater.js';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath.js';
import { withEmulsifySystem } from './hofs/withEmulsifySystem.js';

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
): Promise<ComponentInstallPlanItem[]> {
  const projectConfigPath = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);
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
      'No files were copied, removed, or overwritten.',
    ].join('\n'),
  );
}

/**
 * Handler for the `component install` command.
 *
 * @throws {CliError} if a component name is missing and all components were not requested.
 * @throws {CliError} if the current project does not have a usable system and variant configuration.
 * @throws {CliError} if the requested component cannot be found.
 * @throws {CliError} if any requested component or dependency fails to install.
 */
export default async function componentInstall(
  name: string,
  { force, all, dryRun, refresh }: InstallComponentHandlerOptions,
): Promise<void> {
  if (!name && !all) {
    throw new CliError(
      'Please specify a component to install, or pass --all to install all available components.',
    );
  }

  // Load the configured system and variant before resolving component installs.
  const { systemConf, variantConf } = await withEmulsifySystem(
    'install components',
    { refresh },
  );

  // If all components are to be installed, spawn promises for installing all available components.
  const components: [string, boolean, Promise<void>][] = [];
  if (all) {
    const componentNames = variantConf.components.map(
      (component) => component.name,
    );
    if (dryRun) {
      const plan = await buildComponentInstallPlan(
        variantConf,
        componentNames,
        undefined,
        true,
      );
      logComponentInstallDryRun('all components', [], plan);
      return;
    }

    components.push(
      ...componentNames.map((component): [string, boolean, Promise<void>] => [
        component,
        false,
        catchLater(
          installComponentFromCache(
            systemConf,
            variantConf,
            component,
            // Force install all components.
            true,
          ),
        ),
      ]),
    );
  }
  // If there is only one component to install, add one single promise for the single component.
  else {
    const componentsWithDependencies = buildComponentDependencyList(
      variantConf.components,
      name,
    );
    if (componentsWithDependencies.length === 0) {
      throw new CliError(
        `Cannot find the definition for component "${name}".\n\nRun "emulsify component list" to see the full list.`,
      );
    }

    if (dryRun) {
      const dependencies = componentsWithDependencies.filter(
        (componentName) => componentName !== name,
      );
      const plan = await buildComponentInstallPlan(
        variantConf,
        componentsWithDependencies,
        name,
        Boolean(force),
      );
      logComponentInstallDryRun(name, dependencies, plan);
      return;
    }

    const projectConfigPath = findFileInCurrentPath(
      EMULSIFY_PROJECT_CONFIG_FILE,
    );

    for (const componentName of componentsWithDependencies) {
      const isDependency = componentName !== name;
      let currentForce = force;
      const destination = projectConfigPath
        ? getComponentDestination(variantConf, componentName, projectConfigPath)
        : undefined;

      if (destination && (await pathExists(destination)) && !force) {
        const dependencyNote = isDependency ? ` (required by "${name}")` : '';
        const result = await confirm({
          message: `The component "${componentName}"${dependencyNote} already exists. Would you like to replace it?`,
          default: false,
        });

        if (result) {
          currentForce = true;
        } else {
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
  }

  const installedDeps: string[] = [];
  const failedDeps: string[] = [];
  const failureMessages: string[] = [];

  for (const [cname, isDependency, promise] of components) {
    try {
      await promise;
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
    log('info', `The following dependencies were also installed:\n${depList}`);
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
}

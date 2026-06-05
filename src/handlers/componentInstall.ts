import { pathExists } from 'fs-extra';
import { confirm } from '@inquirer/prompts';
import log from '../lib/log.js';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../lib/constants.js';
import CliError from '../lib/CliError.js';
import type { InstallComponentHandlerOptions } from '@emulsify-cli/handlers';
import installComponentFromCache, {
  getComponentDestination,
} from '../util/project/installComponentFromCache.js';
import buildComponentDependencyList from '../util/project/buildComponentDependencyList.js';
import catchLater from '../util/catchLater.js';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath.js';
import { withEmulsifySystem } from './hofs/withEmulsifySystem.js';

/**
 * Handler for the `component install` command.
 *
 * @throws {CliError} if the current project does not have a usable system and variant configuration.
 * @throws {CliError} if the requested component cannot be found.
 */
export default async function componentInstall(
  name: string,
  { force, all }: InstallComponentHandlerOptions,
): Promise<void> {
  // Load the configured system and variant before resolving component installs.
  const { systemConf, variantConf } =
    await withEmulsifySystem('install components');

  if (!name && !all) {
    return log(
      'error',
      'Please specify a component to install, or pass --all to install all available components.',
    );
  }

  // If all components are to be installed, spawn promises for installing all available components.
  const components: [string, boolean, Promise<void>][] = [];
  if (all) {
    components.push(
      ...variantConf.components.map(
        (component): [string, boolean, Promise<void>] => [
          component.name,
          false,
          catchLater(
            installComponentFromCache(
              systemConf,
              variantConf,
              component.name,
              // Force install all components.
              true,
            ),
          ),
        ],
      ),
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
      if (e instanceof Error && components.find(([c]) => c === cname)?.[1]) {
        failedDeps.push(cname);
      } else {
        log('warn', `Unable to install ${cname}: ${msg}`);
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
}

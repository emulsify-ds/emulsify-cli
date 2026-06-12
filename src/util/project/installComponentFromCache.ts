import { pathExists } from 'fs-extra';
import type { EmulsifySystem, EmulsifyVariant } from '@emulsify-cli/config';
import { dirname } from 'path';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import safeResolveWithin from '../fs/safeResolveWithin.js';
import copyItemFromCache from '../cache/copyItemFromCache.js';

/**
 * Utility function to calculate the destination path of a component.
 *
 * @param variant EmulsifyVariant object containing information about the component.
 * @param componentName string name of the component.
 * @param projectConfigPath absolute path to the project configuration file.
 *
 * @returns absolute path to the component's destination directory.
 */
export function getComponentDestination(
  variant: EmulsifyVariant,
  componentName: string,
  projectConfigPath: string,
): string {
  const component = variant.components.find(
    ({ name }) => name === componentName,
  );
  if (!component) {
    throw new Error(
      `The specified component (${componentName}) does not exist within the given system variant.`,
    );
  }

  const structure = variant.structureImplementations.find(
    ({ name }) => name === component.structure,
  );
  if (!structure) {
    throw new Error(
      `The structure (${component.structure}) specified within the component ${componentName} is invalid.`,
    );
  }

  return safeResolveWithin(
    dirname(projectConfigPath),
    [structure.directory, component.name],
    'Component destination',
  );
}

/**
 * Installs a specified component within the Emulsify project the user is currently within.
 *
 * @param system EmulsifySystem object depicting the system from which the component should be installed.
 * @param variant EmulsifyVariant object containing information about the component, where it lives, and how it should be installed.
 * @param componentName string name of the component that should be installed.
 * @param force if true, replaces an existing component (if any).
 * @returns
 */
export default async function installComponentFromCache(
  system: EmulsifySystem,
  variant: EmulsifyVariant,
  componentName: string,
  force = false,
): Promise<void> {
  // Gather information about the current Emulsify project. If none exists,
  // throw an error.
  const path = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);
  if (!path) {
    throw new Error(
      'Unable to find an Emulsify project to install the component into.',
    );
  }

  const destination = getComponentDestination(variant, componentName, path);

  // Since getComponentDestination didn't throw, we know these exist.
  const component = variant.components.find(
    ({ name }) => name === componentName,
  )!;
  const structure = variant.structureImplementations.find(
    ({ name }) => name === component.structure,
  )!;

  // If the component already exists within the project, and force is not true,
  // throw an error.
  if ((await pathExists(destination)) && !force) {
    throw new Error(
      `The component "${componentName}" already exists, and force was not passed (--force).`,
    );
  }

  return copyItemFromCache(
    'systems',
    [system.name, structure.directory, component.name],
    destination,
    force,
  );
}

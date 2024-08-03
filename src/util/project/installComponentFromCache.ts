import { pathExists } from 'fs-extra';
import type { EmulsifySystem, EmulsifyVariant } from '@emulsify-cli/config';
import { join, dirname } from 'path';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import copyItemFromCache from '../cache/copyItemFromCache.js';

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

  // Find the specified component within the given variant configuration. If the
  // component is not found, throw an error.
  const component = variant.components.find(
    ({ name }) => name === componentName,
  );
  if (!component) {
    throw new Error(
      `The specified component (${componentName}) does not exist within the given system variant.`,
    );
  }

  // Find the component's parent structure within the given variant configuration. If the
  // component's parent structure does not exist, throw an error.
  const structure = variant.structureImplementations.find(
    ({ name }) => name === component.structure,
  );
  if (!structure) {
    throw new Error(
      `The structure (${component.structure}) specified within the component ${componentName} is invalid.`,
    );
  }

  // Calculate the destination path based on the path to the Emulsify project, the structure of the
  // component, and the component's name.
  const destination = join(dirname(path), structure.directory, component.name);

  // If the component already exists within the project, and force is not true,
  // throw an error.
  if ((await pathExists(destination)) && !force) {
    throw new Error(
      `The component "${component.name}" already exists, and force was not passed (--force).`,
    );
  }

  return copyItemFromCache(
    'systems',
    [system.name, structure.directory, component.name],
    destination,
    force,
  );
}

import type { EmulsifySystem, EmulsifyVariant } from '@emulsify-cli/config';
import { join, dirname } from 'path';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants';
import findFileInCurrentPath from '../fs/findFileInCurrentPath';
import getEmulsifyConfig from '../project/getEmulsifyConfig';
import copyItemFromCache from '../cache/copyItemFromCache';

export default async function installComponentFromCache(
  system: EmulsifySystem,
  variant: EmulsifyVariant,
  componentName: string
): Promise<void> {
  // Gather information about the current Emulsify project. If none exists,
  // throw an error.
  const path = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);
  const projectConfig = await getEmulsifyConfig();
  if (!path || !projectConfig) {
    throw new Error(
      'Unable to find an Emulsify project to install the component into'
    );
  }

  // Find the specified component within the given variant configuration. If the
  // component is not found, throw an error.
  const component = variant.components.find(
    ({ name }) => name === componentName
  );
  if (!component) {
    throw new Error(
      `The specified component (${componentName}) does not exist within the given system variant.`
    );
  }

  // Find the component's parent structure within the given variant configuration. If the
  // component's parent structure does not exist, throw an error.
  const structure = variant.structureImplementations.find(
    ({ name }) => name === component.structure
  );
  if (!structure) {
    throw new Error(
      `The structure (${component.structure}) specified within the component ${componentName} is invalid.`
    );
  }

  // Calculate the destination path based on the path to the Emulsify project, the structure of the
  // component, and the component's name.
  const destination = join(dirname(path), structure.directory, component.name);
  return copyItemFromCache(
    'systems',
    [system.name, structure.directory],
    component.name,
    destination
  );
}

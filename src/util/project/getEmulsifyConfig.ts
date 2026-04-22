import type { EmulsifyProjectConfiguration } from '@emulsify-cli/config';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import loadJsonFile from '../fs/loadJsonFile.js';

/**
 * Finds the Emulsify project configuration, loads, and returns it.
 *
 * @returns Configuration for the current Emulsify project (within the current pwd), or undefined if none exists.
 */
export default async function getEmulsifyConfig(): Promise<EmulsifyProjectConfiguration | void> {
  const path = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);

  if (!path) {
    return undefined;
  }

  return loadJsonFile<EmulsifyProjectConfiguration>(path);
}

import type { EmulsifyProjectConfiguration } from '@emulsify-cli/config';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import writeToJsonFile from '../fs/writeToJsonFile.js';
import getEmulsifyConfig from './getEmulsifyConfig.js';

/**
 * Check whether a value is a non-array object that can be recursively merged.
 *
 * @param value value to inspect.
 *
 * @returns true if value is an object and is not an array.
 */
function isMergeableObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively merge two objects, with values from the right object taking precedence.
 *
 * @param left base object to merge into.
 * @param right object whose values should overwrite matching left-hand values.
 *
 * @returns a new object containing the recursively merged values.
 */
function mergeDeepRight<T extends object, U extends object>(
  left: T,
  right: U,
): T & U {
  const result: Record<string, unknown> = {
    ...(left as Record<string, unknown>),
  };

  for (const [key, rightValue] of Object.entries(right)) {
    const leftValue = result[key];
    result[key] =
      isMergeableObject(leftValue) && isMergeableObject(rightValue)
        ? mergeDeepRight(leftValue, rightValue)
        : rightValue;
  }

  return result as T & U;
}

/**
 * Updates the current (within the user's cwd) Emulsify project's configuration with the given values.
 *
 * @param config Partial EmulsifyProjectConfiguration object that will be merged to overwrite existing config.
 *
 * @returns Void if the write was successful, otherwise throws an error.
 */
export default async function setEmulsifyConfig(
  config: Partial<EmulsifyProjectConfiguration>,
): Promise<void> {
  const path = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);
  const existingConfig = await getEmulsifyConfig();
  if (!path || !existingConfig) {
    throw new Error(
      `Unable to set values for ${EMULSIFY_PROJECT_CONFIG_FILE} because you are not in an Emulsify project`,
    );
  }

  await writeToJsonFile(path, mergeDeepRight(existingConfig, config));
}

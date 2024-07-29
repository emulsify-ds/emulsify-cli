import type { EmulsifyProjectConfiguration } from '@emulsify-cli/config';
import R from 'ramda';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants';
import findFileInCurrentPath from '../fs/findFileInCurrentPath';
import writeToJsonFile from '../fs/writeToJsonFile';
import getEmulsifyConfig from './getEmulsifyConfig';

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

  await writeToJsonFile(path, R.mergeDeepRight(existingConfig, config));
}

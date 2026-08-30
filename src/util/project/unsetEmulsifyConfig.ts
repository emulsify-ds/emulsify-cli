import type { EmulsifyProjectConfiguration } from '@emulsify-cli/config';

import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import writeToJsonFile from '../fs/writeToJsonFile.js';
import getEmulsifyConfig from './getEmulsifyConfig.js';

type OptionalProjectConfigKey = Exclude<
  keyof EmulsifyProjectConfiguration,
  'project' | 'starter'
>;

/**
 * Remove optional top-level values from the current Emulsify project config.
 *
 * Unlike setEmulsifyConfig, this writes the complete remaining object because
 * a recursive merge cannot remove existing keys.
 */
export default async function unsetEmulsifyConfig(
  ...keys: OptionalProjectConfigKey[]
): Promise<void> {
  const path = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);
  const existingConfig = await getEmulsifyConfig();
  if (!path || !existingConfig) {
    throw new Error(
      `Unable to remove values from ${EMULSIFY_PROJECT_CONFIG_FILE} because you are not in an Emulsify project`,
    );
  }

  const updatedConfig = { ...existingConfig };
  for (const key of keys) {
    delete updatedConfig[key];
  }

  await writeToJsonFile(path, updatedConfig);
}

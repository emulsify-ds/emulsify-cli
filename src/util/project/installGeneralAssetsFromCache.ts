import type { EmulsifySystem, EmulsifyVariant } from '@emulsify-cli/config';
import { join, dirname } from 'path';
import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import copyItemFromCache from '../cache/copyItemFromCache.js';
import catchLater from '../catchLater.js';

/**
 * Reads system/variant configuration, and installs the general directories and files
 * defined by the given variant.
 *
 * @param system EmulsifySystem object containing information about the system from which general assets will be pulled.
 * @param variant EmulsifyVariant object containing definitions for each general asset.
 */
export default async function installGeneralAssetsFromCache(
  system: EmulsifySystem,
  variant: EmulsifyVariant,
): Promise<void> {
  // Gather information about the current Emulsify project. If none exists,
  // throw an error.
  const path = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);
  if (!path) {
    throw new Error(
      'Unable to find an Emulsify project to install assets into.',
    );
  }

  const assets = [...(variant.directories || []), ...(variant.files || [])];
  const promises = [];
  for (const asset of assets) {
    const destination = join(dirname(path), asset.destinationPath);
    promises.push(
      catchLater(
        copyItemFromCache(
          'systems',
          [system.name, asset.path],
          destination,
          true,
        ),
      ),
    );
  }

  await Promise.all(promises);
}

import type { CachedItemPathOptions } from '@emulsify-cli/cache';

import getCachedItemPath from './getCachedItemPath.js';
import loadJsonFile from '../fs/loadJsonFile.js';

export default async function getJsonFromCachedFile<Output>(
  options: CachedItemPathOptions & { fileName: string },
): Promise<Output | void> {
  const { fileName, ...cachedItemOptions } = options;
  return loadJsonFile<Output>(
    getCachedItemPath({
      ...cachedItemOptions,
      itemPath: [...cachedItemOptions.itemPath, fileName],
    }),
  );
}

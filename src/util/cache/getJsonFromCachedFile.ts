import type { CacheBucket, CacheItemPath } from '@emulsify-cli/cache';

import getCachedItemPath from './getCachedItemPath';
import loadJsonFile from '../fs/loadJsonFile';

export default async function getJsonFromCachedFile<Output>(
  bucket: CacheBucket,
  itemPath: CacheItemPath,
  fileName: string
): Promise<Output | void> {
  return loadJsonFile<Output>(getCachedItemPath(bucket, itemPath, fileName));
}

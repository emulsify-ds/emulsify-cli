import type {
  CacheBucket,
  CacheItemPath,
  CacheCheckout,
} from '@emulsify-cli/cache';

import getCachedItemPath from './getCachedItemPath';
import loadJsonFile from '../fs/loadJsonFile';

export default async function getJsonFromCachedFile<Output>(
  bucket: CacheBucket,
  itemPath: CacheItemPath,
  checkout: CacheCheckout,
  fileName: string,
): Promise<Output | void> {
  return loadJsonFile<Output>(
    getCachedItemPath(bucket, [...itemPath, fileName], checkout),
  );
}

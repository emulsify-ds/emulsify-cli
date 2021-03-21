import type { CacheBucket, CacheItemPath } from '@emulsify-cli/cache';

import { join } from 'path';
import { CACHE_DIR } from '../../lib/constants';

/**
 * Accepts a cache bucket, item path, and item name, and returns the full
 * path to the specified item.
 *
 * @param bucket name of the bucket containing the cached item.
 * @param itemPath array containing segments of the path to the cached item within the specified bucket.
 * @param item name of the cached item.
 * @returns string containing the full path to the specified cached item.
 */
export default function getCachedItemPath(
  bucket: CacheBucket,
  itemPath: CacheItemPath,
  item: string
): string {
  return join(CACHE_DIR, bucket, ...itemPath, item);
}

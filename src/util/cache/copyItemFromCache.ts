import type { CacheBucket, CacheItemPath } from '@emulsify-cli/cache';
import { copy } from 'fs-extra';
import getCachedItemPath from './getCachedItemPath';

/**
 * Accepts a cache bucket, item path, and item name, and copies the cached item to the
 * specified destination.
 *
 * @param bucket name of the bucket containing the cached item.
 * @param itemPath array containing segments of the path to the cached item within the specified bucket.
 * @param item name of the cached item.
 * @param destination full path to the destination to which the cached item should be copied.
 */
export default async function copyFileFromCache(
  bucket: CacheBucket,
  itemPath: CacheItemPath,
  item: string,
  destination: string
): Promise<void> {
  const source = getCachedItemPath(bucket, itemPath, item);
  return copy(source, destination);
}

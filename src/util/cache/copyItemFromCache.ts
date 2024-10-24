import type { CacheBucket, CacheItemPath } from '@emulsify-cli/cache';
import { copy, remove } from 'fs-extra';
import getCachedItemPath from './getCachedItemPath';
import getEmulsifyConfig from '../project/getEmulsifyConfig';

/**
 * Accepts a cache bucket, item path, and item name, and copies the cached item to the
 * specified destination.
 *
 * @param bucket name of the bucket containing the cached item.
 * @param itemPath array containing segments of the path to the cached item within the specified bucket.
 * @param item name of the cached item.
 * @param destination full path to the destination to which the cached item should be copied.
 * @param force if true, removes any file/folder at the destination before copying.
 */
export default async function copyFileFromCache(
  bucket: CacheBucket,
  itemPath: CacheItemPath,
  destination: string,
  force = false,
): Promise<void> {
  // Get the existing checkout setting if we have it and use it.
  const emulsifyConfig = await getEmulsifyConfig();
  let checkout = '';
  if (
    emulsifyConfig != undefined &&
    emulsifyConfig.system &&
    emulsifyConfig.system.checkout
  ) {
    checkout = emulsifyConfig.system.checkout;
  }
  const source = getCachedItemPath(bucket, itemPath, checkout);

  if (force) {
    await remove(destination);
  }

  return copy(source, destination);
}

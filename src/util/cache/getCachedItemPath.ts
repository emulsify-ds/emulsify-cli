import type {
  CacheBucket,
  CacheItemPath,
  CacheCheckout,
} from '@emulsify-cli/cache';

import { join } from 'path';
import { createHash } from 'crypto';
import {
  CACHE_DIR,
  EMULSIFY_PROJECT_CONFIG_FILE,
} from '../../lib/constants.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';

/**
 * Accepts a cache bucket, item path, and item name, and returns the full
 * path to the specified item.
 *
 * @param bucket name of the bucket containing the cached item.
 * @param itemPath array containing segments of the path to the cached item within the specified bucket.
 * @param checkout commit, branch, or tag of the system this project is utilizing.
 * @returns string containing the full path to the specified cached item.
 */
export default function getCachedItemPath(
  bucket: CacheBucket,
  itemPath: CacheItemPath,
  checkout: CacheCheckout,
): string {
  const projectPath = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);

  if (!projectPath) {
    throw new Error(`Unable to find ${EMULSIFY_PROJECT_CONFIG_FILE}`);
  }

  return join(
    CACHE_DIR,
    bucket,
    createHash('md5')
      .update(`MBR${String(projectPath)}${String(checkout)}`)
      .digest('hex'),
    ...itemPath,
  );
}

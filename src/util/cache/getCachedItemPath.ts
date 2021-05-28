import type { CacheBucket, CacheItemPath } from '@emulsify-cli/cache';

import { join } from 'path';
import { createHash } from 'crypto';
import { CACHE_DIR, EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants';
import findFileInCurrentPath from '../fs/findFileInCurrentPath';

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
  itemPath: CacheItemPath
): string {
  const projectPath = findFileInCurrentPath(EMULSIFY_PROJECT_CONFIG_FILE);

  if (!projectPath) {
    throw new Error(`Unable to find ${EMULSIFY_PROJECT_CONFIG_FILE}`);
  }

  return join(
    CACHE_DIR,
    bucket,
    createHash('md5').update(projectPath).digest('hex'),
    ...itemPath
  );
}

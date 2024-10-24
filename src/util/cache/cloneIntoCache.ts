import type { CacheBucket, CacheItemPath } from '@emulsify-cli/cache';
import type { GitCloneOptions } from '@emulsify-cli/git';

import simpleGit from 'simple-git';
import { existsSync, promises as fs } from 'fs';
import { dirname } from 'path';
import storeCacheBucketID from './storeCacheBucketID.js';

import getCachedItemPath from './getCachedItemPath.js';

/**
 * Clones a repository into the cache (util) directory, if it does not already exist.
 *
 * @param bucket CacheBucket value that specifies what type of cache this repository is.
 * @param itemPath array of strings describing the path to the item cache within the specified bucket.
 *
 * @returns void, or throws an error if the repository could not be cloned.
 */
export default function cloneIntoCache(
  bucket: CacheBucket,
  itemPath: CacheItemPath,
) {
  return async ({ repository, checkout }: GitCloneOptions): Promise<void> => {
    const destination = getCachedItemPath(bucket, itemPath, checkout);
    const parentDir = dirname(destination);

    // If the item is already in cache, simply return.
    if (existsSync(destination)) {
      return;
    }

    // If the bucket/parent directory does not exist, create it.
    if (!existsSync(parentDir)) {
      await fs.mkdir(parentDir, { recursive: true });
    }

    const git = simpleGit();
    await git.clone(
      repository,
      destination,
      checkout
        ? {
            '--branch': checkout,
          }
        : {},
    );
  };
}

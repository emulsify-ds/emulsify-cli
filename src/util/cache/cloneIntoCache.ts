import type { CacheBucket, CacheItemPath } from '@emulsify-cli/cache';
import type { GitCloneOptions } from '@emulsify-cli/git';

import simpleGit from 'simple-git';
import { existsSync, promises as fs } from 'fs';
import { dirname } from 'path';

import getCachedItemPath from './getCachedItemPath';

/**
 * Clones a repository into the cache (util) directory, if it does not already exist.
 *
 * @param type CacheBucket value that specifies what type of cache this repository is.
 * @param itemPath array of strings describing the path to the item cache within the specified bucket.
 *
 * @returns void, or throws an error if the repository could not be cloned.
 */
export default function cloneIntoCache(
  bucket: CacheBucket,
  itemPath: CacheItemPath
) {
  return async ({ repository, checkout }: GitCloneOptions): Promise<void> => {
    const destination = getCachedItemPath(bucket, itemPath);
    const parentDir = dirname(destination);
    let git = simpleGit();

    // If the item is already in cache, make sure it has the correct branch/tag/commit
    // checked out and exit.
    if (existsSync(destination)) {
      if (checkout) {
        git = simpleGit(destination);
        await git.fetch();
        await git.checkout(checkout);
      }
      return;
    }

    // If the bucket/parent directory does not exist, create it.
    if (!existsSync(parentDir)) {
      await fs.mkdir(parentDir, { recursive: true });
    }

    await git.clone(
      repository,
      destination,
      checkout
        ? {
            '--branch': checkout,
          }
        : {}
    );
  };
}
